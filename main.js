(() => {
  const root = document.documentElement;

  /* ---------- theme toggle ---------- */
  const toggle = document.querySelector("[data-theme-toggle]");
  const darkMQ = matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.dataset.theme || (darkMQ.matches ? "dark" : "light");
  // Status bar / browser chrome colour follows a manual theme choice, not only the OS setting.
  const syncThemeColor = () => {
    const color = { light: "#f1f2f0", dark: "#101112" };
    document.querySelectorAll("meta[data-theme-color]").forEach((m) => {
      m.content = root.dataset.theme ? color[root.dataset.theme] : color[m.dataset.themeColor];
    });
  };
  const labelToggle = () => {
    toggle?.setAttribute("aria-label", currentTheme() === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
    syncThemeColor();
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  toggle?.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem("kvadrum-theme", next); } catch (e) {}
      labelToggle();
    };
    // Cross-fade the whole page instead of an abrupt light/dark flash where supported.
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(apply);
    else apply();
  });
  darkMQ.addEventListener("change", labelToggle);
  labelToggle();

  /* ---------- mobile menu ---------- */
  const burger = document.querySelector(".nav__burger");
  const menu = document.getElementById("mobile-menu");
  const scrim = document.querySelector("[data-menu-scrim]");
  const navEl = document.querySelector(".nav");
  const isOpen = () => burger.getAttribute("aria-expanded") === "true";
  // State lives in attributes and CSS transitions, so tapping again mid-animation simply reverses it.
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    menu.toggleAttribute("data-open", open);
    menu.inert = !open;
    scrim?.classList.toggle("is-open", open);
    navEl.classList.toggle("menu-is-open", open);
    root.classList.toggle("menu-open", open);
  };
  burger?.addEventListener("click", () => setMenu(!isOpen()));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  scrim?.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) { setMenu(false); burger.focus(); } });
  matchMedia("(min-width: 1180px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- nav border once page leaves the top ---------- */
  const nav = document.querySelector(".nav");
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;height:8px;width:1px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);

  /* ---------- active nav link (desktop bar and mobile menu): "where am I" ---------- */
  const links = [...document.querySelectorAll(".nav__links a, .mobile-menu a:not(.btn)")];
  const sections = [...new Set(links.map((a) => a.getAttribute("href")))].map((h) => document.querySelector(h)).filter(Boolean);
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => {
        if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => navIO.observe(s));

  /* ---------- scroll reveals: once per element, staggered within a group ---------- */
  const revealables = [...document.querySelectorAll("main > :not(.hero) [data-reveal]")];
  const groups = new Map();
  revealables.forEach((el) => {
    const group = groups.get(el.parentElement) || [];
    el.style.setProperty("--i", String(Math.min(group.length, 5)));
    group.push(el);
    groups.set(el.parentElement, group);
  });
  if ("IntersectionObserver" in window) {
    const show = (el) => { el.classList.add("is-in"); revealIO.unobserve(el); };
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target); });
      // Settle anything the reader jumped past (anchor links), so nothing stays hidden above.
      revealables.forEach((el) => { if (!el.classList.contains("is-in") && el.getBoundingClientRect().bottom < 0) show(el); });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    revealables.forEach((el) => revealIO.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  document.querySelectorAll(".mobile-menu nav > *").forEach((el, i) => el.style.setProperty("--i", String(i)));

  /* ---------- process: sticky image follows the active step ---------- */
  const steps = [...document.querySelectorAll(".step[data-stage]")];
  const imgs = [...document.querySelectorAll("[data-stage-img]")];
  const meter = document.querySelector("[data-stage-meter]");
  const setStage = (i) => {
    imgs.forEach((img) => img.classList.toggle("is-active", img.dataset.stageImg === String(i)));
    steps.forEach((s) => s.classList.toggle("is-current", s.dataset.stage === String(i)));
    if (meter) meter.style.transform = `scaleX(${(i + 1)})`;
  };
  const stageIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setStage(Number(e.target.dataset.stage)); });
  }, { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((s) => stageIO.observe(s));
  setStage(0);

  /* ---------- contact form ---------- */
  // TODO(backend): адрес приёма заявок (CRM, почта через форм-сервис). Пусто = демо-режим.
  const FORM_ENDPOINT = "";
  const form = document.querySelector(".form");
  if (form) {
    const status = form.querySelector(".form__status");
    const submit = form.querySelector(".form__submit");
    const label = form.querySelector(".form__label");
    const rules = {
      name: (v) => v.trim().length >= 2,
      phone: (v) => v.replace(/\D/g, "").length >= 10,
      email: (v) => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    };
    const check = (input) => {
      const rule = rules[input.name];
      if (!rule) return true;
      const ok = rule(input.value);
      const field = input.closest(".field");
      field.classList.toggle("has-error", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      field.querySelector(".field__error").hidden = ok;
      return ok;
    };
    form.addEventListener("focusout", (e) => { if (e.target.matches("input") && e.target.value) check(e.target); });
    form.addEventListener("input", (e) => { if (e.target.closest(".has-error")) check(e.target); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = [...form.querySelectorAll("input")];
      const results = inputs.map(check);
      if (results.includes(false)) {
        inputs[results.indexOf(false)].focus();
        status.className = "form__status is-error";
        status.textContent = "Проверьте отмеченные поля.";
        return;
      }
      submit.setAttribute("aria-busy", "true");
      label.textContent = "Отправляем";
      status.className = "form__status";
      status.textContent = "";
      try {
        if (!FORM_ENDPOINT) {
          // Demo mode: nothing is sent, and the page says so instead of faking success.
          await new Promise((r) => setTimeout(r, 500));
          status.className = "form__status is-error";
          status.textContent = "Это демо-версия сайта: форма пока не подключена, заявка не отправлена.";
          return;
        }
        const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form) });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        status.className = "form__status is-success";
        status.textContent = "Заявка отправлена. Мы свяжемся с вами в течение рабочего дня.";
      } catch (err) {
        status.className = "form__status is-error";
        status.textContent = "Не получилось отправить. Попробуйте ещё раз.";
      } finally {
        submit.removeAttribute("aria-busy");
        label.textContent = "Отправить заявку";
      }
    });
  }
})();

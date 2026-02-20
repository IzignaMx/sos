document.addEventListener("DOMContentLoaded", function () {
  const languageMap = {
    es: { label: "Español", flagClass: "lang-flag--es" },
    en: { label: "English", flagClass: "lang-flag--en" },
    pt: { label: "Português", flagClass: "lang-flag--pt" },
    fr: { label: "Français", flagClass: "lang-flag--fr" },
    de: { label: "Deutsch", flagClass: "lang-flag--de" },
    it: { label: "Italiano", flagClass: "lang-flag--it" },
    ja: { label: "日本語", flagClass: "lang-flag--ja" },
    zh: { label: "中文", flagClass: "lang-flag--zh" },
    ar: { label: "العربية", flagClass: "lang-flag--ar" },
    ru: { label: "Русский", flagClass: "lang-flag--ru" },
    tr: { label: "Türkçe", flagClass: "lang-flag--tr" },
    hi: { label: "हिन्दी", flagClass: "lang-flag--hi" },
    ko: { label: "한국어", flagClass: "lang-flag--ko" },
    la: { label: "Latina", flagClass: "lang-flag--la" },
    eo: { label: "Esperanto", flagClass: "lang-flag--eo" },
    nl: { label: "Nederlands", flagClass: "lang-flag--nl" },
    sv: { label: "Svenska", flagClass: "lang-flag--sv" },
    pl: { label: "Polski", flagClass: "lang-flag--pl" },
    uk: { label: "Українська", flagClass: "lang-flag--uk" },
    vi: { label: "Tiếng Việt", flagClass: "lang-flag--vi" },
  };
  const supportedLangs = Object.keys(languageMap);
  const storageKey = "sos-lang";
  const langSelect = document.querySelector("[data-language]");
  const langMenu = document.querySelector("[data-lang-menu]");
  const langToggle = document.querySelector("[data-lang-toggle]");
  const langList = document.querySelector("[data-lang-list]");
  const langFlagEl = document.querySelector("[data-lang-flag]");
  const langLabelEl = document.querySelector("[data-lang-label]");
  const optionButtons = Array.from(
    document.querySelectorAll("[data-lang-option]"),
  );
  const translationCache = {};
  const inlineCache = {};
  let currentLanguage = "es";
  let menuOpen = false;

  const updateToastEl = document.querySelector("[data-update-toast]");

  const updateAcceptBtn = updateToastEl
    ? updateToastEl.querySelector("[data-update-refresh]")
    : null;

  const updateDismissBtn = updateToastEl
    ? updateToastEl.querySelector("[data-update-dismiss]")
    : null;

  let pendingWorker = null;

  let hasReloaded = false;

  const buildCatalogUrl = (lang) =>
    new URL("./i18n/" + lang + ".json", window.location.href).href;

  const showUpdateToast = (worker) => {
    if (!updateToastEl) return;

    pendingWorker = worker;

    updateToastEl.hidden = false;

    if (updateAcceptBtn) {
      updateAcceptBtn.disabled = false;

      updateAcceptBtn.textContent = "Actualizar";
    }

    requestAnimationFrame(() => updateToastEl.classList.add("is-visible"));
  };

  const hideUpdateToast = () => {
    if (!updateToastEl) return;

    updateToastEl.classList.remove("is-visible");

    if (updateAcceptBtn) {
      updateAcceptBtn.disabled = false;

      updateAcceptBtn.textContent = "Actualizar";
    }

    setTimeout(() => {
      updateToastEl.hidden = true;
    }, 220);
  };

  if (updateAcceptBtn) {
    updateAcceptBtn.addEventListener("click", () => {
      if (!pendingWorker) return;

      updateAcceptBtn.disabled = true;

      updateAcceptBtn.textContent = "Actualizando...";

      pendingWorker.postMessage({ type: "SKIP_WAITING" });
    });
  }

  if (updateDismissBtn) {
    updateDismissBtn.addEventListener("click", () => {
      hideUpdateToast();

      pendingWorker = null;
    });
  }

  const getValue = (source, path) => {
    return path.split(".").reduce((acc, part) => {
      if (acc && typeof acc === "object" && part in acc) {
        return acc[part];
      }
      return undefined;
    }, source);
  };

  const applyTranslations = (catalog) => {
    if (!catalog) return;
    if (catalog.meta?.lang) {
      document.documentElement.setAttribute("lang", catalog.meta.lang);
    }
    if (catalog.meta?.dir) {
      document.documentElement.setAttribute("dir", catalog.meta.dir);
    } else {
      document.documentElement.setAttribute("dir", "ltr");
    }
    if (catalog.meta?.title) {
      document.title = catalog.meta.title;
    }
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && catalog.meta?.description) {
      descMeta.setAttribute("content", catalog.meta.description);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && (catalog.meta?.ogTitle || catalog.meta?.title)) {
      ogTitle.setAttribute(
        "content",
        catalog.meta.ogTitle || catalog.meta.title,
      );
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && catalog.meta?.ogDescription) {
      ogDesc.setAttribute("content", catalog.meta.ogDescription);
    }

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const mode = el.dataset.i18nType || "text";
      const value = getValue(catalog, key);
      if (value === undefined) return;
      if (mode === "html") {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-attrs]").forEach((el) => {
      const mapping = el.dataset.i18nAttrs
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);
      mapping.forEach((entry) => {
        const [attr, key] = entry.split(":").map((part) => part.trim());
        if (!attr || !key) return;
        const value = getValue(catalog, key);
        if (value === undefined) return;
        if (attr === "innerHTML") {
          el.innerHTML = value;
        } else if (attr === "textContent") {
          el.textContent = value;
        } else {
          el.setAttribute(attr, value);
        }
      });
    });
  };

  const readInlineCatalog = (lang, url) => {
    if (inlineCache[lang]) {
      return inlineCache[lang];
    }
    const inlineScript = document.querySelector(
      '[data-i18n-catalog="' + lang + '"]',
    );
    if (inlineScript) {
      try {
        inlineCache[lang] = JSON.parse(inlineScript.textContent);
        return inlineCache[lang];
      } catch (parseError) {
        console.warn("Error al parsear catálogo inline", parseError);
      }
    }
    if (url) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.overrideMimeType("application/json");
        xhr.send(null);
        if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 400)) {
          inlineCache[lang] = JSON.parse(xhr.responseText);
          return inlineCache[lang];
        }
      } catch (xhrError) {
        console.warn("No se pudo cargar catálogo vía XHR", xhrError);
      }
    }
    return null;
  };

  const loadLanguage = (lang) => {
    if (!supportedLangs.includes(lang)) {
      lang = "es";
    }
    if (translationCache[lang]) {
      applyTranslations(translationCache[lang]);
      return Promise.resolve(translationCache[lang]);
    }
    const catalogUrl = buildCatalogUrl(lang);
    return fetch(catalogUrl, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar traducción " + lang);
        }
        return response.json();
      })
      .then((data) => {
        translationCache[lang] = data;
        applyTranslations(data);
        return data;
      })
      .catch((error) => {
        console.warn("Fallo al cargar idioma", lang, error);
        const fallbackData = readInlineCatalog(lang, catalogUrl);
        if (fallbackData) {
          translationCache[lang] = fallbackData;
          applyTranslations(fallbackData);
          return fallbackData;
        }
        if (lang !== "es") {
          try {
            localStorage.setItem(storageKey, "es");
          } catch (storageError) {}
          updateLanguageUI("es");
          return loadLanguage("es");
        }
      });
  };

  const updateLanguageUI = (lang) => {
    const info = languageMap[lang] || languageMap.es;
    currentLanguage = lang;
    if (langFlagEl && info.flagClass) {
      langFlagEl.className = "lang-flag " + info.flagClass;
    }
    if (langLabelEl && info.label) {
      langLabelEl.textContent = info.label;
    }
    optionButtons.forEach((btn) => {
      const isActive = btn.dataset.langOption === lang;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", isActive ? "true" : "false");
    });
    if (langSelect) {
      langSelect.value = lang;
    }
  };

  const setMenuState = (open, focusToggle = true) => {
    if (!langToggle || !langList) return;
    menuOpen = open;
    langToggle.setAttribute("aria-expanded", open ? "true" : "false");
    langList.hidden = !open;
    if (open) {
      const activeBtn =
        optionButtons.find(
          (btn) => btn.dataset.langOption === currentLanguage,
        ) || optionButtons[0];
      if (activeBtn) {
        requestAnimationFrame(() => activeBtn.focus());
      }
    } else if (focusToggle) {
      langToggle.focus();
    }
  };

  const focusOptionByOffset = (offset) => {
    if (!optionButtons.length) return;
    const currentIndex = optionButtons.findIndex(
      (btn) => btn === document.activeElement,
    );
    let nextIndex = currentIndex === -1 ? 0 : currentIndex + offset;
    if (nextIndex < 0) {
      nextIndex = optionButtons.length - 1;
    } else if (nextIndex >= optionButtons.length) {
      nextIndex = 0;
    }
    optionButtons[nextIndex].focus();
  };

  const changeLanguage = (lang, { persist = true } = {}) => {
    if (!supportedLangs.includes(lang)) {
      lang = "es";
    }
    updateLanguageUI(lang);
    if (persist) {
      try {
        localStorage.setItem(storageKey, lang);
      } catch (storageError) {}
    }
    loadLanguage(lang);
  };

  const detectLanguage = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && supportedLangs.includes(stored)) {
        return stored;
      }
    } catch (storageError) {}
    const navigatorPreferences = [];
    if (Array.isArray(navigator.languages)) {
      navigatorPreferences.push(...navigator.languages);
    }
    if (navigator.language) {
      navigatorPreferences.push(navigator.language);
    }
    for (const entry of navigatorPreferences) {
      if (!entry || typeof entry !== "string") continue;
      const normalized = entry.toLowerCase();
      if (supportedLangs.includes(normalized)) {
        return normalized;
      }
      const base = normalized.split(/[-_]/)[0];
      if (supportedLangs.includes(base)) {
        return base;
      }
    }
    return "es";
  };

  const initializeLanguage = () => {
    const initialLang = detectLanguage();
    updateLanguageUI(initialLang);
    loadLanguage(initialLang);
  };

  if (langToggle) {
    langToggle.addEventListener("click", () => {
      setMenuState(!menuOpen);
    });
    langToggle.addEventListener("keydown", (event) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setMenuState(true);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMenuState(true);
        requestAnimationFrame(() => focusOptionByOffset(-1));
      }
    });
  }

  if (langList) {
    langList.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusOptionByOffset(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusOptionByOffset(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        const first = optionButtons[0];
        if (first) first.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        const last = optionButtons[optionButtons.length - 1];
        if (last) last.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setMenuState(false);
      }
    });
  }

  optionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.langOption;
      changeLanguage(lang);
      setMenuState(false, false);
      if (langToggle) {
        langToggle.focus();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (menuOpen && langMenu && !langMenu.contains(event.target)) {
      setMenuState(false, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (menuOpen && event.key === "Escape") {
      setMenuState(false);
    }
  });

  if (langSelect) {
    langSelect.addEventListener("change", (event) => {
      changeLanguage(event.target.value);
    });
  }

  initializeLanguage();

  if ("serviceWorker" in navigator) {
    const handleWaitingWorker = (worker) => {
      if (!worker) return;

      if (!navigator.serviceWorker.controller) {
        worker.postMessage({ type: "SKIP_WAITING" });

        return;
      }

      showUpdateToast(worker);
    };

    const registerServiceWorker = () => {
      navigator.serviceWorker

        .register("sw.js", { scope: "./" })

        .then((registration) => {
          handleWaitingWorker(registration.waiting);

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  handleWaitingWorker(newWorker);
                }
              });
            }
          });
        })

        .catch((error) => {
          console.warn("Service worker registration failed", error);
        });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloaded) return;

      if (!pendingWorker) {
        hideUpdateToast();

        return;
      }

      hasReloaded = true;

      pendingWorker = null;

      hideUpdateToast();

      window.location.reload();
    });
  }

  const maybeHandleIntent = () => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent");
    if (!intent) return;
    if (intent === "reserve") {
      const reserveHref =
        "https://wa.me/525533760889?text=Hola%20Edgar%2C%20quiero%20arrancar%20una%20mision%20SOS%2E";
      window.location.hash = "#servicios";
      setTimeout(() => {
        window.open(reserveHref, "_blank", "noopener,noreferrer");
      }, 300);
    }
  };
  maybeHandleIntent();

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let fluidController = null;
  if (
    !motionQuery.matches &&
    typeof window.initFluidBackground === "function"
  ) {
    fluidController = window.initFluidBackground();
  }
  const handleMotionPreference = (event) => {
    if (event.matches) {
      if (fluidController && typeof fluidController.dispose === "function") {
        fluidController.dispose();
      }
      fluidController = null;
    } else if (
      !fluidController &&
      typeof window.initFluidBackground === "function"
    ) {
      fluidController = window.initFluidBackground();
    }
  };
  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", handleMotionPreference);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(handleMotionPreference);
  }

  const progressBar = document.querySelector("[data-progress]");
  const counters = document.querySelectorAll("[data-counter]");
  const prefersReduced = motionQuery.matches;

  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollTop / docHeight : 0;
    if (progressBar) {
      progressBar.style.transform = "scaleX(" + progress.toFixed(3) + ")";
    }
  };
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });

  if (!prefersReduced) {
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const animateCounter = (el) => {
      const target = parseInt(el.dataset.target, 10);
      if (Number.isNaN(target)) return;
      const suffix = el.dataset.suffix || "";
      const duration = 1400;
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        let value = Math.round(easeOutQuart(progress) * target);
        if (value > target) value = target;
        el.textContent = value + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    };
    counters.forEach((counter) => {
      const suffix = counter.dataset.suffix || "";
      counter.textContent = "0" + suffix;
    });
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((counter) => observer.observe(counter));
  }
});

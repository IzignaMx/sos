/* La escultura se prepara tras pintar la portada, sólo cuando está a la vista. */
(() => {
  const pieza = document.querySelector("[data-hero3d]");
  if (!pieza) return;
  const superficie = pieza.querySelector("[data-hero3d-canvas]");
  const poster = pieza.querySelector("[data-hero3d-poster]");
  const cargando = pieza.querySelector("[data-hero3d-loading]");
  const error = pieza.querySelector("[data-hero3d-error]");
  const listo = pieza.querySelector("[data-hero3d-ready]");
  if (!superficie || !pieza.dataset.model) return;

  const respaldo = pieza.closest("figure") || pieza;
  respaldo.tabIndex = -1;
  const archivo = new URL(document.currentScript.src);
  const modulo = new URL("hero3d-renderer.js", archivo);
  modulo.search = archivo.search;
  let visor;
  let solicitud;
  let observador;
  let terminado = false;
  let visible = false;
  let primerPintado = false;
  let intentos = 0;
  let reintentoPendiente = false;
  let inactivo = 0;
  let primerFrame = 0;
  let segundoFrame = 0;

  const estado = (valor) => {
    pieza.dataset.state = valor;
    superficie.setAttribute("aria-busy", String(valor === "loading"));
    superficie.hidden = valor !== "ready";
    superficie.tabIndex = valor === "ready" ? 0 : -1;
    if (cargando) cargando.hidden = valor !== "loading";
    if (error) error.hidden = valor !== "error";
    if (listo) listo.hidden = valor !== "ready";
  };
  const cancelarProgramacion = () => {
    if (window.cancelIdleCallback) window.cancelIdleCallback(inactivo);
    else clearTimeout(inactivo);
    inactivo = 0;
    cancelAnimationFrame(primerFrame);
    cancelAnimationFrame(segundoFrame);
    primerFrame = segundoFrame = 0;
  };
  const fallo = () => {
    const devolverFoco = superficie.contains(document.activeElement);
    solicitud?.abort();
    visor?.dispose();
    visor = null;
    estado("error");
    if (devolverFoco) respaldo.focus({ preventScroll: true });
  };
  const iniciar = async () => {
    if (
      terminado ||
      document.hidden ||
      !visible ||
      intentos >= 2 ||
      ["loading", "ready"].includes(pieza.dataset.state)
    )
      return;
    reintentoPendiente = false;
    intentos++;
    estado("loading");
    const intento = new AbortController();
    solicitud = intento;
    const tiempo = setTimeout(() => {
      if (solicitud === intento) fallo();
    }, 20000);
    try {
      const { crearVisor } = await import(modulo.href);
      if (intento.signal.aborted)
        throw new DOMException("Carga cancelada", "AbortError");
      const resultado = await crearVisor({
        superficie,
        medida: pieza,
        url: pieza.dataset.model,
        orientacion: pieza.dataset.rotation,
        signal: intento.signal,
        alPerderContexto: fallo,
      });
      if (intento.signal.aborted || terminado) {
        resultado.dispose();
        return;
      }
      visor = resultado;
      estado("ready");
      visor.resize();
      // La carga automática nunca cambia el foco ni desplaza la página.
    } catch {
      if (!terminado && solicitud === intento) fallo();
    } finally {
      clearTimeout(tiempo);
    }
  };
  const programar = (reintentar = false) => {
    // Conservar la intención aunque ocultar la pestaña cancele el callback.
    if (reintentar && pieza.dataset.state === "error" && intentos < 2)
      reintentoPendiente = true;
    if (
      !visible ||
      !primerPintado ||
      terminado ||
      document.hidden ||
      inactivo ||
      intentos >= 2 ||
      (pieza.dataset.state !== "poster" &&
        !(reintentoPendiente && pieza.dataset.state === "error"))
    )
      return;
    const ejecutar = () => {
      inactivo = 0;
      iniciar();
    };
    inactivo = window.requestIdleCallback
      ? window.requestIdleCallback(ejecutar, { timeout: 1200 })
      : setTimeout(ejecutar, 80);
  };
  const esperarPintado = () => {
    if (
      terminado ||
      document.hidden ||
      primerFrame ||
      segundoFrame ||
      (poster && !poster.complete)
    )
      return;
    if (primerPintado) {
      programar();
      return;
    }
    primerFrame = requestAnimationFrame(() => {
      primerFrame = 0;
      segundoFrame = requestAnimationFrame(() => {
        segundoFrame = 0;
        primerPintado = true;
        programar();
      });
    });
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelarProgramacion();
    else esperarPintado();
  });
  window.addEventListener("online", () => programar(true));
  window.addEventListener("pagehide", (evento) => {
    cancelarProgramacion();
    if (!evento.persisted) {
      terminado = true;
      solicitud?.abort();
      observador?.disconnect();
      visor?.dispose();
    }
  });
  window.addEventListener("pageshow", esperarPintado);
  estado("poster");
  if ("IntersectionObserver" in window) {
    observador = new IntersectionObserver(
      ([entrada]) => {
        const entraba = !visible;
        visible = entrada.isIntersecting;
        if (visible) {
          esperarPintado();
          programar(entraba);
        } else cancelarProgramacion();
      },
      { threshold: 0.01 },
    );
    observador.observe(pieza);
  } else visible = true;
  if (!poster || poster.complete) esperarPintado();
  else {
    poster.addEventListener("load", esperarPintado, { once: true });
    poster.addEventListener("error", esperarPintado, { once: true });
  }
})();

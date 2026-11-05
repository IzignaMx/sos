/* Portada bajo demanda: sólo Explorar en 3D descarga el motor y la escultura. */
(() => {
  const pieza = document.querySelector("[data-hero3d]");
  if (!pieza) return;

  const superficie = pieza.querySelector("[data-hero3d-canvas]");
  const cargar = pieza.querySelector("[data-hero3d-load]");
  const controles = pieza.querySelector("[data-hero3d-controls]");
  const cargando = pieza.querySelector("[data-hero3d-loading]");
  const error = pieza.querySelector("[data-hero3d-error]");
  const listo = pieza.querySelector("[data-hero3d-ready]");
  if (!superficie || !cargar || !pieza.dataset.model) return;

  const archivo = new URL(document.currentScript.src);
  const modulo = new URL("hero3d-renderer.js", archivo);
  modulo.search = archivo.search;
  let visor;
  let solicitud;
  let terminado = false;

  const estado = (valor) => {
    pieza.dataset.state = valor;
    pieza.setAttribute("aria-busy", String(valor === "loading"));
    superficie.hidden = valor !== "ready";
    superficie.tabIndex = valor === "ready" ? 0 : -1;
    if (controles) controles.hidden = valor !== "ready";
    cargar.hidden = valor === "ready";
    // aria-disabled conserva el foco mientras carga; iniciar() ignora nuevos intentos.
    cargar.setAttribute("aria-disabled", String(valor === "loading"));
    if (cargando) cargando.hidden = valor !== "loading";
    if (error) error.hidden = valor !== "error";
    if (listo) listo.hidden = valor !== "ready";
  };

  const fallo = () => {
    const devolverFoco =
      superficie.contains(document.activeElement) ||
      controles?.contains(document.activeElement);
    solicitud?.abort();
    visor?.dispose();
    visor = null;
    estado("error");
    // Devolver el foco si desaparecen los controles por una pérdida de contexto.
    if (devolverFoco) cargar.focus({ preventScroll: true });
  };

  const iniciar = async () => {
    if (
      terminado ||
      pieza.dataset.state === "loading" ||
      pieza.dataset.state === "ready"
    )
      return;
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
      const enfocarVisor = document.activeElement === cargar;
      estado("ready");
      visor.resize();
      if (enfocarVisor) superficie.focus({ preventScroll: true });
    } catch {
      if (!terminado && solicitud === intento) fallo();
    } finally {
      clearTimeout(tiempo);
    }
  };

  cargar.addEventListener("click", iniciar);
  pieza
    .querySelector("[data-hero3d-left]")
    ?.addEventListener("click", () => visor?.rotate(-Math.PI / 8, 0));
  pieza
    .querySelector("[data-hero3d-right]")
    ?.addEventListener("click", () => visor?.rotate(Math.PI / 8, 0));
  pieza
    .querySelector("[data-hero3d-reset]")
    ?.addEventListener("click", () => visor?.reset());
  window.addEventListener("pagehide", (evento) => {
    // La caché de navegación conserva el visor; una salida definitiva libera la GPU.
    if (!evento.persisted) {
      terminado = true;
      solicitud?.abort();
      visor?.dispose();
    }
  });
  estado("poster");
})();

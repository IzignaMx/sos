/* Movimiento editorial: mejora progresiva sin animaciones en bucle. */
(() => {
  const raiz = document.documentElement;
  const boton = document.querySelector("[data-motion-toggle]");
  const etiquetaActiva = boton?.querySelector("[data-motion-on]");
  const etiquetaPausada = boton?.querySelector("[data-motion-off]");
  const piezas = Array.from(document.querySelectorAll("[data-artwork]"));
  const secciones = Array.from(document.querySelectorAll("[data-reveal]"));
  const movimientoReducido = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const punteroPreciso = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );
  const clavePreferencia = "sos-motion-paused";
  let pausaManual = false;
  let pausado = true;
  let fotograma = 0;
  let cambioPendiente = null;
  let observador;

  try {
    pausaManual = localStorage.getItem(clavePreferencia) === "true";
  } catch {
    // El modo privado o una política de almacenamiento no impiden usar el control.
  }

  const mostrarSeccion = (seccion) => {
    seccion.dataset.revealed = "true";
    observador?.unobserve(seccion);
  };

  const restablecerPiezas = () => {
    cancelAnimationFrame(fotograma);
    fotograma = 0;
    cambioPendiente = null;
    piezas.forEach((pieza) => {
      pieza.style.setProperty("--art-x", "0px");
      pieza.style.setProperty("--art-y", "0px");
    });
  };

  const actualizarPreferencia = () => {
    pausado = pausaManual || movimientoReducido.matches || document.hidden;
    raiz.dataset.motion = pausado ? "paused" : "active";
    if (boton) {
      boton.hidden = false;
      // La pausa del sistema tiene prioridad sobre el control de la página.
      boton.disabled = movimientoReducido.matches;
      boton.setAttribute(
        "aria-pressed",
        String(pausaManual || movimientoReducido.matches),
      );
      if (etiquetaActiva)
        etiquetaActiva.hidden = pausaManual || movimientoReducido.matches;
      if (etiquetaPausada)
        etiquetaPausada.hidden = !pausaManual && !movimientoReducido.matches;
    }
    if (pausado || !punteroPreciso.matches) restablecerPiezas();
    if (pausado) secciones.forEach(mostrarSeccion);
  };

  boton?.addEventListener("click", () => {
    if (movimientoReducido.matches) return;
    pausaManual = !pausaManual;
    try {
      localStorage.setItem(clavePreferencia, String(pausaManual));
    } catch {
      // La preferencia sigue funcionando durante esta visita.
    }
    actualizarPreferencia();
  });

  movimientoReducido.addEventListener("change", actualizarPreferencia);
  punteroPreciso.addEventListener("change", actualizarPreferencia);
  document.addEventListener("visibilitychange", actualizarPreferencia);
  window.addEventListener("pagehide", restablecerPiezas);
  window.addEventListener("pageshow", actualizarPreferencia);
  actualizarPreferencia();

  // Un solo RAF agrupa los eventos de puntero; no se solicita otro al terminar.
  piezas.forEach((pieza) => {
    pieza.addEventListener(
      "pointermove",
      (evento) => {
        if (
          pausado ||
          !punteroPreciso.matches ||
          evento.pointerType === "touch"
        )
          return;
        const limites = pieza.getBoundingClientRect();
        if (!limites.width || !limites.height) return;
        const limitar = (valor) => Math.max(-8, Math.min(8, valor));
        cambioPendiente = {
          pieza,
          x: limitar(
            ((evento.clientX - limites.left) / limites.width - 0.5) * 16,
          ),
          y: limitar(
            ((evento.clientY - limites.top) / limites.height - 0.5) * 16,
          ),
        };
        if (fotograma) return;
        fotograma = requestAnimationFrame(() => {
          fotograma = 0;
          if (!cambioPendiente || pausado) return;
          // Las variables son píxeles; CSS conserva la responsabilidad del transform.
          cambioPendiente.pieza.style.setProperty(
            "--art-x",
            `${cambioPendiente.x.toFixed(2)}px`,
          );
          cambioPendiente.pieza.style.setProperty(
            "--art-y",
            `${cambioPendiente.y.toFixed(2)}px`,
          );
          cambioPendiente = null;
        });
      },
      { passive: true },
    );
    pieza.addEventListener("pointerleave", restablecerPiezas);
    pieza.addEventListener("pointercancel", restablecerPiezas);
  });

  if (!("IntersectionObserver" in window) || pausado) {
    secciones.forEach(mostrarSeccion);
    return;
  }

  observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) mostrarSeccion(entrada.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -24px 0px" },
  );

  secciones.forEach((seccion) => {
    // El contenido visible al cargar nunca se oculta para iniciar una animación.
    if (seccion.getBoundingClientRect().top < window.innerHeight) {
      mostrarSeccion(seccion);
    } else {
      seccion.dataset.revealReady = "true";
      observador.observe(seccion);
    }
  });

  // La navegación por teclado revela inmediatamente su destino.
  document.addEventListener("focusin", (evento) => {
    const seccion = evento.target.closest("[data-reveal]");
    if (seccion) mostrarSeccion(seccion);
  });
})();

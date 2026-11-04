/* Movimiento editorial: un solo fotograma bajo demanda, sin secuestrar el scroll. */
(() => {
  const raiz = document.documentElement;
  const boton = document.querySelector("[data-motion-toggle]");
  const etiquetaActiva = boton?.querySelector("[data-motion-on]");
  const etiquetaPausada = boton?.querySelector("[data-motion-off]");
  const piezas = Array.from(document.querySelectorAll("[data-artwork]"));
  const portadas = piezas.map((pieza) => ({
    pieza,
    fuente: pieza.closest(".hero") || pieza,
  }));
  const secciones = Array.from(document.querySelectorAll("[data-reveal]"));
  const historias = Array.from(
    document.querySelectorAll("[data-flow-story]"),
  ).map((elemento) => ({
    elemento,
    visual: elemento.querySelector("[data-flow-visual]") || elemento,
    pasos: Array.from(elemento.querySelectorAll("[data-flow-step]")),
  }));
  const fuentes = new Set([
    ...portadas.map((portada) => portada.fuente),
    ...historias.map((historia) => historia.elemento),
  ]);
  const visibles = new Set(fuentes);
  const movimientoReducido = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const punteroPreciso = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );
  const clavePreferencia = "sos-motion-paused";
  const limitar = (valor, minimo = 0, maximo = 1) =>
    Math.max(minimo, Math.min(maximo, valor));
  let pausaManual = false;
  let pausado = true;
  let fueraDePagina = false;
  let fotograma = 0;
  let medirTodas = false;
  let punteroPendiente = null;
  const piezasPorRestablecer = new Set();
  let observador;

  try {
    pausaManual = localStorage.getItem(clavePreferencia) === "true";
  } catch {
    // El almacenamiento denegado no impide usar la pausa durante esta visita.
  }

  const mostrarSeccion = (seccion) => {
    seccion.dataset.revealed = "true";
    observador?.unobserve(seccion);
  };

  const pintarHistoria = (
    historia,
    progreso,
    estatica = false,
    lecturaPasos = null,
  ) => {
    const etapa = estatica
      ? 2
      : (lecturaPasos?.etapa ?? Math.min(2, Math.floor(progreso * 3)));
    historia.elemento.dataset.flowProgress = progreso.toFixed(3);
    historia.elemento.dataset.flowStage = String(etapa);
    historia.visual.style.setProperty("--flow-progress", String(progreso));
    historia.visual.style.setProperty(
      "--flow-join",
      estatica ? "1" : String(limitar((progreso - 0.1) / 0.65)),
    );
    historia.visual.style.setProperty(
      "--flow-turn",
      estatica ? "0deg" : `${(-18 + progreso * 60).toFixed(2)}deg`,
    );
    historia.pasos.forEach((paso, indice) => {
      // La etapa resalta el texto; nunca lo oculta ni provoca anuncios al hacer scroll.
      paso.dataset.active = String(indice === etapa);
      paso.style.setProperty(
        "--step-progress",
        estatica ? "1" : String(lecturaPasos?.progresos[indice] ?? 0),
      );
    });
  };

  const cancelarFotograma = () => {
    cancelAnimationFrame(fotograma);
    fotograma = 0;
    medirTodas = false;
    punteroPendiente = null;
    piezasPorRestablecer.clear();
  };

  const restablecerPuntero = () => {
    punteroPendiente = null;
    piezasPorRestablecer.clear();
    piezas.forEach((pieza) => {
      pieza.style.setProperty("--art-x", "0px");
      pieza.style.setProperty("--art-y", "0px");
    });
  };

  const pintarFotograma = () => {
    fotograma = 0;
    if (pausado) return;
    const altoVentana = window.innerHeight;
    const esMovil = window.innerWidth <= 760;
    const todas = medirTodas;
    medirTodas = false;
    const limites = new Map();
    // Todas las lecturas geométricas preceden a las escrituras de este fotograma.
    fuentes.forEach((fuente) => {
      if (todas || visibles.has(fuente))
        limites.set(fuente, fuente.getBoundingClientRect());
    });
    const limitesPasos = new Map();
    historias.forEach((historia) => {
      if (limites.has(historia.elemento)) {
        limitesPasos.set(
          historia,
          historia.pasos.map((paso) => paso.getBoundingClientRect()),
        );
      }
    });
    const puntero = punteroPendiente;
    const limitesPuntero = puntero?.pieza.getBoundingClientRect();
    punteroPendiente = null;

    historias.forEach((historia) => {
      const caja = limites.get(historia.elemento);
      if (!caja) return;
      const recorrido = Math.max(caja.height - altoVentana, 1);
      const cajasPasos = limitesPasos.get(historia) || [];
      const progresos = cajasPasos.map((paso) =>
        limitar((altoVentana * 0.8 - paso.top) / (altoVentana * 0.45)),
      );
      let etapa;
      if (esMovil && cajasPasos.length) {
        // En móvil cada gráfico acompaña a su texto: la etapa sigue la lectura,
        // no la fracción de altura total, que cambia con la longitud del idioma.
        let distanciaMinima = Infinity;
        cajasPasos.forEach((paso, indice) => {
          const distancia = Math.abs(
            paso.top + paso.height / 2 - altoVentana / 2,
          );
          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            etapa = indice;
          }
        });
      }
      pintarHistoria(historia, limitar(-caja.top / recorrido), false, {
        etapa,
        progresos,
      });
    });
    portadas.forEach(({ pieza, fuente }) => {
      const caja = limites.get(fuente);
      if (caja)
        pieza.style.setProperty(
          "--hero-scroll",
          String(limitar(-caja.top / Math.max(caja.height, 1))),
        );
    });
    piezasPorRestablecer.forEach((pieza) => {
      pieza.style.setProperty("--art-x", "0px");
      pieza.style.setProperty("--art-y", "0px");
    });
    piezasPorRestablecer.clear();
    if (puntero && limitesPuntero?.width && limitesPuntero?.height) {
      const x = limitar(
        ((puntero.x - limitesPuntero.left) / limitesPuntero.width - 0.5) * 16,
        -8,
        8,
      );
      const y = limitar(
        ((puntero.y - limitesPuntero.top) / limitesPuntero.height - 0.5) * 16,
        -8,
        8,
      );
      puntero.pieza.style.setProperty("--art-x", `${x.toFixed(2)}px`);
      puntero.pieza.style.setProperty("--art-y", `${y.toFixed(2)}px`);
    }
    // No se solicita otro fotograma: el siguiente lo pide un evento real.
  };

  const solicitarFotograma = (forzar = false) => {
    if (pausado) return;
    medirTodas ||= forzar;
    if (
      !medirTodas &&
      !visibles.size &&
      !punteroPendiente &&
      !piezasPorRestablecer.size
    )
      return;
    if (!fotograma) fotograma = requestAnimationFrame(pintarFotograma);
  };

  const actualizarPreferencia = () => {
    pausado =
      pausaManual ||
      movimientoReducido.matches ||
      document.hidden ||
      fueraDePagina;
    raiz.dataset.motion = pausado ? "paused" : "active";
    if (boton) {
      boton.hidden = false;
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
    if (pausado) {
      cancelarFotograma();
      restablecerPuntero();
      piezas.forEach((pieza) => pieza.style.setProperty("--hero-scroll", "0"));
      historias.forEach((historia) => pintarHistoria(historia, 1, true));
      secciones.forEach(mostrarSeccion);
    } else {
      if (!punteroPreciso.matches) restablecerPuntero();
      solicitarFotograma(true);
    }
  };

  boton?.addEventListener("click", () => {
    if (movimientoReducido.matches) return;
    pausaManual = !pausaManual;
    try {
      localStorage.setItem(clavePreferencia, String(pausaManual));
    } catch {
      // La preferencia sigue funcionando sin persistencia.
    }
    actualizarPreferencia();
  });
  movimientoReducido.addEventListener("change", actualizarPreferencia);
  punteroPreciso.addEventListener("change", actualizarPreferencia);
  document.addEventListener("visibilitychange", actualizarPreferencia);
  window.addEventListener("pagehide", () => {
    fueraDePagina = true;
    actualizarPreferencia();
  });
  window.addEventListener("pageshow", () => {
    fueraDePagina = false;
    actualizarPreferencia();
  });
  window.addEventListener("scroll", () => solicitarFotograma(), {
    passive: true,
  });
  window.addEventListener("resize", () => solicitarFotograma(true), {
    passive: true,
  });

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
        punteroPendiente = { pieza, x: evento.clientX, y: evento.clientY };
        piezasPorRestablecer.delete(pieza);
        solicitarFotograma();
      },
      { passive: true },
    );
    const salir = () => {
      if (punteroPendiente?.pieza === pieza) punteroPendiente = null;
      piezasPorRestablecer.add(pieza);
      solicitarFotograma();
    };
    pieza.addEventListener("pointerleave", salir);
    pieza.addEventListener("pointercancel", salir);
  });

  if ("IntersectionObserver" in window) {
    const visibilidad = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) visibles.add(entrada.target);
        else visibles.delete(entrada.target);
      });
      // Al salir se pinta el límite una vez; después no se trabaja fuera de pantalla.
      solicitarFotograma(true);
    });
    fuentes.forEach((fuente) => visibilidad.observe(fuente));
    observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) mostrarSeccion(entrada.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -24px 0px" },
    );
    secciones.forEach((seccion) => {
      if (seccion.getBoundingClientRect().top < window.innerHeight)
        mostrarSeccion(seccion);
      else {
        seccion.dataset.revealReady = "true";
        observador.observe(seccion);
      }
    });
  } else {
    secciones.forEach(mostrarSeccion);
  }
  if ("ResizeObserver" in window) {
    const dimensiones = new ResizeObserver(() => solicitarFotograma(true));
    fuentes.forEach((fuente) => dimensiones.observe(fuente));
  }
  document.addEventListener("focusin", (evento) => {
    const seccion = evento.target.closest("[data-reveal]");
    if (seccion) mostrarSeccion(seccion);
  });
  actualizarPreferencia();
})();

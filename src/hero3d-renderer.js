/* Entrada y física ligeras; el motor gráfico puede ejecutarse en un Worker. */
import { crearMotor } from "./hero3d-backend.js";

const limitar = (valor, minimo, maximo) =>
  Math.min(maximo, Math.max(minimo, valor));

export async function crearVisor({
  superficie,
  medida,
  url,
  orientacion,
  signal,
  alPerderContexto,
}) {
  let motor;
  let fotograma = 0;
  let destruido = false;
  let listo = false;
  let agarre;
  let observadorTamano;
  let observadorVisible;
  let observadorPausa;
  let visible = true;
  let activo = true;
  let fueraDePagina = false;
  let ultimoTiempo = 0;
  let medirPendiente = true;
  let horizontal = 0;
  let vertical = 0;
  let velocidadX = 0;
  let velocidadY = 0;
  let punteroX = 0;
  let punteroY = 0;
  let recorrido = 0;
  const ambiental = { x: 0, y: 0, scroll: 0 };
  const eventos = new AbortController();
  const movimientoReducido = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const punteroPreciso = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );
  const fuenteScroll = medida.closest(".hero") || medida;
  const inicial = (orientacion || "0,0,0").split(",").map(Number);
  const base =
    inicial.length === 3 && inicial.every(Number.isFinite)
      ? inicial
      : [0, 0, 0];
  const admiteAmbiente = () =>
    !movimientoReducido.matches &&
    document.documentElement.dataset.motion !== "paused";
  const puedePintar = () =>
    listo &&
    !destruido &&
    activo &&
    visible &&
    !document.hidden &&
    !fueraDePagina;

  const pose = { giro: [...base], ambiente: [0, 0, 0], posicion: [0, 0, 0] };

  const aplicarAmbiente = () => {
    pose.ambiente = [
      ambiental.y * -0.07 - ambiental.scroll * 0.12,
      ambiental.x * 0.1 + ambiental.scroll * 0.28,
      ambiental.scroll * 0.025,
    ];
    pose.posicion = [
      ambiental.x * 0.025,
      -ambiental.y * 0.018 - ambiental.scroll * 0.065,
      0,
    ];
  };
  const cancelarFotograma = () => {
    cancelAnimationFrame(fotograma);
    fotograma = 0;
    ultimoTiempo = 0;
  };
  const detenerInercia = () => {
    velocidadX = 0;
    velocidadY = 0;
  };
  const aplicarGiro = () => {
    pose.giro = [base[0] + vertical, base[1] + horizontal, base[2]];
  };
  const girar = (x, y) => {
    horizontal = (horizontal + x) % (Math.PI * 2);
    const anterior = vertical;
    vertical = limitar(vertical + y, -Math.PI * 0.42, Math.PI * 0.42);
    if (vertical === anterior && y !== 0) velocidadY = 0;
    aplicarGiro();
  };
  const medirScroll = () => {
    medirPendiente = false;
    const caja = fuenteScroll.getBoundingClientRect();
    recorrido = limitar(-caja.top / Math.max(caja.height * 0.85, 1), 0, 1);
  };
  const actualizarAmbiente = (dt) => {
    if (!admiteAmbiente() || agarre) return false;
    if (medirPendiente) medirScroll();
    const destino = { x: punteroX, y: punteroY, scroll: recorrido };
    const avance = 1 - Math.exp(-12 * dt);
    let pendiente = false;
    for (const clave of ["x", "y", "scroll"]) {
      const distancia = destino[clave] - ambiental[clave];
      if (Math.abs(distancia) < 0.0005) ambiental[clave] = destino[clave];
      else {
        ambiental[clave] += distancia * avance;
        pendiente = true;
      }
    }
    aplicarAmbiente();
    return pendiente;
  };
  const pintar = (tiempo) => {
    fotograma = 0;
    if (!puedePintar()) {
      ultimoTiempo = 0;
      return;
    }
    const dt = ultimoTiempo
      ? limitar((tiempo - ultimoTiempo) / 1000, 0.001, 0.05)
      : 1 / 60;
    ultimoTiempo = tiempo;
    if (!admiteAmbiente()) detenerInercia();
    if (!agarre && (velocidadX || velocidadY)) {
      // Integración exponencial: el impulso recorre lo mismo a 30, 60 o 120 Hz.
      const friccion = 6.5;
      const decaimiento = Math.exp(-friccion * dt);
      girar(
        (velocidadX * (1 - decaimiento)) / friccion,
        (velocidadY * (1 - decaimiento)) / friccion,
      );
      velocidadX *= decaimiento;
      velocidadY *= decaimiento;
      if (Math.abs(velocidadX) < 0.015) velocidadX = 0;
      if (Math.abs(velocidadY) < 0.015) velocidadY = 0;
    }
    const ambientando = actualizarAmbiente(dt);
    motor.pintar(pose);
    if (velocidadX || velocidadY || ambientando) solicitar();
    else ultimoTiempo = 0;
  };
  const solicitar = () => {
    if (puedePintar() && !fotograma) fotograma = requestAnimationFrame(pintar);
  };
  const terminar = (conImpulso = false) => {
    const actual = agarre;
    agarre = null;
    superficie.removeAttribute("data-dragging");
    if (actual && superficie.hasPointerCapture?.(actual.id))
      superficie.releasePointerCapture(actual.id);
    detenerInercia();
    if (
      conImpulso &&
      actual?.activo &&
      admiteAmbiente() &&
      puedePintar() &&
      performance.now() - actual.ultimoMovimiento < 100
    ) {
      velocidadX = actual.velocidadX;
      velocidadY = actual.velocidadY;
    }
    solicitar();
  };
  const suspender = () => {
    terminar();
    cancelarFotograma();
    // No recuperar impulsos ni movimientos de puntero acumulados fuera de escena.
    punteroX = ambiental.x;
    punteroY = ambiental.y;
    recorrido = ambiental.scroll;
  };
  const setActive = (valor) => {
    activo = valor;
    if (!valor) suspender();
    else {
      medirPendiente = true;
      solicitar();
    }
  };
  const rotate = (x, y) => {
    detenerInercia();
    girar(x, y);
    solicitar();
  };
  const reset = () => {
    terminar();
    horizontal = 0;
    vertical = 0;
    punteroX = 0;
    punteroY = 0;
    ambiental.x = 0;
    ambiental.y = 0;
    aplicarAmbiente();
    aplicarGiro();
    solicitar();
  };
  const resize = () => {
    if (destruido) return;
    const caja = medida.getBoundingClientRect();
    motor?.redimensionar(Math.max(1, caja.width), Math.max(1, caja.height));
    medirPendiente = true;
    solicitar();
  };
  const dispose = () => {
    if (destruido) return;
    destruido = true;
    suspender();
    observadorTamano?.disconnect();
    observadorVisible?.disconnect();
    observadorPausa?.disconnect();
    eventos.abort();
    motor?.dispose();
  };

  try {
    const caja = medida.getBoundingClientRect();
    motor = await crearMotor({
      superficie,
      url,
      signal,
      alPerderContexto: () => {
        suspender();
        alPerderContexto();
      },
      ancho: Math.max(1, caja.width),
      alto: Math.max(1, caja.height),
      pixelRatio: Math.min(
        window.devicePixelRatio || 1,
        navigator.connection?.saveData ? 1 : 2,
      ),
      orientacion: base,
    });
    if (signal.aborted) throw new DOMException("Carga cancelada", "AbortError");
    listo = true;
  } catch (error) {
    dispose();
    throw error;
  }

  superficie.addEventListener(
    "pointerdown",
    (evento) => {
      if (evento.button !== 0 || !evento.isPrimary) return;
      detenerInercia();
      punteroX = ambiental.x;
      punteroY = ambiental.y;
      agarre = {
        id: evento.pointerId,
        x: evento.clientX,
        y: evento.clientY,
        inicioX: evento.clientX,
        inicioY: evento.clientY,
        tactil: evento.pointerType === "touch",
        activo: evento.pointerType !== "touch",
        ultimoMovimiento: performance.now(),
        velocidadX: 0,
        velocidadY: 0,
      };
      if (!agarre.tactil) {
        superficie.setPointerCapture(evento.pointerId);
        superficie.dataset.dragging = "true";
        superficie.focus({ preventScroll: true });
      }
    },
    { signal: eventos.signal },
  );
  superficie.addEventListener(
    "pointermove",
    (evento) => {
      if (!agarre || evento.pointerId !== agarre.id) return;
      const dx = evento.clientX - agarre.x;
      const dy = evento.clientY - agarre.y;
      if (agarre.tactil && !agarre.activo) {
        const totalX = Math.abs(evento.clientX - agarre.inicioX);
        const totalY = Math.abs(evento.clientY - agarre.inicioY);
        if (Math.max(totalX, totalY) < 8) return;
        if (totalY > totalX) {
          terminar();
          return;
        }
        agarre.activo = true;
        superficie.setPointerCapture(evento.pointerId);
        superficie.dataset.dragging = "true";
      }
      const ahora = performance.now();
      const dt = Math.max((ahora - agarre.ultimoMovimiento) / 1000, 0.001);
      const x = dx * 0.009;
      const y = agarre.tactil ? 0 : dy * 0.009;
      const filtro = 1 - Math.exp(-60 * dt);
      const velocidad = (anterior, muestra) =>
        anterior + (limitar(muestra, -3.2, 3.2) - anterior) * filtro;
      agarre.velocidadX = velocidad(agarre.velocidadX, x / dt);
      agarre.velocidadY = velocidad(agarre.velocidadY, y / dt);
      agarre.ultimoMovimiento = ahora;
      agarre.x = evento.clientX;
      agarre.y = evento.clientY;
      girar(x, y);
      solicitar();
    },
    { signal: eventos.signal },
  );
  superficie.addEventListener(
    "pointerup",
    (evento) => {
      if (agarre?.id === evento.pointerId) terminar(true);
    },
    { signal: eventos.signal },
  );
  superficie.addEventListener(
    "pointercancel",
    (evento) => {
      if (agarre?.id === evento.pointerId) terminar();
    },
    { signal: eventos.signal },
  );
  superficie.addEventListener(
    "lostpointercapture",
    (evento) => {
      // En touch, la captura implícita empieza en canvas. Su pérdida al pasarla
      // al marco burbujea, pero no equivale a cancelar la nueva captura del marco.
      if (evento.target === superficie && agarre?.id === evento.pointerId)
        terminar();
    },
    { signal: eventos.signal },
  );
  superficie.addEventListener(
    "keydown",
    (evento) => {
      const giros = {
        ArrowLeft: [-Math.PI / 12, 0],
        ArrowRight: [Math.PI / 12, 0],
        ArrowUp: [0, -Math.PI / 12],
        ArrowDown: [0, Math.PI / 12],
      };
      if (giros[evento.key]) {
        evento.preventDefault();
        rotate(...giros[evento.key]);
      } else if (evento.key === "Home") {
        evento.preventDefault();
        reset();
      }
    },
    { signal: eventos.signal },
  );

  window.addEventListener(
    "pointermove",
    (evento) => {
      if (
        agarre ||
        !puedePintar() ||
        !admiteAmbiente() ||
        !punteroPreciso.matches ||
        evento.pointerType === "touch"
      )
        return;
      punteroX = limitar(
        (evento.clientX / Math.max(1, innerWidth)) * 2 - 1,
        -1,
        1,
      );
      punteroY = limitar(
        (evento.clientY / Math.max(1, innerHeight)) * 2 - 1,
        -1,
        1,
      );
      solicitar();
    },
    { signal: eventos.signal, passive: true },
  );
  document.documentElement.addEventListener(
    "pointerleave",
    () => {
      if (agarre || !admiteAmbiente()) return;
      punteroX = 0;
      punteroY = 0;
      solicitar();
    },
    { signal: eventos.signal },
  );
  window.addEventListener(
    "scroll",
    () => {
      medirPendiente = true;
      if (admiteAmbiente()) solicitar();
    },
    { signal: eventos.signal, passive: true },
  );
  const actualizarPausa = () => {
    if (!admiteAmbiente()) {
      detenerInercia();
      cancelarFotograma();
    } else {
      medirPendiente = true;
      solicitar();
    }
  };
  movimientoReducido.addEventListener("change", actualizarPausa, {
    signal: eventos.signal,
  });
  observadorPausa = new MutationObserver(actualizarPausa);
  observadorPausa.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) suspender();
      else {
        medirPendiente = true;
        solicitar();
      }
    },
    { signal: eventos.signal },
  );
  window.addEventListener("blur", suspender, { signal: eventos.signal });
  window.addEventListener(
    "pagehide",
    () => {
      fueraDePagina = true;
      suspender();
    },
    { signal: eventos.signal },
  );
  window.addEventListener(
    "pageshow",
    () => {
      fueraDePagina = false;
      medirPendiente = true;
      solicitar();
    },
    { signal: eventos.signal },
  );
  observadorTamano = new ResizeObserver(resize);
  observadorTamano.observe(medida);
  observadorVisible = new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting;
    if (!visible) suspender();
    else {
      medirPendiente = true;
      solicitar();
    }
  });
  observadorVisible.observe(medida);

  return { rotate, reset, resize, dispose, setActive };
}

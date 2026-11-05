/* Se compila como módulo local: no hay dependencias de CDN en el navegador. */
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoadingManager,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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
  const motor = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  motor.setClearColor(0x000000, 0);
  motor.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  motor.toneMapping = ACESFilmicToneMapping;
  motor.toneMappingExposure = 1.2;
  motor.domElement.setAttribute("aria-hidden", "true");

  const escena = new Scene();
  const camara = new PerspectiveCamera(34, 1, 0.01, 100);
  const giro = new Group();
  escena.add(giro);
  const estudio = new RoomEnvironment();
  const generador = new PMREMGenerator(motor);
  const entorno = generador.fromScene(estudio, 0.04);
  escena.environment = entorno.texture;
  escena.environmentIntensity = 1.35;
  estudio.dispose();
  generador.dispose();
  escena.add(new HemisphereLight(0xffffff, 0x183448, 1.2));
  const luz = new DirectionalLight(0xffffff, 2.3);
  luz.position.set(-2, 4, 5);
  escena.add(luz);
  const relleno = new DirectionalLight(0xb8dcff, 1.4);
  relleno.position.set(3, 1, -2);
  escena.add(relleno);

  let modelo;
  let fotograma = 0;
  let destruido = false;
  let agarre;
  let observador;
  const eventos = new AbortController();
  const inicial = (orientacion || "0,0,0").split(",").map(Number);
  const base =
    inicial.length === 3 && inicial.every(Number.isFinite)
      ? inicial
      : [0, 0, 0];
  let horizontal = 0;
  let vertical = 0;

  const dispose = () => {
    if (destruido) return;
    destruido = true;
    cancelAnimationFrame(fotograma);
    observador?.disconnect();
    eventos.abort();
    const texturas = new Set();
    const materiales = new Set();
    modelo?.traverse((objeto) => {
      objeto.geometry?.dispose();
      const lista = Array.isArray(objeto.material)
        ? objeto.material
        : [objeto.material];
      lista.filter(Boolean).forEach((material) => materiales.add(material));
    });
    materiales.forEach((material) => {
      Object.values(material).forEach((valor) => {
        if (valor?.isTexture) texturas.add(valor);
      });
      material.dispose();
    });
    texturas.forEach((textura) => {
      textura.source?.data?.close?.();
      textura.dispose();
    });
    entorno.dispose();
    motor.dispose();
    motor.domElement.remove();
    superficie.removeAttribute("data-dragging");
  };

  const pintar = () => {
    fotograma = 0;
    if (!destruido && !document.hidden) motor.render(escena, camara);
  };
  const solicitar = () => {
    if (!destruido && !fotograma && !document.hidden)
      fotograma = requestAnimationFrame(pintar);
  };
  const aplicar = () => {
    giro.rotation.set(base[0] + vertical, base[1] + horizontal, base[2], "YXZ");
    solicitar();
  };
  const rotate = (x, y) => {
    horizontal = (horizontal + x) % (Math.PI * 2);
    vertical = limitar(vertical + y, -Math.PI * 0.42, Math.PI * 0.42);
    aplicar();
  };
  const reset = () => {
    horizontal = 0;
    vertical = 0;
    aplicar();
  };

  const resize = () => {
    if (destruido) return;
    const caja = medida.getBoundingClientRect();
    const ancho = Math.max(1, caja.width);
    const alto = Math.max(1, caja.height);
    motor.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.position.set(0, 0, 4.3 / Math.min(1, camara.aspect));
    camara.lookAt(0, 0, 0);
    camara.updateProjectionMatrix();
    solicitar();
  };

  try {
    const respuesta = await fetch(url, { signal, credentials: "same-origin" });
    if (!respuesta.ok) throw new Error("No se pudo cargar la escultura");
    const contenido = await respuesta.arrayBuffer();
    let texturaFallida = false;
    const recursos = new LoadingManager();
    recursos.onError = () => {
      texturaFallida = true;
    };
    const gltf = await new GLTFLoader(recursos).parseAsync(
      contenido,
      new URL(".", new URL(url, location.href)).href,
    );
    modelo = gltf.scene;
    if (texturaFallida)
      throw new Error("No se pudieron cargar los materiales de la escultura");
    if (signal.aborted) throw new DOMException("Carga cancelada", "AbortError");
    const limites = new Box3().setFromObject(modelo);
    const dimensiones = limites.getSize(new Vector3());
    const centro = limites.getCenter(new Vector3());
    const escala = 2 / Math.max(dimensiones.x, dimensiones.y, dimensiones.z);
    if (!Number.isFinite(escala)) throw new Error("Geometría vacía");
    modelo.scale.multiplyScalar(escala);
    modelo.position.sub(centro.multiplyScalar(escala));
    giro.add(modelo);
    giro.rotation.set(...base, "YXZ");
    superficie.append(motor.domElement);
    resize();
    // Mostrar la portada sólo después de renderizar realmente la malla.
    motor.render(escena, camara);
  } catch (error) {
    dispose();
    throw error;
  }

  const terminar = () => {
    if (agarre && superficie.hasPointerCapture?.(agarre.id))
      superficie.releasePointerCapture(agarre.id);
    agarre = null;
    superficie.removeAttribute("data-dragging");
  };

  superficie.addEventListener(
    "pointerdown",
    (evento) => {
      if (evento.button !== 0 || !evento.isPrimary) return;
      agarre = {
        id: evento.pointerId,
        x: evento.clientX,
        y: evento.clientY,
        inicioX: evento.clientX,
        inicioY: evento.clientY,
        tactil: evento.pointerType === "touch",
        activo: evento.pointerType !== "touch",
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
      rotate(dx * 0.009, agarre.tactil ? 0 : dy * 0.009);
      agarre.x = evento.clientX;
      agarre.y = evento.clientY;
    },
    { signal: eventos.signal },
  );
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((nombre) =>
    superficie.addEventListener(nombre, terminar, { signal: eventos.signal }),
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
  motor.domElement.addEventListener(
    "webglcontextlost",
    (evento) => {
      evento.preventDefault();
      alPerderContexto();
    },
    { signal: eventos.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      terminar();
      if (document.hidden) {
        cancelAnimationFrame(fotograma);
        fotograma = 0;
      } else solicitar();
    },
    { signal: eventos.signal },
  );
  window.addEventListener("blur", terminar, { signal: eventos.signal });
  observador = new ResizeObserver(resize);
  observador.observe(medida);

  return { rotate, reset, resize, dispose };
}

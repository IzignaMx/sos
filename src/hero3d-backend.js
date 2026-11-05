/* Puente ligero: Three sólo se evalúa en el hilo principal si falta OffscreenCanvas. */
const archivoVersionado = (nombre) => {
  const destino = new URL(nombre, import.meta.url);
  destino.search = new URL(import.meta.url).search;
  return destino;
};
const errorCancelado = () => new DOMException("Carga cancelada", "AbortError");
const copiarEstado = (estado) => ({
  giro: [...estado.giro],
  ambiente: [...estado.ambiente],
  posicion: [...estado.posicion],
});

export function crearMotor({
  superficie,
  url,
  signal,
  alPerderContexto,
  ancho,
  alto,
  pixelRatio,
  orientacion = [0, 0, 0],
}) {
  return new Promise((resolver, rechazar) => {
    let proceso;
    let escena;
    let canvas;
    let cerrado = false;
    let listo = false;
    let ocupado = false;
    let pendiente;
    let medidaPendiente;
    let ultimoEstado = {
      giro: [...orientacion],
      ambiente: [0, 0, 0],
      posicion: [0, 0, 0],
    };
    const modelo = new URL(url, document.baseURI).href;

    const quitarCanvas = () => {
      canvas?.removeEventListener("webglcontextlost", perderContexto);
      canvas?.remove();
    };
    const terminarProceso = () => {
      if (!proceso) return;
      proceso.removeEventListener("message", recibir);
      proceso.removeEventListener("error", falloProceso);
      proceso.terminate();
      proceso = null;
    };
    const dispose = () => {
      if (cerrado) return;
      cerrado = true;
      pendiente = null;
      medidaPendiente = null;
      signal?.removeEventListener("abort", cancelar);
      terminarProceso();
      escena?.dispose();
      quitarCanvas();
    };
    const fallar = (error) => {
      if (cerrado) return;
      const estabaListo = listo;
      dispose();
      if (estabaListo) alPerderContexto?.();
      else rechazar(error);
    };
    const perderContexto = (evento) => {
      evento?.preventDefault();
      const error = new Error("Se perdió el contexto gráfico");
      error.codigo = "CONTEXT_LOST";
      fallar(error);
    };
    const cancelar = () => {
      dispose();
      rechazar(errorCancelado());
    };
    const crearCanvas = () => {
      canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.addEventListener("webglcontextlost", perderContexto);
      superficie.append(canvas);
      return canvas;
    };
    const enviarPendiente = () => {
      if (
        cerrado ||
        !listo ||
        !proceso ||
        ocupado ||
        (!pendiente && !medidaPendiente)
      )
        return;
      ocupado = true;
      proceso.postMessage({
        tipo: medidaPendiente ? "resize" : "draw",
        estado: pendiente || ultimoEstado,
        medida: medidaPendiente,
      });
      pendiente = null;
      medidaPendiente = null;
    };
    const api = {
      pintar(estado) {
        if (cerrado) return;
        ultimoEstado = copiarEstado(estado);
        if (proceso) {
          pendiente = ultimoEstado;
          enviarPendiente();
        } else {
          try {
            escena?.pintar(ultimoEstado);
          } catch (error) {
            fallar(error);
          }
        }
      },
      redimensionar(nuevoAncho, nuevoAlto) {
        if (cerrado) return;
        if (proceso) {
          medidaPendiente = [nuevoAncho, nuevoAlto];
          enviarPendiente();
        } else {
          try {
            escena?.redimensionar(nuevoAncho, nuevoAlto);
            escena?.pintar(ultimoEstado);
          } catch (error) {
            fallar(error);
          }
        }
      },
      dispose,
    };

    const respaldo = async () => {
      if (cerrado) return;
      terminarProceso();
      quitarCanvas();
      crearCanvas();
      superficie.dataset.renderer = "main";
      try {
        // Una URL calculada mantiene Three fuera del bundle principal.
        const modulo = archivoVersionado("hero3d-scene.js");
        const { crearEscena } = await import(modulo.href);
        if (cerrado || signal?.aborted) throw errorCancelado();
        const resultado = await crearEscena({
          canvas,
          url: modelo,
          signal,
          ancho,
          alto,
          pixelRatio,
          orientacion,
          alPerderContexto: perderContexto,
        });
        if (cerrado || signal?.aborted) {
          resultado.dispose();
          return;
        }
        escena = resultado;
        listo = true;
        resolver(api);
      } catch (error) {
        fallar(error);
      }
    };
    const recibir = ({ data }) => {
      if (cerrado) return;
      if (data.tipo === "ready") {
        listo = true;
        resolver(api);
      } else if (data.tipo === "drawn") {
        ocupado = false;
        enviarPendiente();
      } else if (data.tipo === "contextlost") {
        perderContexto();
      } else if (data.tipo === "error") {
        if (!listo && data.codigo === "UNSUPPORTED") respaldo();
        else {
          const error = new Error(
            data.mensaje || "No se pudo preparar la escultura",
          );
          error.codigo = data.codigo;
          fallar(error);
        }
      }
    };
    const falloProceso = (evento) => {
      evento.preventDefault();
      const error = new Error("No se pudo ejecutar el motor gráfico");
      error.codigo = "WORKER";
      fallar(error);
    };

    if (signal?.aborted) {
      rechazar(errorCancelado());
      return;
    }
    signal?.addEventListener("abort", cancelar, { once: true });
    const admiteWorker =
      typeof Worker === "function" &&
      typeof OffscreenCanvas === "function" &&
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen ===
        "function";
    if (!admiteWorker) {
      respaldo();
      return;
    }
    crearCanvas();
    try {
      proceso = new Worker(archivoVersionado("hero3d-worker.js"), {
        type: "module",
        name: "SOS escultura",
      });
      proceso.addEventListener("message", recibir);
      proceso.addEventListener("error", falloProceso);
      const transferido = canvas.transferControlToOffscreen();
      superficie.dataset.renderer = "worker";
      proceso.postMessage(
        {
          tipo: "init",
          canvas: transferido,
          url: modelo,
          ancho,
          alto,
          pixelRatio,
          orientacion,
        },
        [transferido],
      );
    } catch {
      // Un canvas transferido no puede recuperar WebGL: el respaldo crea otro.
      respaldo();
    }
  });
}

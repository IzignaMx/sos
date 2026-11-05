/* El trabajo GPU y la decodificación del modelo no bloquean el hilo de la página. */
import { crearEscena } from "./hero3d-scene.js";

let escena;
let cancelacion;
let cerrado = false;
const responderError = (error) => {
  if (!cerrado)
    self.postMessage({
      tipo: "error",
      codigo: error.codigo || "RENDER",
      mensaje: error.message || "No se pudo preparar la escultura",
    });
};
self.addEventListener("message", async ({ data }) => {
  if (cerrado) return;
  try {
    if (data.tipo === "init") {
      cancelacion = new AbortController();
      if (typeof createImageBitmap !== "function") {
        const error = new Error("El Worker no admite texturas de imagen");
        error.codigo = "UNSUPPORTED";
        throw error;
      }
      escena = await crearEscena({
        ...data,
        signal: cancelacion.signal,
        alPerderContexto: () => {
          if (!cerrado) self.postMessage({ tipo: "contextlost" });
        },
      });
      if (cerrado) escena.dispose();
      else self.postMessage({ tipo: "ready" });
    } else if (data.tipo === "draw" || data.tipo === "resize") {
      if (!escena) return;
      if (data.medida) escena.redimensionar(...data.medida);
      escena.pintar(data.estado);
      self.postMessage({ tipo: "drawn" });
    } else if (data.tipo === "dispose") {
      cerrado = true;
      cancelacion?.abort();
      escena?.dispose();
      self.close();
    }
  } catch (error) {
    responderError(error);
  }
});

/* Iluminación HDR ya filtrada: evita recalcular el estudio en cada dispositivo. */
import {
  CubeUVReflectionMapping,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  RGBAFormat,
} from "three";

export async function cargarEntorno({ signal, url } = {}) {
  const destino = new URL(
    "../models/studio-environment.bin.gz",
    import.meta.url,
  );
  destino.search = new URL(import.meta.url).search;
  const respuesta = await fetch(url || destino.href, {
    signal,
    credentials: "same-origin",
  });
  if (!respuesta.ok) throw new Error("No se pudo cargar la iluminación");
  let contenido = await respuesta.arrayBuffer();
  signal?.throwIfAborted();
  const firma = new Uint8Array(contenido, 0, Math.min(2, contenido.byteLength));
  // Algunos CDN aplican Content-Encoding; no descomprimir una segunda vez.
  if (firma[0] === 0x1f && firma[1] === 0x8b) {
    const flujo = new Blob([contenido])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    contenido = await new Response(flujo).arrayBuffer();
  }
  signal?.throwIfAborted();
  if (contenido.byteLength < 16) throw new Error("Iluminación incompleta");
  const cabecera = new DataView(contenido);
  const ancho = cabecera.getUint32(4, true);
  const alto = cabecera.getUint32(8, true);
  const lado = alto / 4;
  if (
    cabecera.getUint32(0, true) !== 0x31534f53 ||
    cabecera.getUint32(12, true) !== 4 ||
    !Number.isInteger(Math.log2(lado)) ||
    lado < 16 ||
    lado > 256 ||
    ancho !== 3 * Math.max(lado, 112) ||
    contenido.byteLength !== 16 + ancho * alto * 8
  )
    throw new Error("Formato de iluminación no válido");

  const textura = new DataTexture(
    new Uint16Array(contenido, 16),
    ancho,
    alto,
    RGBAFormat,
    HalfFloatType,
  );
  textura.name = "SOS / estudio precalculado";
  textura.mapping = CubeUVReflectionMapping;
  textura.colorSpace = LinearSRGBColorSpace;
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  textura.generateMipmaps = false;
  textura.flipY = false;
  textura.needsUpdate = true;
  return textura;
}

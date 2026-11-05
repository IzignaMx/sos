# Escultura interactiva de portada

La portada conserva la imagen original como presentación inmediata y respaldo. Cuando la escultura entra en la zona visible, el visor se prepara automáticamente después del primer pintado de la imagen, sin botones ni gestos de activación. La carga se difiere para dar prioridad al contenido y usa iluminación precalculada para evitar generar el entorno de reflejos en cada visita. El contenido comercial y la navegación no dependen de WebGL.

## Recurso y procedencia

El modelo se generó con **Higgsfield / Tripo H3.1 Image to 3D**, usando la misma escultura que ilustra SOS:

- Imagen de referencia: generación `f7ea176a-8216-4fcf-bfe5-ec95ea2cc787`.
- Modelo: generación `6fe7a6fb-fcff-48a2-99f6-5e4037efc37c`.
- Parámetros: límite de 40 000 caras, geometría detallada, materiales PBR, texturas estándar alineadas con la imagen y orientación `align_image`.
- Recurso publicado: `assets/models/flow-sculpture.glb`, 39 696 triángulos, 22 335 vértices, **1 140 332 bytes**.
- Optimización: índices de 32 a 16 bits sin modificar vértices; tres texturas embebidas a 1024 × 1024, WebP calidad 92. Usa `EXT_texture_webp`, soportado por el cargador y los navegadores actuales. Intensidad del mapa de normales ajustada a 0.3 para suavizar el acabado. Reducción del 70 % frente al GLB original de 3 794 976 bytes.

La reconstrucción a partir de una sola imagen interpreta las superficies que no se ven en ella; se conserva la escultura, su material metálico y sus acentos azul/cian, sin prometer una reconstrucción geométrica exacta de las caras ocultas.

## Interacción y accesibilidad

- Mouse: botón principal y arrastre para girar; al soltar, la velocidad acumulada se reduce progresivamente mediante fricción exponencial. El movimiento general del cursor añade una inclinación y un desplazamiento sutiles, separados del giro manual.
- Scroll: el modelo acompaña el avance de la portada con una rotación y un desplazamiento suaves, sin cambiar la orientación elegida al arrastrar ni secuestrar la navegación.
- Touch: arrastre horizontal con inercia al soltar y gesto vertical para seguir leyendo. El zoom del navegador permanece disponible.
- Teclado: flechas para girar y tecla Inicio para restablecer la vista y detener la inercia. Las instrucciones de teclado se conservan para lectores de pantalla.
- El modelo se presenta sin botones de activación, giro o reinicio ni leyenda visible de gestos. El cursor de agarre acompaña el descubrimiento de la interacción.
- El bucle de renderizado termina cuando se asienta el movimiento y se detiene al salir de la zona visible o al ocultar la pestaña. La pausa global y la preferencia de movimiento reducido desactivan la inercia y las respuestas al cursor y al scroll; el arrastre directo y el teclado siguen disponibles.
- Carga fallida, dispositivo sin WebGL o pérdida de contexto: se recupera la imagen. La recuperación de conexión o una nueva entrada en pantalla pueden provocar un reintento automático, con un máximo de dos intentos por visita y sin botones adicionales. Los estados e instrucciones están traducidos a los 20 idiomas del sitio.

## Arquitectura y compilación

`assets/js/hero3d.js` carga dinámicamente el controlador de movimiento `assets/js/hero3d-renderer.js`. Su fuente, `src/hero3d-renderer.js`, mantiene la física, los gestos y la solicitud de fotogramas en el hilo principal. `src/hero3d-backend.js` comunica el estado visual con el motor gráfico.

Cuando el navegador admite Worker y OffscreenCanvas, `src/hero3d-worker.js` ejecuta la escena de Three.js, GLTFLoader y el entorno HDR fuera del hilo de la interfaz. La escena compartida vive en `src/hero3d-scene.js`. Si esas capacidades no están disponibles, se carga esa misma escena de forma dinámica en el hilo principal. La visita descarga la implementación gráfica que corresponde al navegador: el worker o el respaldo, sin cargar ambos en el funcionamiento normal.

La comunicación conserva un único fotograma pendiente de confirmación y el estado visual más reciente. Los eventos rápidos de mouse o scroll actualizan ese estado en lugar de acumular una cola de renderizados atrasados. Three y esbuild tienen versiones exactas en el lockfile; la licencia se conserva en `assets/licenses/three.txt`.

`src/hero3d-environment.js` carga `assets/models/studio-environment.bin.gz`, un mapa HDR precalculado a partir de `RoomEnvironment` de Three.js. Conserva la iluminación y los reflejos del estudio en formato CubeUV, ya filtrado por PMREM. El recurso comprimido ocupa **341 479 bytes** y contiene un atlas de **384 × 512 píxeles RGBA HalfFloat**, con resolución de cara de 128 píxeles. Descomprimido ocupa 1 572 880 bytes, incluida la cabecera de 16 bytes. El cargador admite tanto gzip como una respuesta que el CDN ya haya descomprimido. Así el navegador utiliza el recurso local sin reconstruir el entorno y sus niveles de desenfoque durante la visita.

```bash
npm ci
npm run build:hero3d
```

La compilación produce tres archivos locales: `assets/js/hero3d-renderer.js`, `assets/js/hero3d-worker.js` y `assets/js/hero3d-scene.js`. Se incluyen en Git porque GitHub Pages sirve archivos estáticos sin compilar en el navegador. No se usan servicios remotos para visualizar el modelo. La política CSP permite `blob:` únicamente en imágenes y conexiones para decodificar las texturas embebidas; el worker se carga desde el mismo origen.

Para reproducir el entorno de iluminación:

```bash
node .github/scripts/bake-hero-environment.cjs
```

El script usa por defecto la resolución de cara de 128 píxeles y permite indicar otra resolución y ruta de salida. El código de generación y sus pruebas permanecen en `.github/`, fuera de la publicación estática.

El service worker precachea solamente el controlador ligero y las imágenes. El motor, el GLB y el entorno HDR entran en caché al usarse: no se obliga a descargarlos durante la instalación de la PWA. El HTML, CSS, scripts, modelo, entorno y manifiesto comparten el identificador de release, y la purga automática de Cloudflare se ejecuta después de publicar Pages.

## Verificación

Las pruebas de `hero3d.spec.js` cubren geometría real, inercia tras el arrastre, movimiento del cursor y scroll, teclado, pausa, movimiento reducido, reposo fuera de pantalla y recuperación. `hero-integration.spec.js` prueba la carga automática de la portada con el GLB final bajo la CSP real y el respaldo sin JavaScript. `hero3d-i18n.spec.js` verifica la cobertura de traducciones. Las pruebas de `.github/tests/hero3d-*.test.cjs` comprueban el formato del entorno HDR, la cola y cancelación del worker, y los reintentos de conexión con la pestaña oculta.

La medición local de Lighthouse con perfil móvil y carga automática del modelo obtuvo **99 en rendimiento, 100 en accesibilidad, 96 en buenas prácticas y 100 en SEO**, con LCP de 1.9 s, bloqueo total de 0 ms y CLS de 0.028. Es una medición de laboratorio del release `20261105-hero-fluid-1`, no una garantía para todas las redes y dispositivos. El renderizado en Worker elimina el bloqueo observado al preparar WebGL en el hilo principal; los navegadores que requieren el respaldo pueden tener un coste de carga mayor.

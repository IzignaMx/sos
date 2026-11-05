# Escultura interactiva de portada

La portada conserva la imagen original como presentación inmediata y respaldo. El visor se carga al pulsar «Explorar en 3D»: así la compilación de shaders y la descarga de la malla no penalizan la primera visita, especialmente en móviles lentos. El contenido comercial y la navegación no dependen de WebGL. No se descarga el motor ni la malla sin esta solicitud, también cuando está activado el ahorro de datos.

## Recurso y procedencia

El modelo se generó con **Higgsfield / Tripo H3.1 Image to 3D**, usando la misma escultura que ilustra SOS:

- Imagen de referencia: generación `f7ea176a-8216-4fcf-bfe5-ec95ea2cc787`.
- Modelo: generación `6fe7a6fb-fcff-48a2-99f6-5e4037efc37c`.
- Parámetros: límite de 40 000 caras, geometría detallada, materiales PBR, texturas estándar alineadas con la imagen y orientación `align_image`.
- Recurso publicado: `assets/models/flow-sculpture.glb`, 39 696 triángulos, 22 335 vértices, **1 140 332 bytes**.
- Optimización: índices de 32 a 16 bits sin modificar vértices; tres texturas embebidas a 1024 × 1024, WebP calidad 92. Usa `EXT_texture_webp`, soportado por el cargador y los navegadores actuales. Intensidad del mapa de normales ajustada a 0.3 para suavizar el acabado. Reducción del 70 % frente al GLB original de 3 794 976 bytes.

La reconstrucción a partir de una sola imagen interpreta las superficies que no se ven en ella; se conserva la escultura, su material metálico y sus acentos azul/cian, sin prometer una reconstrucción geométrica exacta de las caras ocultas.

## Interacción y accesibilidad

- Mouse: botón principal y arrastre para girar; mover el cursor sin agarrar no altera el objeto.
- Touch: arrastre horizontal para girar, gesto vertical para seguir leyendo. El zoom del navegador permanece disponible.
- Teclado: flechas para girar y tecla Inicio para restablecer la vista. También hay botones con nombres accesibles y objetivos de 44 px.
- No hay rotación automática, inercia ni bucle de renderizado permanente. La preferencia de movimiento reducido conserva la interacción deliberada.
- Carga fallida, dispositivo sin WebGL o pérdida de contexto: se recupera la imagen y se ofrece reintentar. Los estados e instrucciones están traducidos a los 20 idiomas del sitio.

## Arquitectura y compilación

`assets/js/hero3d.js` carga dinámicamente `assets/js/hero3d-renderer.js`, un módulo local de Three.js y GLTFLoader. La fuente mantenible está en `src/hero3d-renderer.js`. Three y esbuild tienen versiones exactas en el lockfile; la licencia se conserva en `assets/licenses/three.txt`.

```bash
npm ci
npm run build:hero3d
```

El bundle se incluye en Git porque GitHub Pages sirve archivos estáticos sin compilar en el navegador. No se usan servicios remotos para visualizar el modelo. La política CSP permite `blob:` únicamente en imágenes y conexiones para decodificar las texturas embebidas.

El service worker precachea solamente el controlador ligero y las imágenes. El motor y el GLB entran en caché al usarse: no se obliga a descargarlos durante la instalación de la PWA. El HTML, CSS, scripts, modelo y manifiesto comparten el identificador de release, y la purga automática de Cloudflare se ejecuta después de publicar Pages.

## Verificación

Las pruebas de `hero3d.spec.js` cubren geometría real, arrastre, hover, teclado, reposo, ahorro de datos y recuperación. `hero-integration.spec.js` prueba la portada con el GLB final bajo la CSP real y el respaldo sin JavaScript. `hero3d-i18n.spec.js` verifica la cobertura de traducciones.

Validación local de la entrega: Lighthouse móvil **99 rendimiento / 100 accesibilidad / 96 buenas prácticas / 100 SEO**, con bloqueo inicial de 0 ms. El aviso de consola de buenas prácticas corresponde a la conexión de analítica existente en el entorno de pruebas. Pa11y no detectó incidencias AA en escritorio, móvil ni con el visor activado. Se revisaron capturas reales de Chromium y WebKit a 1440 y 390 px, sin errores JavaScript ni desbordamiento horizontal.

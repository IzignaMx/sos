# Validación de la experiencia editorial

Fecha: 4 de noviembre de 2026. Entorno local, servidor estático y navegadores automatizados. Estas mediciones no son resultados del dominio publicado ni garantizan un premio.

## Vista previa

[Antes, escritorio](previews/antes-desktop.png) · [Después, escritorio](previews/despues-desktop.png) · [Después, móvil](previews/despues-mobile.png)

Las capturas finales usan movimiento reducido para mostrar todos los contenidos en una imagen completa. En la experiencia normal los revelados se activan al entrar al viewport, sin alterar el scroll nativo.

## Comprobaciones

- HTML: `npx html-validate index.html`, sin errores. Se declara explícitamente el DOCTYPE en minúsculas para mantener compatibilidad con Prettier.
- Formato: `npm run lint`, aprobado.
- Chromium: 9 pruebas aprobadas. Incluyen control de claridad por teclado, navegación móvil, cambios de idioma, modo sin JavaScript, pausa persistente, preferencia de movimiento reducido reactiva, límite del parallax, almacenamiento denegado y funcionamiento offline real.
- WebKit: las mismas 9 pruebas aprobadas. Las bibliotecas faltantes del entorno se extrajeron localmente, sin modificar el sistema. El servidor de pruebas elimina exclusivamente `upgrade-insecure-requests` de las respuestas HTML HTTP en loopback porque WebKit intenta convertir sus recursos a HTTPS. Conserva el resto de CSP; el HTML de producción no se modifica. Esta suite no valida esa directiva en HTTPS. Lighthouse y Pa11y se ejecutaron contra `serve` con la CSP original.
- Idiomas: 20 catálogos con paridad de las 21 claves editoriales; revisión de ancho a 320 px, incluidos árabe RTL y ruso.
- Pa11y WCAG AA: cero incidencias automáticas en 1440 × 1000 y 390 × 844.
- Revisión visual en Chromium: escritorio y móvil, foco visible, menús y respuestas de interacción.
- Lighthouse móvil local: rendimiento **93**, accesibilidad **100**, buenas prácticas **96**, SEO **100**. LCP 2,8 s; CLS 0; TBT 0 ms. Los fallos de buenas prácticas corresponden a peticiones del Matomo existente bloqueadas por la red del entorno (`ERR_TUNNEL_CONNECTION_FAILED`).
- CI: se incorpora ejecución de las pruebas en Chromium y WebKit para PR y push a main/master. Documentación, pruebas y evidencias quedan excluidas del directorio publicado.

## Evidencia del ciclo de pruebas

Antes de implementar, las pruebas fallaron porque no existía el control de claridad y la navegación móvil estaba oculta. Las pruebas de movimiento fallaron por ausencia del estado `data-motion`. La prueba offline detectó una respuesta redirigida de `/index.html` incompatible con la navegación desconectada; se corrigió el fallback a `/` y la prueba pasó. Lighthouse detectó contraste y nombres accesibles que se corrigieron antes de la medición final.

## Alcance y próximos controles de publicación

La propuesta conserva precios, destinos de reserva, cifras y testimonios existentes; no incorpora resultados de clientes inventados. Los nuevos textos editoriales están traducidos en los 20 idiomas. El resto del copy se refinó en español e inglés; otros idiomas conservan su narrativa anterior.

Antes de enviar a Awwwards: comprobar la versión desplegada en dispositivos reales y con lectores de pantalla, contrastar métricas de campo y revisar la evidencia comercial de las cifras y testimonios existentes. La pieza visual generada no sustituye casos de trabajo verificables. La postulación a premios queda fuera de esta implementación.

## Publicación y caché del CDN

Tras integrar la PR #1 se confirmó el despliegue de GitHub Pages, pero Cloudflare conservaba HTML antiguo y respuestas 404 durante cinco días. Se incorporó una versión común a las URLs de imágenes, estilos, scripts, catálogos, manifiesto y service worker. El precaché y el fallback offline usan esa misma versión. Una prueba adicional simula respuestas 404 del CDN para toda URL no versionada: falló antes de la corrección y pasó después. La suite ampliada aprueba 20 pruebas entre Chromium y WebKit.

Cada entrega que modifique recursos debe usar una versión nueva, sincronizada entre `data-release` del HTML, sus URLs, `manifest.webmanifest` y `RELEASE` de `sw.js`. No consultar URLs de una versión futura antes de desplegarla. La raíz HTML sigue requiriendo purga o una política de caché corta en Cloudflare; versionar recursos no invalida esa página.

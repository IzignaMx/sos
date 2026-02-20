# Lista de Comprobación para PWA (PWA Follow-Up Checklist)

Antes de preparar una nueva versión a producción, los desarrolladores frontend deben asegurar:

- **Orígenes de Iconos (Icon Sources)**: La cabecera (header) y el `manifest.webmanifest` apuntan a referencias estáticas. Toda imagen debe pre-existir en el CDN local (`/assets/img/`) o el bucket productivo.
- **Alcance del Manifiesto (Manifest Scope)**: Si el despliegue de la Landing PWA ocurre en un subdirectorio (ej. `/sos/`), actualiza `start_url` y `scope` en el archivo `manifest.webmanifest` garantizando exactitud.
- **Versionado de Caché (Cache Versioning)**: Modifica activamente las llaves estáticas (`PRECACHE` / `RUNTIME`) al interior de `sw.js` tras inyectar nuevos cambios en tu CSS/JS/Imágenes. Esto obliga una purga de Service Workers en navegadores cliente.
- **Catálogos i18n**: Al incorporar modismos nuevos en `i18n/*.json`, agrégalos manualmente al arreglo temporal `PRECACHE_URLS` para posibilitar navegación a Internet caída (Offline Support).
- **Analítica Diferida (Runtime Analytics)**: Integra toda firma de rastreo (GTM, GA4, Meta Pixel) con estrategias `async` o `defer`. Revisa `workbox-google-analytics` si consideras rastreo de interacciones offline diferidas.
- **Calidad de Pruebas (Testing)**:
  - Sírvase la PWA con `npx serve .` (o tunelizado HTTPS por `ngrok`).
  - Inspecciona validadores W3C: `npx html-validate index.html`.
  - Fuerza una corrida local AA/AAA: `npx pa11y http://localhost:3000`.
  - Emula Lighthouse desde la pestaña "Audits".
- **Comportamiento Offline (Fallback UX)**: Mantener un mensaje HTML pre-cargado amigable cuando recursos no esenciales quiebren y el Service Worker asuma el control.
- [ ] Renderizar y ajustar pantallazos: Reemplaza `/assets/img/og-izigna-sos.png` e imágenes OpenGraph promocionales tras validación móvil (720x1280).

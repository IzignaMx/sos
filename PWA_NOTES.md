# PWA follow-up checklist

- **Icon sources**: La cabecera y el manifest siguen apuntando a iconos alojados en izignamx.com. Sustitúyelos por copias locales en ssets/img/ (o tu CDN definitivo) antes de publicar.
- **Manifest scope**: Si el deploy final vive en un subdirectorio (p. ej. /sos/), actualiza start_url y scope en manifest.webmanifest para que coincidan.
- **Cache versioning**: Incrementa los nombres PRECACHE / RUNTIME en sw.js cada vez que cambies assets críticos (CSS, JSON, capturas) para forzar la actualización en clientes existentes.
- **Language catalog updates**: Cuando agregues o renombres archivos i18n/*.json, inclúyelos en PRECACHE_URLS para mantener soporte offline.
- **Runtime analytics**: Si añades Google Analytics o GTM, cárgalos con sync/defer y considera helpers tipo workbox-google-analytics si deseas replay offline.
- **Testing**: Sirve el sitio vía 
px serve . (HTTPS), verifica el worker en chrome://inspect/#service-workers y ejecuta Lighthouse PWA para confirmar puntuaciones de Installable + Offline.
- **Update prompts**: El toast de actualización ya está integrado; ajusta copy/estilos o lógica de maybeHandleIntent si deseas mensajes personalizados por idioma.
- **Fallback UX**: Si incorporas formularios o media extra, cachea los endpoints relevantes o muestra un mensaje offline para evitar pantallas en blanco.
- [ ] Reemplaza ssets/img/og-izigna-sos.png y ssets/img/pwa-screenshot-mobile.png por capturas reales (1280×720 wide, 720×1280 móvil) y actualiza manifest.webmanifest con tamaños exactos.

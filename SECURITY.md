# Política de Seguridad

## 1. Superficie del proyecto
- Landing estática index.html con CSS/JS inline.
- Catálogos de traducción en i18n/*.json.
- PWA mediante manifest.webmanifest y sw.js.
- Contacto vía enlaces a WhatsApp y correo dgar@izignamx.com.

## 2. Buenas prácticas aplicadas
- Content-Security-Policy restrictiva (solo self, Google Fonts y WhatsApp) para minimizar XSS.
- Permissions-Policy desactiva cámara/micrófono/geolocalización por defecto.
- Cross-Origin-Opener-Policy=same-origin evita ataques cross-window.
- Todos los enlaces con 	arget="_blank" usan el="noopener noreferrer".
- Service worker firmado (sw.js) controla caché y sólo atiende peticiones GET.

## 3. Reporte de vulnerabilidades
- Contacto primario: security@izignamx.com (alias dgar@izignamx.com).
- Respuesta inicial en ≤48h.
- Se agradece incluir pasos de reproducción, impacto estimado y capturas.
- Coordinaremos fecha de divulgación responsable según CVSS/impacto.

## 4. Recomendaciones de despliegue
- Servir únicamente a través de HTTPS (con HSTS y TLS ≥1.2).
- Configurar headers en CDN/hosting: Strict-Transport-Security, Referrer-Policy, Permissions-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- Auditar la PWA en cada release con Lighthouse + OWASP ZAP (pase rápido) si se agregan formularios.
- Rotar accesos temporales provistos por clientes inmediatamente después del cierre de cada misión.

## 5. Dependencias externas
- Google Fonts (onts.googleapis.com, onts.gstatic.com).
- WhatsApp Web (wa.me) únicamente para deep-links (sin embebidos).

Mantén este documento actualizado cuando se incorporen integraciones o formularios adicionales.

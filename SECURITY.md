# Política de Seguridad - IzignaMx Express Landing

## 1. Superficie del Proyecto

El proyecto consta de las siguientes áreas expuestas:

- **Frontend PWA**: Landing estática (`index.html`), archivos de internacionalización integrados (`i18n`), rutinas asíncronas de diseño en `assets/js/` y caché mediante "Service Worker" (`sw.js`).

## 2. Buenas Prácticas Aplicadas

### En Frontend (PWA)

- Política **Content-Security-Policy (CSP)** estricta, limitando orígenes a uno mismo (`self`), fuentes de Google y conexiones a WhatsApp para minimizar el riesgo de ataques XSS.
- Política de permisos (**Permissions-Policy**) que desactiva explícitamente el uso de cámara, micrófono y geolocalización por defecto en todo el flujo de lead capture.
- Configuración anti ataques de ventana cruzada empleando **Cross-Origin-Opener-Policy=same-origin**.
- El Service Worker (`sw.js`) solo tramitará peticiones GET para servir caché sin corromper el estado del almacenamiento persistente.

### Prácticas de Aislamiento y Headers (Despliegue GitHub Pages)

- **Gestión Estricta CSP**: Reducción de inyección mediante control de `Content-Security-Policy`.
- **Mitigación CORS y Cookies**: Dado que no existe una API de Node local ni recolección de base de datos directa en este repositorio, se reducen enormemente vectores de CSRF (Cross-Site Request Forgery).

## 3. Reporte de Vulnerabilidades

- **Contacto Primario**: <dgar@izignamx.com> (o el alias designado de `security@`).
- **Tiempo Pruebas Internas**: Respuesta general inicial en ≤48 horas.
- Solicitamos por favor incluir evidencias sólidas (capturas, logs) y pasos de reproducción de forma confidencial.

## 4. Recomendaciones de Despliegue Seguro Continuo

- Servir siempre bajo HTTPS (con HSTS / TLS ≥ 1.2 o superior).
- Integrar cabeceras complementarias en el Proxy/CDN/Servidor NGINX (ej. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- Correr OWASP ZAP junto con validaciones Lighthouse como parte obligatoria del Check-CI para prevenir brechas tempranas tras agregar formularios.
- La PII recabada localmente solo se conserva el ciclo de vida de la misión activa y se rota tras 45 días (Políticas de Retención Data-Lifecycle).

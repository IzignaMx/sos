# Política de Seguridad - IzignaMx Express & WhatsApp Bot

## 1. Superficie del Proyecto

El proyecto consta de las siguientes áreas expuestas:

- **Frontend PWA**: Landing estática (`index.html`), archivos de internacionalización (`i18n`), y "Service Worker" (`sw.js`).
- **Backend API (Node.js)**: Servicio Webhook para Meta Cloud API.
- **Infraestructura de Datos e IA**: Instancia PostgreSQL, Redis, y Servidor de Inferencia Ollama (LLM) auto-hospedado.

## 2. Buenas Prácticas Aplicadas

### En Frontend (PWA)

- Política **Content-Security-Policy (CSP)** estricta, limitando orígenes a uno mismo (`self`), fuentes de Google y conexiones a WhatsApp para minimizar el riesgo de ataques XSS.
- Política de permisos (**Permissions-Policy**) que desactiva explícitamente el uso de cámara, micrófono y geolocalización por defecto en todo el flujo de lead capture.
- Configuración anti ataques de ventana cruzada empleando **Cross-Origin-Opener-Policy=same-origin**.
- El Service Worker (`sw.js`) solo tramitará peticiones GET para servir caché sin corromper el estado del almacenamiento persistente.

### En Backend y DevOps (Docker & Node)

- **Gestión de Secretos**: Los secretos se manejan externamente en variables de entorno (archivos `.env` exluidos de git) utilizando herramientas consolidadas (Vault o variables de GH Actions en CI/CD).
- **Protección de Puertos**: El puerto `11434` (Ollama) está bloqueado para tráfico de la red exterior mediante cortafuegos (UFW) garantizando acceso exclusivo en la IP local al contenedor `message-processor`.
- **Límites de Tasa (Rate Limiting)**: Las APIs de Webhook integran el módulo `express-rate-limit` mitigando DoS y ataques de retransmisión de fuerza bruta.
- **Protección de Datos en Reposo**: Integración prospectiva con cifrado a nivel de fila (`pgcrypto`) en PostgreSQL para almacenar logs de chat y campos de PII (Información Personalmente Identificable).

## 3. Reporte de Vulnerabilidades

- **Contacto Primario**: <dgar@izignamx.com> (o el alias designado de `security@`).
- **Tiempo Pruebas Internas**: Respuesta general inicial en ≤48 horas.
- Solicitamos por favor incluir evidencias sólidas (capturas, logs) y pasos de reproducción de forma confidencial.

## 4. Recomendaciones de Despliegue Seguro Continuo

- Servir siempre bajo HTTPS (con HSTS / TLS ≥ 1.2 o superior).
- Integrar cabeceras complementarias en el Proxy/CDN/Servidor NGINX (ej. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- Correr OWASP ZAP junto con validaciones Lighthouse como parte obligatoria del Check-CI para prevenir brechas tempranas tras agregar formularios.
- La PII recabada localmente solo se conserva el ciclo de vida de la misión activa y se rota tras 45 días (Políticas de Retención Data-Lifecycle).

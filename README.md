# Arreglos Express Landing

## Overview
Arreglos Express (IzignaMX) es una landing page futurista enfocada en convertir leads de Shopify, BigCommerce y WordPress dentro de ventanas express de 24-72h. El sitio prioriza microanimaciones de alto impacto, estética dark y CTAs inmediatos (WhatsApp, agenda, diagnóstico).

## Estructura del proyecto
- `index.html`: landing principal con CSS/JS inline. Las secciones se agrupan por comentarios (hero, servicios, casos, precios, FAQ, contacto) para facilitar edición.
- `i18n/*.json`: diccionarios por idioma consumidos desde `languageMap` y `fetch` dinámico.
- `AGENTS.md`, `OPERATIONS.md`, `SLAS.md`, `TEMPLATES.md`: pautas de contribución, operación, SLAs y plantillas de Notion/CRM.

## Desarrollo local
Inicia un servidor estático antes de validar idiomas o animaciones:
```
npx serve .
# o
python -m http.server 4000
```
Visualiza en el puerto indicado (3000 en serve, 4000 en Python).

## Controles de calidad
```
npx html-validate index.html
npx prettier@latest index.html --check
npx pa11y http://localhost:3000
```
`html-validate` asegura la estructura, `prettier` mantiene sangrías y atributos ordenados, y `pa11y` garantiza WCAG AA. Ejecuta pa11y con el sitio servido.

## Internacionalización
El selector en el header usa `[data-lang-toggle]` y el objeto `languageMap`. Para añadir un idioma:
1. Crea `i18n/<lang>.json` replicando las llaves de `en.json`.
2. Registra el idioma en `languageMap` con etiqueta y clase `.lang-flag--*` más su SVG.
3. Agrega la opción al dropdown con `aria-label` localizado y ajusta CTAs regionales si cambian.
Sirve el sitio y recorre cada idioma validando textos dinámicos y enlaces (mailto, WhatsApp).

## Pautas de contenido y UX
Conserva el tono neon-futurista, la retícula responsiva y la coreografía de animaciones on-scroll. Alinea hero, pruebas sociales y copys con lo descrito en `OPERATIONS.md` y `SLAS.md`. Documenta parámetros de nuevas animaciones (duración, easing, propósito) en comentarios o anexos.

## Playbooks operativos
- `AGENTS.md`: flujo para contribuidores y convenciones de código.
- `OPERATIONS.md`: captación de leads, cadencia promocional y ejecución de misiones.
- `SLAS.md`: SLAs de comunicación, tiempos de respuesta y métricas mínimas.
- `TEMPLATES.md`: plantillas de Notion/CRM para pipeline, diagnósticos y seguimientos.

## Despliegue
Hospeda en Netlify, Vercel o S3/CloudFront. Mantén `i18n/*.json` con `cache-control` corto durante traducciones y extiende luego. Revisa meta tags/OG al cambiar campañas y actualiza WhatsApp o Cal.com cuando roten responsables.

Contribuye usando Conventional Commits y adjunta comparativas visuales en los PRs según `AGENTS.md`.

# Guías del Repositorio e Interacción con Agentes

## Estructura del Proyecto y Organización de Módulos

El sitio consiste en una página de destino (landing page) de una sola página almacenada en `index.html`. El CSS integrado (inline) se encuentra dentro del bloque `<style>` cerca del `head`; los cambios deben agruparse por marcadores de comentarios (ej., `/* hero */`) y mantenerse en orden.

**Nuevas funcionalidades** deben priorizar la carpeta `assets/` para los recursos compartidos, mientras que el bot de backend debe alojarse modularmente en la carpeta `/whatsapp-bot`. Toda la documentación, incluyendo las notas, variables, y scripts, debe estar escrita y comentada en **Español** para mantener coherencia, utilizando `<!-- EN -->` solo como auxiliar si es necesario referenciar APIs externas.

## Comandos de Compilación, Pruebas y Desarrollo

- **PWA (Frontend)**: Usa `npx serve .` para montar una vista previa estática en `http://localhost:3000`. También funciona `python -m http.server 4000` para iteraciones rápidas.
- **Formateo**: Ejecuta `npx prettier@latest "**.html" "**.md" --check` antes de subir código. Usa flag `--write` para auto-corregir derivas menores.
- **Backend (Node)**: Para los servicios del bot, asegúrate de estar ejecutando los entornos controlados con `docker-compose up -d`.

## Lineamientos de Codificación y TDD (Test-Driven Development)

**Absolutamente ningún código de producción sin una prueba que falle primero.**
Debemos seguir estrictamente la regla de "Red-Green-Refactor" detallada por nuestros principios de `senior-architect` y `test-driven-development`.

1. **Red**: Escribe la prueba. Mira cómo falla.
2. **Green**: Escribe el código mínimo necesario para superarla.
3. **Refactor**: Mejora y consolida según Patrones de Diseño limpios (SOLID, DRY).

Para el Frontend, formatea el HTML con una sangría de dos espacios (2 spaces). Prefiere siempre etiquetas semánticas (`<section>`, `<main>`) sobre divs genéricos y mantén etiquetas `aria-label` en Español. Para el backend (Node.js/TypeScript), fomenta uso de tipados, Linter estricto y abstracciones simples.

## Desarrollo de Agentes e IAs (Agent Development)

Cualquier sub-agente, IA o herramienta que actúe sobre este repositorio debe seguir el formato de "YAML frontmatter" en sus descripciones (según las guías de `Agent Development`).

1. **Contexto Claro**: Especifica claramente en los prompts el `name`, `description` y `triggering conditions` en español.
2. **Inyección de Dependencias**: Agentes que generan código (`code-reviewer`, `test-generator`) deben asegurar responsabilidades únicas y adherirse a la Arquitectura Centralizada (`ARCHITECTURE.md`).

## Guías de Pruebas Adicionales

Valida manualmente la visualización de la PWA en navegadores Chromium y WebKit.
Usa `npx html-validate index.html` para problemas estructurales y `npx pa11y http://localhost:3000` para garantizar cumplimiento de accesibilidad (AA). Mantén métricas completas de Lighthouse >90. Las excepciones deben quedar documentadas.

## Commits y Pull Requests

- Usar **Conventional Commits** (`feat:`, `fix:`, `style:`, `docs:`). Ej. `docs: consolida arquitectura general B2B`.
- Los Pull Requests deben describir el objetivo, incluir vistas previas antes/después si hay cambios visuales, o evidencia de que las pruebas automatizadas pasaron en caso de tocar back-end.

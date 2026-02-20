# IzignaMx Express Landing & WhatsApp AI Bot

## Resumen Ejecutivo

IzignaMx (Arreglos Express) es una plataforma dual compuesta por una Landing Page estática altamente optimizada (enfocada en conversiones B2B) y un backend de automatización conversacional vía WhatsApp propulsado por Modelos de Lenguaje (LLMs) auto-hospedados.
Nuestra arquitectura prioriza la velocidad (TTI casi instantáneo), la privacidad (procesamiento de IA local), y las micro-animaciones de alto impacto visual.

## Estructura del Proyecto

Toda la documentación arquitectónica está consolidada en `ARCHITECTURE.md`.

- `index.html`: La PWA/Landing principal con CSS/JS en línea para máximo rendimiento (Lighthouse ~100).
- `whatsapp-bot/`: Backend Node.js de orquestación conversacional, Redis, PostgreSQL y motor LLM (Ollama).
- `i18n/*.json`: Archivos de diccionario para soporte multi-idioma.
- `assets/`: Recursos compartidos e iconografía.

## Guías de Referencia Obligatorias

Antes de realizar cualquier contribución, debes consultar:

- [**ARCHITECTURE.md**](ARCHITECTURE.md): La fuente de verdad sobre el diseño del sistema.
- [**AGENTS.md**](AGENTS.md): Cómo interactuar con el código, aplicar TDD y directrices para agentes IA.
- [**SECURITY.md**](SECURITY.md): Políticas de seguridad y dependencias aprobadas.
- [**DEPLOYMENT_GUIDE.md**](DEPLOYMENT_GUIDE.md) y [**OPERATIONS.md**](OPERATIONS.md): Guías operativas.

## Desarrollo Local PWA (Frontend)

Inicia un servidor estático para validar idiomas o animaciones:

```bash
npx serve .
# o
python -m http.server 4000
```

### Controles de Calidad (Frontend)

```bash
npx html-validate index.html
npx prettier@latest "**.html" --check
npx pa11y http://localhost:3000
```

## Desarrollo Local Bot (Backend)

Ver las instrucciones completas en `whatsapp-bot/README.md`.
Generalmente:

```bash
cd whatsapp-bot
docker-compose up -d
```

## Prácticas de Ingeniería

Este repositorio sigue de forma estricta:

- **TDD (Test-Driven Development)**: No escribimos código de producción sin una prueba fallida ("RED") inicial.
- **Agent-Driven Development**: Estructura de código pensada para ser mantenida por desarrolladores e IAs en colaboración.
- **Conventional Commits**: Usamos `feat:`, `fix:`, `docs:`, etc.

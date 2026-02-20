# IzignaMx Express Landing

## Resumen Ejecutivo

IzignaMx (Arreglos Express) es una plataforma estructurada como una Landing Page estática altamente optimizada (enfocada en conversiones B2B y B2C).

Nuestra arquitectura prioriza la velocidad (TTI casi instantáneo mediante la carga estática de recursos inline), accesibilidad estricta y micro-animaciones de alto impacto visual.

## Estructura del Proyecto

Toda la documentación arquitectónica está consolidada en `ARCHITECTURE.md`.

- `index.html`: La PWA/Landing principal con CSS/JS en línea para máximo rendimiento (Lighthouse ~100).
- `i18n/*.json`: Archivos de diccionario estáticos para soporte multi-idioma.
- `assets/`: Recursos compartidos e iconografía.

## Guías de Referencia Obligatorias

Antes de realizar cualquier contribución, debes consultar:

- [**ARCHITECTURE.md**](ARCHITECTURE.md): La fuente de verdad sobre el diseño del sistema estático.
- [**AGENTS.md**](AGENTS.md): Cómo interactuar con el código, aplicar TDD y directrices para colaboradores/agentes IA.
- [**SECURITY.md**](SECURITY.md): Políticas de seguridad enfocadas en el frontend (CSPs y protecciones API).

## Desarrollo Local

Inicia un servidor estático para validar idiomas o animaciones:

```bash
npx serve .
# o
python -m http.server 4000
```

### Controles de Calidad

```bash
npx html-validate index.html
npx prettier@latest "**.html" --check
npx pa11y http://localhost:3000
```

## Prácticas de Ingeniería

Este repositorio sigue de forma estricta:

- **TDD (Test-Driven Development)**: No escribimos código de producción sin una prueba fallida ("RED") inicial.
- **Agent-Driven Development**: Estructura de código pensada para ser mantenida por desarrolladores e IAs en colaboración.
- **Conventional Commits**: Usamos `feat:`, `fix:`, `docs:`, etc.

# IzignaMx Express Landing

## Resumen Ejecutivo

IzignaMx (Arreglos Express) es una plataforma estructurada como una Landing Page estática altamente optimizada (enfocada en conversiones B2B y B2C).

La experiencia editorial conserva carbón, azul, cian, isotipo y tipografía Aileron de IzignaMx, con una pieza escultórica original creada con Higgsfield. Prioriza lectura, navegación accesible y movimiento breve bajo demanda.

## Estructura del Proyecto

Toda la documentación arquitectónica está consolidada en `ARCHITECTURE.md`.

- `index.html`: La PWA/Landing principal con HTML semántico y recursos CSS/JS compartidos, sin framework de cliente.
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

## Experiencia editorial

- [Identidad y activos públicos de IzignaMx](docs/IDENTIDAD-IZIGNAMX.md).
- [Recorrido visual y contrato de scroll](docs/CONTRATO-RECORRIDO.md).
- [Estrategia de conversión y fuentes](docs/ESTRATEGIA-CONVERSION.md).
- [Dirección y referencia Form & Flow](docs/REFERENCIA-VISUAL.md).
- [Validación, capturas y límites de entrega](docs/VALIDACION-VISUAL.md).
- [Procedencia del recurso Higgsfield](docs/RECURSOS-VISUALES.md).
- `npm test`: pruebas de interacción, idiomas, movimiento y PWA en Chromium y WebKit. Instala navegadores con `npx playwright install --with-deps chromium webkit`.

## Publicación y caché

Después de una publicación exitosa de GitHub Pages, el workflow `cloudflare-cache.yml` purga únicamente `sos.izignamx.com` y comprueba la versión de la portada. También admite ejecución manual. Configuración: secret `CLOUDFLARE_API_TOKEN` y variable `CLOUDFLARE_ZONE_ID`. Consulta [configuración, permisos y reejecución](docs/CLOUDFLARE-CACHE.md).

Las pruebas de esta automatización se ejecutan con `node --test .github/tests/*.test.cjs`, sin credenciales ni solicitudes reales.

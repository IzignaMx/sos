# Arquitectura del Sistema - IzignaMx Express Landing

## Índice

- [Visión General](#visión-general)
- [Dominios Clave](#dominios-clave)
- [Decisiones de Diseño (ADRs)](#decisiones-de-diseño-adrs)
- [Prácticas de Desarrollo (TDD & Clean Code)](#prácticas-de-desarrollo-tdd--clean-code)

---

## Visión General

El sistema se compone exclusivamente de la **PWA Landing Page (Frontend)**. Un sitio estático, optimizado para altísimo rendimiento, con una identidad editorial propia de SOS dentro de IzignaMx (carbón, azul, cian, isotipo original y Aileron local). Construido con HTML semántico y CSS/JS compartidos en `assets/` para lograr velocidades de carga óptimas, e incluye soporte offline garantizado a través de Web Workers (Progressive Web App).

Su propósito central es servir como el principal embudo de captación de leads (B2B/B2C) maximizando la tasa de conversión a través del perfomance y la accesibilidad.

---

## Dominios Clave

### 1. Aplicación Cliente (Frontend)

- **Express Landing (PWA)**: Interfaz estática, 100% responsiva (Mobile-First) y optimizada bajo los estrictos estándares de accesibilidad (WCAG AA).
- **Internacionalización (i18n)**: Arquitectura idiomática basada en diccionarios JSON estáticos cargados asíncronamente según prefijos de URL o configuración del navegador, ofreciendo soporte global sin impacto en la carga inicial.
- **Service Workers**: Estrategia de caché "Cache-First" o "Stale-While-Revalidate" para activos primarios, asegurando que la primera carga sea la única necesaria para interacción offline.

---

## Decisiones de Diseño (ADRs)

1. **PWA Estática Pura**: La landing prioriza radicalmente el TTI (Time to Interactive). Se utilizan recursos inline limitados al _above-the-fold_, prescindiendo por completo de frameworks SPAs pesados (como React, Angular o Next.js) en el lado del cliente público para garantizar métricas Lighthouse consistentes de ~100/100/100/100.
2. **Independencia de Backend Contenerizado**: Toda lógica de base de datos, bots de inteligencia artificial (WhatsApp bots) o APIs de procesamiento pesado ha sido desacoplada en infraestructuras y repositorios externos (SaaS). Esta PWA no ejecuta consultas a bases de datos ni lógicas de back-end internas, actuando exclusivamente como un recolector y visor optimizado de prospectos.
3. **Despliegue GitHub Pages (gh-pages)**: El proyecto se compila y lanza hacia la rama `gh-pages` vía pipelines automatizadas de GitHub Actions, lo que reduce a $0 el costo de despliegue, entrega escalabilidad por medio de la CDN de GitHub y provee soporte nativo HTTPS.

---

## Prácticas de Desarrollo (TDD & Clean Code)

En esta plataforma se asumen las directrices conjuntas de un **Senior Architect**, **Senior Frontend** y la disciplina **Test-Driven Development (TDD)**:

### 1. No hay Producción Sin Pruebas (Red-Green-Refactor)

- **RED**: Toda característica nueva de UI o corrección de error de renderizado empieza escribiendo una prueba funcional/E2E mínima (Ej. Playwright). Validar que falla.
- **GREEN**: Escribir el HTML/CSS/JS estrictamente necesario para que pase.
- **REFACTOR**: Optimizar, aplicar Patrones de Diseño Frontend (BEM para CSS, modularidad sin bloqueos para JS), limpiando la deuda.

### 2. Estándares Frontend

- **Accesibilidad Primero**: Auditorías automáticas obligatorias; todo elemento interactivo requiere trazabilidad por teclado y screen-readers.
- **Calidad de Código**: Linter estricto, Prettier (Plugin MD/HTML/JS) para formateo unificado.
- **Modularidad Ligera**: Scripts Vanilla JS divididos por responsabilidad (`sw.js`, optimizadores de imágenes o animadores de GPU) sin bloquear el _main thread_.

### 3. Desarrollo Orientado a Agentes (Agent-Driven)

Al escribir nuevas actualizaciones o scripts, se usarán prompts y descripciones de contexto claros (`name`, `description`, `system prompt` como en `AGENTS.md`) para ayudar a herramientas automatizadas y a LLMs a contribuir con la UI de forma segura, respetando los estándares estéticos y operativos del frontend.

## Experiencia editorial (noviembre de 2026)

`assets/css/editorial.css` centraliza los tokens y la composición responsive. `editorial.js` controla revelados, parallax y una secuencia SVG de tres etapas por scroll bajo demanda, con un único RAF, pausa persistente y preferencia de movimiento reducido. `laboratory.js` implementa una demostración conceptual mediante un rango nativo. `service-guide.js` recomienda un servicio a partir de una necesidad elegida, tomando títulos, alcance, precio y plazo de las tarjetas existentes. No requiere backend ni almacena datos personales. La simulación GPU anterior ya no se carga desde la landing; sus archivos se conservan como legado. Los contadores se muestran estáticos para evitar animaciones adicionales.

Los 20 diccionarios incorporan el bloque `editorial`; el HTML inicial conserva el contenido español para funcionar sin JavaScript. La nueva versión del service worker precachea estilos, scripts y derivados WebP de la escultura. El fallback de navegación usa la raíz con query de versión para evitar respuestas redirigidas de `/index.html` y recursos obsoletos del CDN. Se precachean las dos fuentes locales y el isotipo.

## Precios según el idioma

Los importes base de las cuatro tarjetas siguen siendo 1200, 1500, 1200 y 1800 MXN. `assets/js/pricing.js` muestra esos valores sin cambios en español y los convierte a USD en los otros 19 idiomas. Usa `Intl.NumberFormat` con código de moneda explícito y una plantilla traducida; la nota del catálogo identifica los importes como aproximados y mantiene la confirmación del precio final antes de empezar. El selector de servicios escucha `sos:priceschange` para actualizar también la recomendación.

Al activar un idioma distinto del español, el navegador consulta [Frankfurter v2](https://api.frankfurter.dev/v2/rates?base=MXN&quotes=USD), una API pública con CORS y sin clave. No se envían credenciales ni referente. La consulta tiene un límite de tres segundos y se comparte entre cambios de idioma; no necesita servidor propio ni un workflow programado en GitHub Pages. El resultado validado se conserva durante 24 horas en `sos-usd-rate-v1`. La validación exige el par MXN/USD, una tasa numérica entre 0.02 y 0.15, una fecha ISO real de hasta siete días y no más de un día en el futuro. Esto admite fines de semana sin aceptar datos indefinidamente antiguos. Los intentos fallidos tienen una pausa mínima de un minuto, sin consultas periódicas en segundo plano.

Si la API falla, se usa la última referencia válida de hasta siete días; sin ella se aplica el respaldo verificado del 5 de noviembre de 2026: **1 MXN = 0.053738 USD**. Ese respaldo también está incluido en los catálogos traducidos: aproximadamente 64.49, 80.61, 64.49 y 96.73 USD. Los importes en USD son orientativos y no sustituyen una cotización acordada. Una respuesta tardía no cambia la moneda si el visitante ya volvió al español. Las traducciones también descartan respuestas de selecciones anteriores. El HTML sin JavaScript mantiene los importes originales en español/MXN y los datos estructurados describen esa tarifa base.

## Escultura 3D de portada

La portada usa un GLB derivado de la imagen original mediante Higgsfield. `hero3d.js` carga automáticamente el motor local de Three.js y la malla cuando la escultura está visible, después del primer pintado de la imagen. El respaldo se conserva ante errores o dispositivos incompatibles. El renderer combina arrastre con inercia, respuesta sutil al cursor y al scroll, y acceso por teclado; no usa el parallax de `editorial.js`. La pausa global y la preferencia de movimiento reducido suspenden la inercia y el movimiento ambiental, manteniendo el control manual. El modelo se presenta sin botones ni leyenda visible de gestos; las instrucciones de teclado se conservan para lectores de pantalla. El scroll vertical y el zoom del navegador permanecen disponibles en touch. El renderizado termina al asentarse el movimiento y se suspende fuera de pantalla o con la pestaña oculta. Un entorno HDR local precalculado evita generar PMREM durante la visita. El motor, el GLB y el entorno no forman parte de la precarga obligatoria de la PWA. La procedencia, compilación y criterios de accesibilidad se documentan en [HERO-3D.md](docs/HERO-3D.md).

La física y los eventos permanecen en `src/hero3d-renderer.js`; `src/hero3d-backend.js` conecta ese controlador con la escena. En navegadores compatibles, `src/hero3d-worker.js` ejecuta Three.js, GLTFLoader y el renderizado mediante OffscreenCanvas fuera del hilo de la interfaz. `src/hero3d-scene.js` comparte la implementación gráfica con el respaldo que se importa de forma dinámica cuando no hay soporte. Sólo se descarga la implementación necesaria en una visita normal. La comunicación mantiene un único fotograma pendiente y reemplaza el estado intermedio por el más reciente para evitar acumular trabajo durante los gestos. La compilación produce tres bundles locales: renderer, worker y escena de respaldo.

El acabado de la escultura usa pigmentos por vértice y materiales PBR, con superficie suavizada y normales continuas. El estudio HDR propio se precalcula a resolución de cara 256. El visor admite densidad hasta 2×, limitada a 1.6 millones de píxeles por fotograma. Los scripts de refinamiento del GLB y generación de iluminación se conservan en `.github/scripts/`, fuera de GitHub Pages.

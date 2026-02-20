# Arquitectura del Sistema - IzignaMx Express Landing

## Índice

- [Visión General](#visión-general)
- [Dominios Clave](#dominios-clave)
- [Decisiones de Diseño (ADRs)](#decisiones-de-diseño-adrs)
- [Prácticas de Desarrollo (TDD & Clean Code)](#prácticas-de-desarrollo-tdd--clean-code)

---

## Visión General

El sistema se compone exclusivamente de la **PWA Landing Page (Frontend)**. Un sitio estático, optimizado para altísimo rendimiento, con un enfoque visual "neon-futurista". Construido con HTML semántico, CSS/JS inline/minimalista para lograr velocidades de carga óptimas, e incluye soporte offline garantizado a través de Web Workers (Progressive Web App).

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

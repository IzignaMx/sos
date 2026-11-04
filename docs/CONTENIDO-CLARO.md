# Contenido comprensible sin conocimientos técnicos

Entrega `20261104-contenido-1`. La página debe permitir responder cuatro preguntas: qué hace SOS, cuándo me sirve, qué recibo y cómo empiezo.

## Primera lectura

La portada presenta «Arreglos y mejoras para tu tienda online» y tres señales reconocibles: tarda en abrir, tiene errores o comprar es complicado. El selector y las soluciones aparecen antes del recorrido artístico. Las animaciones y la identidad IzignaMx se conservan.

| Antes                   | Ahora                        |
| ----------------------- | ---------------------------- |
| Velocidad + diseño      | Una tienda más rápida        |
| Seguridad + limpieza    | Un WordPress más seguro      |
| Auditoría Flash 360°    | Saber qué conviene mejorar   |
| Checkout sin fricción   | Un pago más sencillo         |
| Reservar                | Consultar por WhatsApp       |
| Enviar brief por correo | Prefiero escribir por correo |

Cada tarjeta mantiene visibles la finalidad, la entrega resumida, el precio inicial, el plazo y el contacto. Los entregables se amplían con «Qué incluye», un desplegable HTML nativo que también funciona sin JavaScript. Las cifras de experiencia y las citas completas se consultan a petición; las palabras atribuidas a clientes permanecen intactas.

## Precisión comercial

Se conservan los cuatro servicios, sus importes, monedas, plazos y destinatarios de contacto. La revisión entrega recomendaciones y una propuesta visual; aplicarlas requiere acordar ese trabajo. Los otros tres servicios incluyen cambios dentro de lo acordado. Se mantiene explícitamente el límite de hasta tres mejoras en el servicio de pago.

La primera conversación pide enlace y explicación del problema. Los accesos se solicitan después, según la necesidad. Los precios finales, lo incluido y la fecha se confirman antes de empezar. Las preguntas frecuentes explican el alcance, los plazos y cómo comprobar los cambios. No se añaden resultados, garantías ni testimonios.

## Idiomas y consistencia

La revisión se aplica a los 20 idiomas, incluidos mensajes prellenados de WhatsApp y asuntos del correo. HTML inicial, metadatos y datos estructurados reflejan la oferta española; los catálogos conservan el contenido localizado. Las nuevas preguntas y los controles comparten claves en todos los catálogos. La actualización de textos no altera la lógica del selector, que sigue leyendo la tarjeta correspondiente.

Las imágenes sociales/PWA se actualizan para mostrar el nuevo titular. La versión común de recursos y caché evita mezclar entregas.

## Comprobación de comprensión

Revisión editorial y visual: identificar un servicio para una tienda lenta, distinguir una revisión de un trabajo aplicado, encontrar precio/plazo sin abrir detalles y explicar qué sucede al pulsar el contacto. Las comprobaciones automatizadas cubren orden del contenido, teclado y acceso a los detalles sin JavaScript; no sustituyen una prueba de comprensión con personas ajenas al proyecto.

## Evidencia de esta entrega

[Antes](previews/marca-desktop.png) · [Después, escritorio](previews/contenido-desktop.png) · [Después, móvil](previews/contenido-mobile.png)

- 50 pruebas aprobadas entre Chromium y WebKit. Las nuevas pruebas fallaron al principio por el orden anterior de las secciones y la ausencia de desplegables; ahora comprueban precio/plazo siempre visibles, apertura con teclado y acceso sin JavaScript.
- Los 20 catálogos tienen las 127 claves revisadas. Se compararon contra la entrega anterior: precios, plazos, monedas, destinatarios y citas permanecen intactos; sólo cambian las claves previstas.
- Revisión a 320 px en los 20 idiomas, con la recomendación seleccionada y los detalles abiertos/cerrados: sin desbordamiento horizontal. El selector muestra el título del catálogo del idioma activo.
- Pa11y AA: cero incidencias automáticas en 1440 × 1000 y 390 × 844.
- Lighthouse móvil local: 99 rendimiento, 100 accesibilidad, 96 buenas prácticas, 100 SEO. LCP 2,0 s, CLS 0,028, TBT 0 ms. La excepción de buenas prácticas sigue siendo Matomo inaccesible desde la red del entorno. Son mediciones de laboratorio.
- HTML, formato y `git diff --check` correctos. La revisión editorial independiente no encontró contradicciones entre las tarjetas, las preguntas y los datos estructurados.

La cifra aislada «72h» se retiró de la portada. Los plazos de cada servicio siguen visibles en sus tarjetas y se describen como estimados hasta confirmar fecha y condiciones.

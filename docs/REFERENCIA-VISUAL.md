# Referencia visual y adaptación para SOS

Fecha de la revisión: 4 de noviembre de 2026.

Referencia: [Form & Flow](https://github.com/CripterHack/form-and-flow), revisión
`92746fec9323fe604faa57327effb47ca99e3aa6`.

Este documento describe la dirección elegida y sus criterios de implementación.
No sustituye el registro de pruebas ni afirma que todas las comprobaciones estén
completadas.

## Intención y dirección propia

SOS atiende a quien necesita recuperar la claridad, velocidad o funcionamiento
de su comercio electrónico. La primera pantalla debe explicar esa ayuda y
permitir iniciar una conversación sin recorrer toda la página.

La dirección es **un taller de rescate digital**: papel cálido, tinta oscura y
rojo de señal. Una escultura metálica reparada, desarrollada con Higgsfield,
representa el trabajo de detectar una fractura, intervenir con precisión y
devolver continuidad. La composición combina una escala tipográfica expresiva
con anotaciones pequeñas, líneas de construcción y espacios amplios. El carácter
artesanal procede de decisiones de material, proporción y composición, no de
añadir decoración a cada componente.

El rojo señala acciones y puntos de intervención. El papel da espacio a la
lectura; la tinta organiza la información. Las superficies oscuras introducen
pausas en la narrativa. Los valores definitivos de color, tipografía y movimiento
deben vivir en las variables del proyecto para que los ajustes sean coherentes.

## Métodos del referente aplicados al proyecto

| Método de Form & Flow                                             | Evidencia concreta                                                                                                                                                           | Adaptación para SOS                                                                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Definir visitante, necesidad y siguiente acción antes de decorar  | `direction-1` en [workflows.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/workflows.js#L12)                        | Explicar el rescate de eCommerce y mantener visible el acceso a diagnóstico o contacto.                                                                      |
| Traducir referencias a reglas y un gesto distintivo               | `direction-2` y `direction-3` en [workflows.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/workflows.js#L18)        | Usar material metálico intervenido y una señal roja como identidad; tipografía y composición propias.                                                        |
| Alternar escala, densidad y alineación sobre una retícula estable | `editorial-2` en [workflows.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/workflows.js#L126)                       | Cambiar el ritmo entre portada, servicios, demostración y proceso; evitar que todas las secciones sean la misma cuadrícula de tarjetas.                      |
| Hacer que las imágenes profundicen la historia                    | `editorial-3` en [workflows.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/workflows.js#L132)                       | La escultura expresa reparación. Las palabras, precios y controles siguen siendo HTML seleccionable y accesible.                                             |
| Dar a cada transición una función                                 | `motion-1` a `motion-4` en [workflows.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/workflows.js#L46)              | Mostrar progresión, relación entre piezas o respuesta a una acción. Evitar esperas para poder leer o pulsar un enlace.                                       |
| Relacionar una entrada del visitante con una respuesta visible    | Control de frecuencia en [style-experience.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/style-experience.js#L136) | Un laboratorio visual puede explicar cómo cambia una composición al intervenir. Debe declararse demostración, sin atribuirle resultados comerciales medidos. |
| Documentar comportamiento y decisiones junto al diseño            | `system-4` en [workflows.js](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/workflows.js#L104)                          | Conservar reglas de movimiento, procedencia de recursos, límites de accesibilidad y resultados de comprobación.                                              |

## Movimiento y rendimiento

La función `mountStyleExperience` del referente proporciona técnicas útiles,
no una dependencia necesaria para SOS:

- [Estado y prioridad de preferencias](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/style-experience.js#L34): combina preferencia del sistema, pausa manual y tipo de puntero. En SOS, la pausa debe gobernar todos los efectos decorativos y `prefers-reduced-motion` debe tener prioridad.
- [Trabajo acotado](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/style-experience.js#L76): interpola cambios con distancia limitada, omite medios fuera de la vista y solicita otro fotograma sólo mientras hay un cambio pendiente. SOS debe usar un propietario claro del movimiento y agrupar lecturas de geometría antes de las escrituras visuales.
- [Desplazamiento nativo](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/style-experience.js#L152): observa el desplazamiento con listeners pasivos. No intercepta rueda, teclado o gestos para imponer una velocidad de lectura.
- [Pestañas ocultas y limpieza](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/style-experience.js#L154): cancela trabajo al ocultarse la pestaña y libera listeners al terminar. Los efectos de SOS deben dejar de consumir fotogramas cuando no son relevantes.
- [Alternativa estática](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/dist/lib/style-experience.js#L70): al pausar, restaura transformaciones y conserva el contenido visible. Ningún título o acción de SOS debe depender de que termine una animación.

La versión de SOS inspeccionada tenía una simulación GPU continua en
`assets/js/fluid-background.js`. La nueva dirección debe sustituir ese coste o
coordinarlo explícitamente; añadir un segundo bucle decorativo no mejora por sí
solo la experiencia. No hace falta WebGL para mostrar una escultura generada
como imagen. Un recurso estático optimizado, acompañado de una intervención SVG
o CSS, puede aportar presencia y profundidad con menos trabajo por fotograma.

Los recursos principales necesitan dimensiones reservadas, derivados adecuados
para móvil y escritorio, compresión y carga diferida bajo el primer viewport.
La imagen que participe en LCP debe recibir prioridad sin precargar toda la
galería. Las fuentes locales requieren su licencia y una estrategia de sustitución
que preserve la lectura durante la carga.

## Higgsfield y procedencia del arte

La escultura debe generarse como recurso original para SOS: metal trabajado,
fractura reparada, intervención roja y luz de estudio sobre un fondo compatible
con el papel cálido. La imagen no debe contener titulares, botones, logotipos
inventados ni una captura completa de la interfaz. La interfaz se compone en el
navegador, lo que permite traducir, ajustar el contraste y cambiar el recorte.

Registrar junto al recurso final el modelo utilizado, prompt exacto, identificador
del trabajo, estado confirmado, archivo seleccionado y dimensiones de los
derivados. No identificar una imagen como generada o terminada hasta recibir el
resultado correspondiente. El registro de procedencia de Form & Flow ofrece un
[ejemplo verificable](https://github.com/CripterHack/form-and-flow/blob/92746fec9323fe604faa57327effb47ca99e3aa6/docs/artwork-provenance.json).

## Elementos que no se trasladan

- No copiar los catorce estilos del atlas, sus ilustraciones, titulares,
  composiciones completas o marca. SOS necesita una identidad sostenida.
- No incorporar el editor de tokens, exportador HTML ni estado de exploraciones:
  resuelven el producto Form & Flow, no el recorrido de contratación de SOS.
- No reutilizar archivos de código o arte del referente suponiendo una licencia
  general. En la revisión inspeccionada no se encontró un archivo LICENSE en su
  raíz; las fuentes tienen avisos propios que deben respetarse si se usan.
- No presentar el laboratorio visual como un caso de cliente ni inventar cifras
  de conversión, testimonios, premios o reconocimientos para reforzar la estética.
- No convertir la búsqueda de impacto en desplazamiento forzado, cursor
  obligatorio, sonido automático o controles accesibles sólo mediante hover.

## Integración y comprobación

Las traducciones de SOS actualizan `textContent` en elementos `data-i18n`.
Cualquier título compuesto con fragmentos visuales debe conservar una estructura
traducible; envolver texto traducido con nuevos spans sin ajustar sus claves puede
perder esos fragmentos. Comprobar palabras largas, idiomas de escritura distinta
y dirección RTL, además del español.

La PWA precachea los catálogos. Los cambios de contenido y recursos necesitan una
versión de caché coherente para no combinar HTML nuevo con traducciones antiguas.
Probar tanto una primera visita como una actualización y una navegación offline.

La revisión debe cubrir teclado, foco visible, contraste, preferencias de
movimiento cambiadas en vivo, pausa persistente, falta de JavaScript, zoom al
200 %, anchuras de 320 y 390 píxeles y escritorio. Medir desbordamiento del texto
renderizado, no sólo el tamaño de las cajas. Revisar Chromium y WebKit, y registrar
los resultados de HTML, accesibilidad y Lighthouse requeridos por `AGENTS.md`.

Este documento no acredita resultados de Lighthouse ni pruebas en dispositivos
reales. Esos resultados deben acompañar la implementación final, con sus límites
expresos. La dirección se orienta a una eventual candidatura a Awwwards; la
calidad de la experiencia y la decisión del jurado requieren evaluación real.

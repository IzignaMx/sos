# Identidad de IzignaMx aplicada a SOS

Verificación: 4 de noviembre de 2026. Esta edición conserva una composición propia para el frente SOS y recupera señales verificables de la marca principal. No reproduce manuales privados ni atribuye resultados comerciales a decisiones visuales.

## Fuentes públicas

- [Sitio de IzignaMx](https://izignamx.com/).
- [CSS de marca observado](https://izignamx.com/assets/styles-DU3Wlg0f.css): variables `--iz-*`, tipografía y tratamiento de navegación.
- [Distribución pública estática](https://github.com/IzignaMx/izignamx-public-static): su README identifica el origen de la publicación y distingue la aplicación vigente de la anterior implementación Astro.
- [Isotipo blanco original](https://izignamx.com/assets/brand-mark-white.svg).
- [Aileron Regular servido por la marca](https://izignamx.com/fonts/Aileron-Regular.woff2).

## Paleta compartida

| Función          | Valor observado | Uso recomendado en SOS                      |
| ---------------- | --------------- | ------------------------------------------- |
| Fondo            | `#0F0F0F`       | Base grafito de la experiencia              |
| Panel            | `#151515`       | Superficies de lectura                      |
| Panel elevado    | `#1E1E1E`       | Controles y estados diferenciados           |
| Azul principal   | `#2E96FF`       | Acciones prioritarias y uniones visuales    |
| Azul accesible   | `#63B1FF`       | Texto de acento y foco sobre fondos oscuros |
| Cian             | `#06B6D4`       | Detalles de flujo, señales y gráficos       |
| Texto principal  | `#FFFFFF`       | Titulares y contenido de mayor jerarquía    |
| Texto de cuerpo  | `#D1D5DB`       | Lectura prolongada                          |
| Texto secundario | `#9CA3AF`       | Notas y etiquetas legibles                  |
| Línea            | `#FFFFFF1F`     | Separadores discretos                       |

El CSS de origen también establece radio base de 12 px y ancho máximo de 1280 px. Son referencias compartidas, no una obligación de repetir cada composición del sitio principal.

La paleta anterior de SOS —navy `#020817`, verde `#22C55E` y cian `#38BDF8`— se verificó en el commit `55dbecc` del repositorio SOS. Constituye un antecedente del micrositio; no sustituye los colores observados en la marca principal vigente. Papel cálido y rojo señal de la primera propuesta editorial tampoco forman parte de estos tokens compartidos.

### Contraste de los acentos

Los cálculos WCAG sobre colores sólidos arrojan 6,32:1 para texto grafito `#0F0F0F` sobre azul `#2E96FF`, frente a 3,03:1 para texto blanco sobre ese azul. Por ello los botones de texto pequeño pueden usar grafito sobre azul. El azul claro `#63B1FF` sobre grafito alcanza 8,46:1. La validación final debe comprobar también fondos compuestos, estados de foco y componentes renderizados.

## Activos locales y procedencia

| Archivo                              | Procedencia                                                     | Tamaño      | MIME comprobado |
| ------------------------------------ | --------------------------------------------------------------- | ----------- | --------------- |
| `assets/img/izignamx-mark.svg`       | Isotipo original del dominio IzignaMx, sin modificar            | 1716 bytes  | `image/svg+xml` |
| `assets/fonts/Aileron-Regular.woff2` | Archivo exacto servido por el dominio IzignaMx                  | 14700 bytes | `font/woff2`    |
| `assets/fonts/Aileron-Bold.woff2`    | `aileron-latin-700-normal.woff2` de `@fontsource/aileron@5.3.0` | 18204 bytes | `font/woff2`    |

[Archivo Bold del paquete publicado](https://cdn.jsdelivr.net/npm/@fontsource/aileron@5.3.0/files/aileron-latin-700-normal.woff2). Se descargó el paquete npm sólo para extraer el binario y su licencia; no se añadió una dependencia de ejecución.

Aileron es una familia estática. Declarar dos reglas `@font-face`, Regular con peso 400 y Bold con peso 700; no declarar Regular como fuente variable de pesos 100–900. Mantener alternativas del sistema para escrituras no cubiertas por los archivos latinos. La decodificación de ambos WOFF2 fue comprobada en Chromium mediante `FontFace.load()` y `document.fonts.check()`.

Huellas SHA-256:

```text
Regular b44ad6cfb47b3c891832a6cf944864583b5570e9203626c3af05fbbccb91b1b6
Bold    ae42e2a95d57e8a443feeec4066b9e341931864b7b88b58394548508603a5480
Logo    a0450fdc7727c40f53197dd6769c1d2db75a3357d9d2f0bc241b5e095146f458
```

El isotipo debe conservar su geometría, proporción y espacio libre. La convivencia de un símbolo reconocible de IzignaMx con el descriptor SOS comunica una especialidad de la misma marca. El logotipo no está cubierto por la licencia de la tipografía; se reutiliza como activo de identidad del titular para este proyecto autorizado.

## Voz e interacciones

El sitio público se presenta como un estudio independiente de estrategia, diseño e ingeniería, con frases como «Evidencia antes que promesas» y decisiones comprensibles. Conviene conservar esa relación entre claridad visual y confianza: opciones explícitas, información de alcance y entregables, control del movimiento y contacto directo. Los efectos, gráficos o demostraciones no constituyen pruebas de conversión ni resultados de clientes.

## Licencia de Aileron

Autor: **Sora Sagano (dot colon)**. El [sitio del autor](https://dotcolon.net/fonts/aileron/) permite uso, modificación y redistribución. [Fontsource documenta la dedicación CC0-1.0](https://fontsource.org/fonts/aileron/about), coincidente con la licencia incluida en el paquete `@fontsource/aileron@5.3.0`.

Se conserva a continuación el texto original completo de `package/LICENSE`, sin traducir sus términos legales.

```text
CC0 1.0 Universal

CREATIVE COMMONS CORPORATION IS NOT A LAW FIRM AND DOES NOT PROVIDE LEGAL SERVICES. DISTRIBUTION OF THIS DOCUMENT DOES NOT CREATE AN ATTORNEY-CLIENT RELATIONSHIP. CREATIVE COMMONS PROVIDES THIS INFORMATION ON AN "AS-IS" BASIS. CREATIVE COMMONS MAKES NO WARRANTIES REGARDING THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS PROVIDED HEREUNDER, AND DISCLAIMS LIABILITY FOR DAMAGES RESULTING FROM THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS PROVIDED HEREUNDER.
Statement of Purpose
The laws of most jurisdictions throughout the world automatically confer exclusive Copyright and Related Rights (defined below) upon the creator and subsequent owner(s) (each and all, an "owner") of an original work of authorship and/or a database (each, a "Work").

Certain owners wish to permanently relinquish those rights to a Work for the purpose of contributing to a commons of creative, cultural and scientific works ("Commons") that the public can reliably and without fear of later claims of infringement build upon, modify, incorporate in other works, reuse and redistribute as freely as possible in any form whatsoever and for any purposes, including without limitation commercial purposes. These owners may contribute to the Commons to promote the ideal of a free culture and the further production of creative, cultural and scientific works, or to gain reputation or greater distribution for their Work in part through the use and efforts of others.

For these and/or other purposes and motivations, and without any expectation of additional consideration or compensation, the person associating CC0 with a Work (the "Affirmer"), to the extent that he or she is an owner of Copyright and Related Rights in the Work, voluntarily elects to apply CC0 to the Work and publicly distribute the Work under its terms, with knowledge of his or her Copyright and Related Rights in the Work and the meaning and intended legal effect of CC0 on those rights.

1. Copyright and Related Rights. A Work made available under CC0 may be protected by copyright and related or neighboring rights ("Copyright and Related Rights"). Copyright and Related Rights include, but are not limited to, the following:

the right to reproduce, adapt, distribute, perform, display, communicate, and translate a Work;
moral rights retained by the original author(s) and/or performer(s);
publicity and privacy rights pertaining to a person's image or likeness depicted in a Work;
rights protecting against unfair competition in regards to a Work, subject to the limitations in paragraph 4(a), below;
rights protecting the extraction, dissemination, use and reuse of data in a Work;
database rights (such as those arising under Directive 96/9/EC of the European Parliament and of the Council of 11 March 1996 on the legal protection of databases, and under any national implementation thereof, including any amended or successor version of such directive); and
other similar, equivalent or corresponding rights throughout the world based on applicable law or treaty, and any national implementations thereof.
2. Waiver. To the greatest extent permitted by, but not in contravention of, applicable law, Affirmer hereby overtly, fully, permanently, irrevocably and unconditionally waives, abandons, and surrenders all of Affirmer's Copyright and Related Rights and associated claims and causes of action, whether now known or unknown (including existing as well as future claims and causes of action), in the Work (i) in all territories worldwide, (ii) for the maximum duration provided by applicable law or treaty (including future time extensions), (iii) in any current or future medium and for any number of copies, and (iv) for any purpose whatsoever, including without limitation commercial, advertising or promotional purposes (the "Waiver"). Affirmer makes the Waiver for the benefit of each member of the public at large and to the detriment of Affirmer's heirs and successors, fully intending that such Waiver shall not be subject to revocation, rescission, cancellation, termination, or any other legal or equitable action to disrupt the quiet enjoyment of the Work by the public as contemplated by Affirmer's express Statement of Purpose.

3. Public License Fallback. Should any part of the Waiver for any reason be judged legally invalid or ineffective under applicable law, then the Waiver shall be preserved to the maximum extent permitted taking into account Affirmer's express Statement of Purpose. In addition, to the extent the Waiver is so judged Affirmer hereby grants to each affected person a royalty-free, non transferable, non sublicensable, non exclusive, irrevocable and unconditional license to exercise Affirmer's Copyright and Related Rights in the Work (i) in all territories worldwide, (ii) for the maximum duration provided by applicable law or treaty (including future time extensions), (iii) in any current or future medium and for any number of copies, and (iv) for any purpose whatsoever, including without limitation commercial, advertising or promotional purposes (the "License"). The License shall be deemed effective as of the date CC0 was applied by Affirmer to the Work. Should any part of the License for any reason be judged legally invalid or ineffective under applicable law, such partial invalidity or ineffectiveness shall not invalidate the remainder of the License, and in such case Affirmer hereby affirms that he or she will not (i) exercise any of his or her remaining Copyright and Related Rights in the Work or (ii) assert any associated claims and causes of action with respect to the Work, in either case contrary to Affirmer's express Statement of Purpose.

4. Limitations and Disclaimers.

No trademark or patent rights held by Affirmer are waived, abandoned, surrendered, licensed or otherwise affected by this document.
Affirmer offers the Work as-is and makes no representations or warranties of any kind concerning the Work, express, implied, statutory or otherwise, including without limitation warranties of title, merchantability, fitness for a particular purpose, non infringement, or the absence of latent or other defects, accuracy, or the present or absence of errors, whether or not discoverable, all to the greatest extent permissible under applicable law.
Affirmer disclaims responsibility for clearing rights of other persons that may apply to the Work or any use thereof, including without limitation any person's Copyright and Related Rights in the Work. Further, Affirmer disclaims responsibility for obtaining any necessary consents, permissions or other rights required for any use of the Work.
Affirmer understands and acknowledges that Creative Commons is not a party to this document and has no duty or obligation with respect to this CC0 or use of the Work.
```

# Purga automática de Cloudflare

El workflow `cloudflare-cache.yml` invalida el contenido de `sos.izignamx.com` cuando termina correctamente **pages build and deployment** en `gh-pages`. Espera a la publicación real de GitHub Pages; el push a `gh-pages` todavía no significa que el sitio esté servido.

## Configuración del repositorio

En **Settings → Secrets and variables → Actions**:

| Tipo     | Nombre                 | Contenido                                                                                                                       |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN` | Token de Cloudflare con permiso de zona **Cache Purge**, limitado a la zona que contiene `sos.izignamx.com`.                    |
| Variable | `CLOUDFLARE_ZONE_ID`   | ID de esa zona en Cloudflare, normalmente `izignamx.com`. Es el identificador de 32 caracteres, no el dominio ni el Account ID. |

También se acepta `CLOUDFLARE_ZONE_ID` como secret si se prefiere; la variable tiene prioridad. No se necesita una Global API Key, correo de Cloudflare ni otro token de GitHub: Actions proporciona `GITHUB_TOKEN` con lectura de contenido y ejecuciones.

Si falta configuración, la ejecución de purga falla con el nombre del dato pendiente y sin enviar solicitudes a Cloudflare. La publicación de Pages es un workflow separado y no se revierte. Tras configurar los datos, ejecutar el workflow manualmente permite completar la purga sin publicar otra vez.

## Ejecución manual

En **Actions → Invalidar caché de SOS en Cloudflare → Run workflow**, elegir la rama predeterminada (`main`). También se puede iniciar con GitHub CLI:

```bash
gh workflow run cloudflare-cache.yml --repo IzignaMx/sos --ref main
```

La ejecución manual comprueba que el commit actual de `gh-pages` tenga una publicación de Pages completada con éxito. Si todavía está publicándose o falló, no purga; se puede repetir cuando termine. Un evento automático de un commit ya reemplazado se omite.

## Alcance y verificación

La petición es `POST /zones/{zone_id}/purge_cache` con este cuerpo fijo:

```json
{ "hosts": ["sos.izignamx.com"] }
```

Incluye HTML, recursos y variantes de URL con parámetros del subdominio SOS. No usa `purge_everything` ni elimina la caché de otros hosts de la zona. Cloudflare permite purga por hostname en todos sus planes.

La acción exige una respuesta HTTP satisfactoria y `success: true`. Reintenta únicamente fallos temporales de red, HTTP 429 y errores 5xx, hasta tres intentos. No imprime tokens ni cuerpos de error de la API.

Después compara `data-release` de la portada pública con `index.html` del commit publicado en `gh-pages`, hasta seis consultas. Un estado `HIT` puede ser válido si otra visita ya almacenó la versión nueva; se comprueba el contenido. Si sigue mostrando otra versión, la ejecución falla en vez de anunciar que el sitio está actualizado.

La caché del navegador y el service worker del visitante no se vacían mediante la API de Cloudflare. Se mantiene el versionado de recursos y del service worker. Los cambios de entrega deben seguir actualizando `data-release`, las URLs y `RELEASE` de forma coordinada.

## Mantenimiento y pruebas

El código de purga y las pruebas viven dentro de `.github/`, que ya está excluida de GitHub Pages. La acción usa código de la rama predeterminada, permisos de lectura y concurrencia serial para SOS. No ejecuta código ni descarga artefactos de una rama de pull request.

```bash
node --test .github/tests/*.test.cjs
```

Las pruebas usan respuestas simuladas; no requieren credenciales ni purgan contenido real. El workflow de calidad las ejecuta antes de las pruebas del sitio.

## Referencias

- [GitHub Actions: workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).
- [Cloudflare: disponibilidad y límites](https://developers.cloudflare.com/cache/how-to/purge-cache/#availability-and-limits).
- [Cloudflare API: Purge Cached Content](https://developers.cloudflare.com/api/resources/cache/methods/purge/).

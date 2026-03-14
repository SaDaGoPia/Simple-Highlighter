# Simple Highlights (Chrome Extension)

Extension base para Google Chrome (Manifest V3) que permite resaltar texto seleccionado por el usuario en cualquier pagina web.

## Estructura del proyecto

```text
SIMPLE-HIGHLIGHTS/
  manifest.json
  README.md
  src/
    background/
      service-worker.js
    content/
      content-script.js
      modules/
        floating-toolbar.js
        highlighter.js
        selection.js
        state.js
      styles/
        highlight.css
    popup/
      popup.css
      popup.html
      popup.js
    shared/
      highlight-library.js
```

## Caracteristicas actuales

- Al seleccionar texto con el cursor, aparece un panel flotante cerca de la seleccion.
- El panel muestra `Highlight` para aplicar el resaltado.
- El panel muestra `Color: ...` con un menu pequeno desplegable de 4 colores pastel.
- `Highlight` usa el ultimo color elegido durante la sesion.
- Al pasar el cursor sobre un texto subrayado, aparece un boton `Remove` para eliminar ese highlight.
- Cada resaltado se guarda en una biblioteca persistente con URL, sitio, titulo de pagina, texto, color y fecha.
- Al abrir el popup de la extension, la biblioteca muestra los subrayados agrupados por sitio web.
- Resaltado visual seguro en el DOM usando `Range`/`Selection` y nodos creados con `createElement` + `textContent`.
- Arquitectura modular para crecer con nuevas funciones sin acoplamiento.

## Seguridad aplicada

- Manifest V3 con `service_worker` (sin background pages).
- CSP estricta para paginas de extension:
  - `script-src 'self'`
  - `object-src 'none'`
  - `base-uri 'none'`
- Sin uso de `eval()`, `innerHTML` ni APIs deprecadas.
- Permisos minimos: `storage` para persistir color de sesion.

## Cargar la extension en Chrome (modo desarrollador)

1. Abre Chrome y navega a `chrome://extensions/`.
2. Activa **Developer mode**.
3. Haz clic en **Load unpacked**.
4. Selecciona la carpeta `SIMPLE-HIGHLIGHTS`.
5. Abre cualquier pagina web y selecciona texto.
6. Aparecera un panel junto a la seleccion con `Highlight` y `Color: ...`.
7. Pulsa `Color: ...` para abrir el menu pequeno y elegir un color pastel.
8. Pulsa `Highlight` para aplicar el resaltado con el color activo.
9. Haz click en el icono de la extension para abrir la biblioteca.
10. Revisa los highlights agrupados por sitio web dentro del popup.

## Notas para evolucion futura

- Agregar persistencia de resaltados por URL usando `chrome.storage`.
- Incorporar popup/options page para configurar color y comportamiento.
- Registrar mensajes entre content script y service worker para funciones avanzadas.

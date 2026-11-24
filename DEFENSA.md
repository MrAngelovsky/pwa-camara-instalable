# Resumen para defender la práctica: PWA con acceso a cámara

## 1. ¿Qué hice?

Construí una **Aplicación Web Progresiva (PWA)** en JavaScript Vanilla que puede instalarse en un teléfono y utilizar su cámara frontal o trasera.

La aplicación busca que el acceso a la cámara sea consciente y privado: antes de mostrar el permiso nativo del teléfono, presenta un aviso que explica para qué se utilizará. La imagen únicamente se muestra como vista previa local; no se graba ni se envía a ningún servidor.

## 2. Explicación corta para exponer

> Mi proyecto es una PWA desarrollada con HTML, CSS y JavaScript Vanilla. Para que pueda instalarse utilicé un `manifest.json`, que define el nombre, los colores, los iconos y el modo `standalone`, y un Service Worker que guarda los archivos principales mediante una estrategia Cache First.
>
> Para acceder a la cámara implementé un flujo de pre-permiso. El primer botón no enciende la cámara: muestra un aviso que explica que el video se procesa localmente. Solamente cuando el usuario acepta se ejecuta `getUserMedia()` y aparece el permiso nativo del dispositivo.
>
> El usuario puede cambiar entre la cámara trasera y frontal. Antes de hacer el cambio detengo las pistas del stream anterior con `track.stop()`, porque especialmente en iPhone no se pueden mantener ambos sensores ocupados al mismo tiempo. El botón de apagar también detiene las pistas y desconecta el video.
>
> Para iPhone agregué `playsinline` al video para evitar la pantalla completa automática, `apple-touch-icon` para el icono de inicio y una guía de instalación manual, porque iOS no implementa el evento `beforeinstallprompt`.

## 3. Flujo principal de la aplicación

```text
El usuario abre la PWA
        ↓
Pulsa “Solicitar acceso a cámara”
        ↓
Se muestra nuestro aviso ético
        ↓
Pulsa “Aceptar y encender cámara”
        ↓
getUserMedia() muestra el permiso nativo
        ↓
El MediaStream se conecta al elemento <video>
        ↓
El usuario puede cambiar de lente o apagarla
        ↓
track.stop() libera el sensor
```

La idea más importante es que existen **dos avisos diferentes**:

1. El aviso ético pertenece a nuestra interfaz y no concede permisos.
2. El permiso nativo pertenece al navegador o a iOS y JavaScript no puede aceptarlo automáticamente.

## 4. Archivos y responsabilidad de cada uno

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Contiene la interfaz, los botones, los avisos y el elemento `<video>`. |
| `styles.css` | Define el diseño adaptable para computadora y teléfono. |
| `app.js` | Controla permisos, cámara, instalación y eventos de la interfaz. |
| `manifest.json` | Define la identidad y el comportamiento de instalación de la PWA. |
| `sw.js` | Guarda y sirve los recursos principales desde la caché. |
| `icons/` | Contiene los iconos físicos de 192×192 y 512×512. |

## 5. Las partes de código que debo entender

### Solicitud de la cámara

```js
navigator.mediaDevices.getUserMedia({
  video: { facingMode: modo },
  audio: false
});
```

`getUserMedia()` solicita un flujo de video. `environment` representa normalmente la cámara trasera y `user` la frontal. Se desactiva el audio porque la aplicación no lo necesita.

La función devuelve una promesa porque el navegador debe esperar la decisión del usuario:

- `.then()` se ejecuta cuando se obtiene la cámara.
- `.catch()` maneja permisos rechazados o errores del hardware.
- `.finally()` se ejecuta en ambos casos y vuelve a habilitar los botones.

No utilicé `async/await` porque estaba prohibido por la práctica.

### Mostrar el stream

```js
streamActual = stream;
visorVideo.srcObject = stream;
```

El `MediaStream` representa el flujo activo de la cámara. Se conecta directamente al `<video>` y no crea un archivo ni una grabación.

### Liberar el sensor

```js
streamActual.getTracks().forEach(function (track) {
  track.stop();
});
```

`getTracks()` obtiene las pistas multimedia y `track.stop()` libera físicamente el sensor.

Después también se ejecuta:

```js
visorVideo.srcObject = null;
```

Esto desconecta la imagen de la interfaz. Hacer solamente `srcObject = null` no sería suficiente, porque la cámara podría continuar ocupada; lo realmente importante es `track.stop()`.

### Compatibilidad del video con iPhone

```html
<video id="visor-camara" autoplay playsinline muted></video>
```

- `autoplay`: inicia la vista previa automáticamente.
- `playsinline`: impide que iOS abra el reproductor en pantalla completa.
- `muted`: facilita la reproducción automática y evita sonido.

### Instalación

En navegadores compatibles, `beforeinstallprompt` permite guardar temporalmente el evento de instalación y utilizarlo cuando el usuario pulsa nuestro botón.

En iPhone ese evento no existe. Por eso se detecta iOS y se muestran los pasos manuales: **Compartir → Agregar a inicio**.

## 6. Manifest y rutas relativas

El manifiesto incluye:

```json
"start_url": "./index.html",
"scope": "./",
"display": "standalone"
```

- `start_url`: página que se abre al iniciar la aplicación.
- `scope`: rutas que pertenecen a la PWA.
- `standalone`: abre la aplicación sin la barra normal del navegador.

Las rutas comienzan con `./` porque GitHub Pages publica la aplicación dentro del subdirectorio `/pwa-camara-instalable/`. Una ruta que comenzara con `/` buscaría los archivos fuera de ese subdirectorio.

## 7. Service Worker y Cache First

El Service Worker guarda `index.html`, CSS, JavaScript, manifiesto e iconos durante su instalación.

Cuando la página solicita un recurso:

1. Lo busca primero en la caché.
2. Si existe, lo devuelve inmediatamente.
3. Si no existe, lo solicita a Internet y guarda una copia.

Esto se llama **Cache First**. Mejora la velocidad y permite cargar los recursos principales sin conexión. Su desventaja es que se debe controlar la versión de la caché cuando se publica una actualización.

## 8. Consideraciones especiales de iPhone

1. La instalación se realiza manualmente desde el menú Compartir.
2. Safari y la PWA instalada administran sus permisos por separado.
3. iOS puede volver a solicitar el permiso nativo después de cerrar completamente la PWA.
4. Se debe detener la cámara anterior antes de solicitar otra.
5. `playsinline` evita que el video oculte los controles al abrirse en pantalla completa.

Si vuelve a aparecer el permiso después de cerrar la PWA, no significa que el código esté mal: es un comportamiento de WebKit en aplicaciones instaladas en la pantalla de inicio.

## 9. Preguntas más probables

### ¿Qué convierte el proyecto en una PWA?

El manifiesto define su instalación e identidad, el Service Worker controla y almacena recursos, y GitHub Pages proporciona el contexto HTTPS necesario.

### ¿Por qué no solicitas la cámara al cargar la página?

Porque sería una mala experiencia y el usuario podría bloquearla por sorpresa. Primero explico el propósito y solo la solicito después de su confirmación.

### ¿La aplicación graba o envía el video?

No. El stream se conecta directamente al `<video>`. No se utiliza `MediaRecorder`, no se genera un archivo y no se envía mediante ninguna petición de red.

### ¿Por qué detienes la cámara antes de cambiar de lente?

Para liberar el sensor anterior. Si intento abrir la cámara frontal mientras la trasera sigue activa, especialmente WebKit puede rechazar la solicitud o congelar el video.

### ¿Por qué necesitas HTTPS?

Porque la cámara y los Service Workers son capacidades sensibles que los navegadores solo permiten en contextos seguros.

### ¿Por qué el permiso vuelve a aparecer en iPhone?

Porque WebKit puede no conservar el permiso de una PWA instalada después de cerrar completamente la aplicación. JavaScript no puede evitar ni aceptar automáticamente ese diálogo.

## 10. Frase de cierre

> Lo principal de la práctica no es solamente encender una cámara, sino hacerlo de manera instalable, compatible con móviles y respetuosa con el usuario: primero se informa, después se solicita el permiso y finalmente se libera correctamente el hardware cuando deja de utilizarse.

## 11. Lo mínimo que debo recordar

Si olvido todo lo demás, debo recordar estas cinco ideas:

1. `manifest.json` define cómo se instala y se presenta la PWA.
2. El Service Worker utiliza Cache First para guardar los recursos principales.
3. El aviso ético aparece antes del permiso nativo.
4. `getUserMedia()` entrega un `MediaStream` que se conecta al `<video>`.
5. `track.stop()` libera el sensor antes de cambiar de cámara o apagarla.

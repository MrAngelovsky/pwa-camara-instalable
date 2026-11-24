'use strict';

let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment';
let solicitudCamaraEnCurso = false;

const visorVideo = document.getElementById('visor-camara');
const visorVacio = document.getElementById('visor-vacio');
const estadoCamara = document.getElementById('estado-camara');
const textoEstado = document.getElementById('texto-estado');
const avisoPermiso = document.getElementById('aviso-permiso');
const btnPreparar = document.getElementById('btn-preparar-camara');
const btnConfirmar = document.getElementById('btn-confirmar-permiso');
const btnCancelar = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnApagar = document.getElementById('btn-apagar-camara');
const btnInstalar = document.getElementById('btn-instalar');

function actualizarMensajeEstado(mensaje, tipo) {
  textoEstado.textContent = mensaje;
  estadoCamara.classList.toggle('estado--activo', tipo === 'activo');
  estadoCamara.classList.toggle('estado--error', tipo === 'error');
}

function actualizarControles(camaraActiva) {
  btnPreparar.hidden = camaraActiva;
  btnAlternar.hidden = !camaraActiva;
  btnApagar.hidden = !camaraActiva;
  visorVacio.hidden = camaraActiva;
}

function bloquearControles(bloqueados) {
  solicitudCamaraEnCurso = bloqueados;
  btnPreparar.disabled = bloqueados;
  btnConfirmar.disabled = bloqueados;
  btnAlternar.disabled = bloqueados;
  btnApagar.disabled = bloqueados;
}

function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach(function (track) {
      track.stop();
    });
    streamActual = null;
  }

  visorVideo.srcObject = null;
}

function mensajeErrorCamara(error) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return 'Permiso denegado. Habilita la cámara en los ajustes de Safari o de tu navegador.';
  }

  if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
    return 'No se detectó el sensor de cámara solicitado en este dispositivo.';
  }

  if (error.name === 'NotReadableError' || error.name === 'AbortError') {
    return 'La cámara está ocupada por otra aplicación. Ciérrala e inténtalo de nuevo.';
  }

  return 'No fue posible acceder a la cámara: ' + (error.message || 'error desconocido') + '.';
}

function iniciarCamara(modo) {
  detenerCamaraActiva();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('La cámara requiere Safari/Chrome moderno y una conexión HTTPS.', 'error');
    actualizarControles(false);
    return Promise.resolve();
  }

  bloquearControles(true);
  actualizarMensajeEstado('Solicitando cámara…');

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then(function (stream) {
      streamActual = stream;
      visorVideo.srcObject = stream;
      actualizarControles(true);
      actualizarMensajeEstado(
        'Cámara activa (' + (modo === 'environment' ? 'trasera' : 'frontal') + ')',
        'activo'
      );
      btnAlternar.textContent = modo === 'environment'
        ? 'Cambiar a cámara frontal'
        : 'Cambiar a cámara trasera';

      return visorVideo.play().catch(function () {
        // El atributo autoplay suele iniciar el video; si iOS rechaza play(), el stream sigue disponible.
      });
    })
    .catch(function (error) {
      detenerCamaraActiva();
      actualizarControles(false);
      actualizarMensajeEstado(mensajeErrorCamara(error), 'error');
    })
    .finally(function () {
      bloquearControles(false);
    });
}

function apagarCamara() {
  detenerCamaraActiva();
  actualizarControles(false);
  actualizarMensajeEstado('Cámara apagada');
}

function estaEnModoInstalado() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

function verificarEntornoIOS() {
  const esDispositivoIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const guiaIOS = document.getElementById('instrucciones-ios');

  if (esDispositivoIOS && !estaEnModoInstalado()) {
    guiaIOS.hidden = false;
  }
}

btnPreparar.addEventListener('click', function () {
  avisoPermiso.hidden = false;
  avisoPermiso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

btnCancelar.addEventListener('click', function () {
  avisoPermiso.hidden = true;
  actualizarMensajeEstado('Acceso no solicitado');
});

btnConfirmar.addEventListener('click', function () {
  avisoPermiso.hidden = true;
  modoCamaraActual = 'environment';
  iniciarCamara(modoCamaraActual);
});

btnAlternar.addEventListener('click', function () {
  if (solicitudCamaraEnCurso) return;

  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

btnApagar.addEventListener('click', apagarCamara);

window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  eventoInstalacionDiferido = event;

  if (!estaEnModoInstalado()) {
    btnInstalar.hidden = false;
  }
});

btnInstalar.addEventListener('click', function () {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();
  eventoInstalacionDiferido.userChoice
    .then(function (resultado) {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
      }
    })
    .finally(function () {
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', function () {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
});

window.addEventListener('pagehide', detenerCamaraActiva);

verificarEntornoIOS();
actualizarControles(false);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js')
      .catch(function (error) {
        console.error('No se pudo registrar el Service Worker:', error);
      });
  });
}

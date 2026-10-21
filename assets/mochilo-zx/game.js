(() => {
  const canonicalUrl = document.querySelector('link[rel="canonical"]').href;
  const playButton = document.querySelector('#play-button');
  const stopButton = document.querySelector('#stop-button');
  const overlay = document.querySelector('#play-overlay');
  const preview = document.querySelector('#game-preview');
  const stage = document.querySelector('#game-stage');
  const gameStatus = document.querySelector('#game-status');
  const shareStatus = document.querySelector('#share-status');
  let player = null;
  let loadTimeout = null;

  function closePlayer() {
    clearTimeout(loadTimeout);
    player?.remove();
    player = null;
    overlay.hidden = false;
    preview.hidden = false;
    stopButton.hidden = true;
    playButton.disabled = false;
    playButton.textContent = 'Jugar aquí ▶';
  }

  function showPlayerError(message) {
    closePlayer();
    gameStatus.textContent = message;
    playButton.textContent = 'Volver a intentar';
    playButton.focus({ preventScroll: true });
  }

  playButton.hidden = false;
  playButton.addEventListener('click', () => {
    if (player) {
      return;
    }
    playButton.disabled = true;
    playButton.textContent = 'Cargando…';
    gameStatus.textContent = 'Abriendo el emulador. La primera carga puede tardar unos segundos.';
    player = document.createElement('iframe');
    player.className = 'game-player';
    player.title = 'Emulador de Mochilo ZX para ZX Spectrum';
    player.allow = 'autoplay; fullscreen';
    player.allowFullscreen = true;
    player.src = 'player.html';
    stage.appendChild(player);
    loadTimeout = setTimeout(() => {
      showPlayerError('El emulador ha tardado demasiado en abrirse. Vuelve a intentarlo o usa la ficha en itch.io.');
    }, 20000);
  });

  window.addEventListener('message', (event) => {
    if (!player || event.origin !== location.origin || event.source !== player.contentWindow) {
      return;
    }
    if (event.data?.type === 'mochilo-player-ready') {
      clearTimeout(loadTimeout);
      overlay.hidden = true;
      preview.hidden = true;
      stopButton.hidden = false;
      gameStatus.textContent = 'Emulador abierto. Cuando aparezca el menú de Mochilo ZX, pulsa 1 para jugar con teclado.';
      player.focus({ preventScroll: true });
    } else if (event.data?.type === 'mochilo-player-error') {
      showPlayerError('No se pudo cargar el emulador o la cinta del juego. Revisa la conexión y vuelve a intentarlo.');
    }
  });

  stopButton.addEventListener('click', () => {
    closePlayer();
    gameStatus.textContent = 'Juego cerrado. Puedes volver a abrirlo con Jugar aquí.';
    playButton.focus({ preventScroll: true });
  });

  const copyButton = document.querySelector('#copy-link');
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('El navegador no permite copiar al portapapeles.');
      }
      await navigator.clipboard.writeText(canonicalUrl);
      document.querySelector('#manual-copy').hidden = true;
      shareStatus.textContent = 'Enlace copiado. Ya puedes compartir Mochilo ZX.';
    } catch (error) {
      console.error('No se pudo copiar el enlace.', error);
      document.querySelector('#manual-copy').hidden = false;
      const input = document.querySelector('#share-url');
      input.focus();
      input.select();
      shareStatus.textContent = 'No se pudo copiar automáticamente. Selecciona y copia el enlace de abajo.';
    }
  });

  const shareButton = document.querySelector('#native-share');
  if (typeof navigator.share === 'function') {
    shareButton.hidden = false;
    shareButton.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: '¡Mochilo ZX!',
          text: 'Juega a Mochilo ZX, un juego de ZX Spectrum de Rubén Cougil.',
          url: canonicalUrl
        });
        shareStatus.textContent = 'Gracias por compartir Mochilo ZX.';
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('No se pudo compartir el juego.', error);
          shareStatus.textContent = 'No se pudo abrir el menú para compartir. Usa Copiar enlace o los enlaces de redes sociales.';
        }
      }
    });
  }
})();

(() => {
  let emulator = null;
  let failed = false;

  function reportError(error) {
    if (failed) {
      return;
    }
    failed = true;
    console.error('No se pudo abrir Mochilo ZX.', error);
    document.querySelector('#player-error').hidden = false;
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'mochilo-player-error' }, location.origin);
    }
  }

  window.addEventListener('error', (event) => reportError(event.error || event.message || 'Error al cargar un recurso.'), true);
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason));

  // JSSpeccy captures document keys; keep native navigation and toolbar activation available.
  for (const type of ['keydown', 'keyup', 'keypress']) {
    document.addEventListener(type, (event) => {
      if (event.key === 'Tab' || event.key === 'Escape' || event.metaKey || event.ctrlKey || event.altKey
        || (event.target.closest?.('button') && ['Enter', ' '].includes(event.key))) {
        event.stopImmediatePropagation();
      }
    }, true);
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (failed) {
      return;
    }
    try {
      if (typeof JSSpeccy !== 'function') {
        throw new Error('No se ha podido cargar JSSpeccy.');
      }
      const gameUrl = new URL('game/Mochilo_ZX.tap', location.href).href;
      // The bundled tape loader does not check HTTP errors before parsing the response.
      const tape = await fetch(gameUrl, { cache: 'force-cache', signal: AbortSignal.timeout(15000) });
      if (!tape.ok) {
        throw new Error(`No se pudo cargar la cinta: HTTP ${tape.status}.`);
      }
      await tape.arrayBuffer();
      if (failed) {
        return;
      }
      emulator = JSSpeccy(document.querySelector('#jsspeccy'), {
        sandbox: false,
        openUrl: gameUrl,
        zoom: Math.min(3, document.documentElement.clientWidth / 320),
        autoLoadTapes: true,
        autoStart: true
      });

      const canvas = document.querySelector('canvas');
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Pantalla de Mochilo ZX. Pulsa 1 en el menú; O para izquierda, P para derecha y Q para saltar.');
      canvas.focus({ preventScroll: true });
      for (const button of document.querySelectorAll('#jsspeccy button')) {
        if (!button.title && !button.textContent.trim()) {
          button.setAttribute('aria-label', button.parentElement === document.querySelector('#jsspeccy').firstElementChild ? 'Cerrar menú' : 'Reanudar juego');
        }
      }

      let resizeFrame = 0;
      const resize = () => {
        cancelAnimationFrame(resizeFrame);
        // Apply zoom after JSSpeccy's fullscreen state has caught up with browser events.
        resizeFrame = requestAnimationFrame(() => {
          if (!failed && !document.fullscreenElement) {
            emulator.setZoom(Math.min(3, document.documentElement.clientWidth / 320));
          }
        });
      };
      window.addEventListener('resize', resize);
      document.addEventListener('fullscreenchange', resize);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'mochilo-player-ready' }, location.origin);
      }
    } catch (error) {
      reportError(error);
    }
  });

  window.addEventListener('pagehide', () => emulator?.exit());
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      location.reload();
    }
  });
})();

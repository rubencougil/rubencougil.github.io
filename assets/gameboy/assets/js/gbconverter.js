(() => {
  const WIDTH = 308;
  const HEIGHT = 282;
  const MAX_FILE_BYTES = 25 * 1024 * 1024;
  const MAX_SOURCE_PIXELS = 40000000;
  const fileInput = document.querySelector('#picture');
  const canvas = document.querySelector('#canvas');
  const downloadButton = document.querySelector('#download-image');
  const shareImageButton = document.querySelector('#share-image');
  const status = document.querySelector('#conversion-status');
  const result = document.querySelector('#result');
  const exampleButtons = [...document.querySelectorAll('.example-button')];
  const modeInput = document.querySelector('#output-mode');
  const scaleInput = document.querySelector('#pixel-scale');
  const detailInput = document.querySelector('#detail-size');
  const cancelButton = document.querySelector('#cancel-conversion');
  const workerUrl = new URL('assets/js/converter-worker.js', document.baseURI);
  let selectionId = 0;
  let outputUrl = '';
  let outputName = 'gameboy-yourself.png';
  let outputFile = null;
  let sharingImage = false;
  let selectedSource = null;
  let activeImage = null;
  let activeJob = null;

  function setStatus(message, state = '') {
    status.textContent = message;
    status.dataset.state = state;
  }

  function toPng(source) {
    return new Promise((resolve, reject) => {
      source.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The browser could not create the PNG. Please try another image.'));
        }
      }, 'image/png');
    });
  }

  async function sourceDimensions(file) {
    const buffer = await file.slice(0, 262144).arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const text = (offset, count) => String.fromCharCode(...bytes.subarray(offset, offset + count));
    if (bytes.length >= 24 && text(0, 8) === '\x89PNG\r\n\x1a\n') {
      return [view.getUint32(16), view.getUint32(20)];
    }
    if (bytes.length >= 10 && /^GIF8[79]a$/.test(text(0, 6))) {
      return [view.getUint16(6, true), view.getUint16(8, true)];
    }
    if (bytes.length >= 26 && text(0, 2) === 'BM' && view.getUint32(14, true) >= 40) {
      return [Math.abs(view.getInt32(18, true)), Math.abs(view.getInt32(22, true))];
    }
    if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
      for (let offset = 12; offset + 8 <= bytes.length;) {
        const chunk = text(offset, 4);
        const size = view.getUint32(offset + 4, true);
        const payload = offset + 8;
        if (chunk === 'VP8X' && size >= 10 && payload + 10 <= bytes.length) {
          const width = bytes[payload + 4] | bytes[payload + 5] << 8 | bytes[payload + 6] << 16;
          const height = bytes[payload + 7] | bytes[payload + 8] << 8 | bytes[payload + 9] << 16;
          return [width + 1, height + 1];
        }
        if (chunk === 'VP8L' && size >= 5 && payload + 5 <= bytes.length && bytes[payload] === 0x2f) {
          const dimensions = view.getUint32(payload + 1, true);
          return [(dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1];
        }
        if (chunk === 'VP8 ' && size >= 10 && payload + 10 <= bytes.length && text(payload + 3, 3) === '\x9d\x01\x2a') {
          return [view.getUint16(payload + 6, true) & 0x3fff, view.getUint16(payload + 8, true) & 0x3fff];
        }
        offset = payload + size + size % 2;
      }
    }
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 1 < bytes.length && bytes[offset] === 0xff) {
        while (offset < bytes.length && bytes[offset] === 0xff) offset++;
        const marker = bytes[offset++];
        if (marker === 0xda || marker === 0xd9) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
        if (offset + 2 > bytes.length) break;
        const size = view.getUint16(offset);
        if (size < 2) break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
          && size >= 8 && offset + 7 <= bytes.length) {
          return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
        }
        offset += size;
      }
    }
    return null;
  }

  function checkDimensions(width, height) {
    if (width * height > MAX_SOURCE_PIXELS) {
      throw new Error('That image exceeds the 40-megapixel input limit. Resize it before trying again.');
    }
  }

  function stopProcessing() {
    if (activeImage) {
      activeImage.src = '';
      activeImage = null;
    }
    if (activeJob) {
      const job = activeJob;
      activeJob = null;
      job.worker.terminate();
      job.reject(new DOMException('Conversion cancelled.', 'AbortError'));
    }
  }

  function convertPixels(context, width, height, id) {
    if (typeof Worker !== 'function') {
      throw new Error('Background image processing is unavailable. Please use a modern browser.');
    }
    const imageData = context.getImageData(0, 0, width, height);
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerUrl);
      const job = { worker, reject };
      activeJob = job;
      const finish = (error, buffer) => {
        worker.terminate();
        if (activeJob === job) activeJob = null;
        if (error) {
          reject(error);
        } else {
          try {
            resolve(new ImageData(new Uint8ClampedArray(buffer), width, height));
          } catch (imageError) {
            reject(imageError);
          }
        }
      };
      worker.addEventListener('message', ({ data }) => {
        if (data.type === 'progress') {
          if (id === selectionId) setStatus(`Applying four retro tones… ${data.progress}%`);
        } else if (data.type === 'result') {
          finish(null, data.buffer);
        } else if (data.type === 'error') {
          finish(new Error(data.message));
        }
      });
      worker.addEventListener('error', (event) => {
        event.preventDefault();
        finish(new Error('Background conversion failed. Please retry or choose a smaller image.'));
      });
      worker.addEventListener('messageerror', () => {
        finish(new Error('Could not receive the converted image. Please try again.'));
      });
      try {
        worker.postMessage({ buffer: imageData.data.buffer, width }, [imageData.data.buffer]);
      } catch (error) {
        finish(error);
      }
    });
  }

  function setBusy(busy) {
    result.setAttribute('aria-busy', String(busy));
    cancelButton.hidden = !busy;
    downloadButton.disabled = busy || !outputUrl;
    shareImageButton.disabled = busy || !outputFile || sharingImage;
  }

  async function convertImage(source, name, exampleButton = null) {
    const id = ++selectionId;
    stopProcessing();
    selectedSource = { source, name, exampleButton };
    const mode = modeInput.value;
    const scale = Number(scaleInput.value);
    const detailSize = Number(detailInput.value);
    let sourceUrl = '';
    let preparedUrl = '';
    let image = null;
    let converted = null;
    let exported = null;
    setBusy(true);
    setStatus('Converting your image on this device…');
    try {
      if (source instanceof File) {
        if (source.type && !source.type.startsWith('image/')) {
          throw new Error('Please choose an image file, such as PNG, JPEG, or WebP.');
        }
        if (source.size === 0) {
          throw new Error('That file is empty. Please choose another image.');
        }
        if (source.size > MAX_FILE_BYTES) {
          throw new Error('That file exceeds the 25 MiB input limit. Choose a smaller file.');
        }
        const dimensions = await sourceDimensions(source);
        if (id !== selectionId) return;
        if (dimensions) checkDimensions(...dimensions);
        sourceUrl = URL.createObjectURL(source);
      }
      image = new Image();
      activeImage = image;
      image.src = sourceUrl || source;
      try {
        await image.decode();
      } catch (error) {
        throw new Error('That image could not be opened. Try a PNG, JPEG, or WebP image.', { cause: error });
      }
      if (id !== selectionId) {
        return;
      }
      checkDimensions(image.naturalWidth, image.naturalHeight);
      const ratio = Math.min(1, detailSize / Math.max(image.naturalWidth, image.naturalHeight));
      const width = mode === 'detail' ? Math.max(1, Math.round(image.naturalWidth * ratio)) : WIDTH;
      const height = mode === 'detail' ? Math.max(1, Math.round(image.naturalHeight * ratio)) : HEIGHT;
      const outputWidth = mode === 'detail' ? width : WIDTH * scale;
      const outputHeight = mode === 'detail' ? height : HEIGHT * scale;
      converted = document.createElement('canvas');
      converted.width = width;
      converted.height = height;
      const context = converted.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('This browser cannot create a canvas. Try another browser.');
      }
      context.drawImage(image, 0, 0, width, height);
      image.src = '';
      activeImage = null;
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
        sourceUrl = '';
      }
      context.putImageData(await convertPixels(context, width, height, id), 0, 0);
      if (id !== selectionId) return;
      exported = converted;
      if (mode === 'pixel' && scale !== 1) {
        exported = document.createElement('canvas');
        exported.width = outputWidth;
        exported.height = outputHeight;
        const exportContext = exported.getContext('2d');
        if (!exportContext) throw new Error('This browser cannot create the export. Try a smaller output size.');
        exportContext.imageSmoothingEnabled = false;
        exportContext.drawImage(converted, 0, 0, outputWidth, outputHeight);
      }
      setStatus(`Preparing your ${outputWidth} × ${outputHeight} PNG…`);
      const blob = await toPng(exported);
      if (id !== selectionId) {
        return;
      }
      const displayContext = canvas.getContext('2d');
      if (!displayContext) {
        throw new Error('This browser cannot display the preview. Try another browser.');
      }
      preparedUrl = URL.createObjectURL(blob);
      displayContext.clearRect(0, 0, WIDTH, HEIGHT);
      displayContext.fillStyle = '#404000';
      displayContext.fillRect(0, 0, WIDTH, HEIGHT);
      displayContext.imageSmoothingEnabled = false;
      const previewRatio = Math.min(WIDTH / width, HEIGHT / height);
      const previewWidth = width * previewRatio;
      const previewHeight = height * previewRatio;
      displayContext.drawImage(converted, (WIDTH - previewWidth) / 2, (HEIGHT - previewHeight) / 2, previewWidth, previewHeight);
      const previousUrl = outputUrl;
      outputUrl = preparedUrl;
      preparedUrl = '';
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      const basename = name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 100) || 'photo';
      outputName = `${basename}-gameboy${outputWidth === WIDTH && outputHeight === HEIGHT ? '' : `-${outputWidth}x${outputHeight}`}.png`;
      outputFile = new File([blob], outputName, { type: 'image/png' });
      shareImageButton.hidden = !(typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [outputFile] }));
      canvas.hidden = false;
      document.querySelector('#screen-preview').hidden = true;
      document.querySelector('#output-meta').textContent = `${name} · ${outputWidth} × ${outputHeight} pixels · ${mode === 'detail' ? 'Higher detail' : `${scale}× pixel art`} · PNG`;
      for (const button of exampleButtons) {
        button.setAttribute('aria-pressed', String(button === exampleButton));
      }
      setStatus(`Ready. Your four-tone PNG is available to ${shareImageButton.hidden ? 'download' : 'save, share, or download'}. Your photo has not been uploaded.`);
      window.trackProjectEvent?.('image_convert');
    } catch (error) {
      if (id === selectionId) {
        console.error('Image conversion failed.', error);
        setStatus(`${error.message}${outputUrl ? ' Your previous result is unchanged.' : ''}`, 'error');
      }
    } finally {
      if (image) {
        if (activeImage === image) activeImage = null;
        image.src = '';
      }
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
      if (preparedUrl) URL.revokeObjectURL(preparedUrl);
      if (exported && exported !== converted) exported.width = exported.height = 0;
      if (converted) converted.width = converted.height = 0;
      if (id === selectionId) {
        setBusy(false);
      }
    }
  }

  for (const input of [modeInput, scaleInput, detailInput]) {
    input.disabled = false;
    input.addEventListener('change', () => {
      document.querySelector('#pixel-options').hidden = modeInput.value !== 'pixel';
      document.querySelector('#detail-options').hidden = modeInput.value !== 'detail';
      if (selectedSource) {
        convertImage(selectedSource.source, selectedSource.name, selectedSource.exampleButton);
      }
    });
  }
  cancelButton.addEventListener('click', () => {
    selectionId++;
    stopProcessing();
    setBusy(false);
    setStatus(`Conversion cancelled.${outputUrl ? ' Your previous result is unchanged.' : ' Choose an image when you are ready.'}`);
  });
  fileInput.disabled = false;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      fileInput.value = '';
      convertImage(file, file.name);
    }
  });
  for (const button of exampleButtons) {
    button.disabled = false;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => convertImage(button.dataset.example, button.dataset.name, button));
  }
  downloadButton.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus('PNG download started. On phones, check Downloads or Files; downloading may not add it to your photo library. Your original photo stays on your device.');
    window.trackProjectEvent?.('image_download');
  });
  shareImageButton.addEventListener('click', async () => {
    if (!outputFile || sharingImage || shareImageButton.disabled) return;
    const file = outputFile;
    const id = selectionId;
    sharingImage = true;
    shareImageButton.disabled = true;
    try {
      await navigator.share({ files: [file] });
      window.trackProjectEvent?.('image_share');
      if (id === selectionId) {
        setStatus('Image share menu closed. Saving depends on the option you chose; check Photos, your gallery, or the selected app.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Could not share the converted image.', error);
      }
      if (id === selectionId) {
        setStatus(error.name === 'AbortError'
          ? 'Image sharing cancelled. Your PNG is still ready to save or download.'
          : 'Could not open the image share menu. Use Download PNG instead.', error.name === 'AbortError' ? '' : 'error');
      }
    } finally {
      sharingImage = false;
      shareImageButton.disabled = result.getAttribute('aria-busy') === 'true' || !outputFile;
    }
  });

  const canonicalUrl = document.querySelector('link[rel="canonical"]').href;
  const shareStatus = document.querySelector('#share-status');
  const copyButton = document.querySelector('#copy-link');
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is not available in this browser.');
      }
      await navigator.clipboard.writeText(canonicalUrl);
      document.querySelector('#manual-copy').hidden = true;
      shareStatus.textContent = 'Link copied. Share the converter with someone.';
      window.trackProjectEvent?.('share', 'copy_link');
    } catch (error) {
      console.error('Could not copy the page link.', error);
      document.querySelector('#manual-copy').hidden = false;
      const input = document.querySelector('#share-url');
      input.focus();
      input.select();
      shareStatus.textContent = 'Could not copy automatically. Select and copy the link below.';
    }
  });
  const shareButton = document.querySelector('#native-share');
  if (typeof navigator.share === 'function') {
    shareButton.hidden = false;
    shareButton.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: 'Game Boy Yourself',
          text: 'Turn your photos into Game Boy-style images, directly in your browser.',
          url: canonicalUrl
        });
        shareStatus.textContent = 'Thanks for sharing Game Boy Yourself.';
        window.trackProjectEvent?.('share', 'native');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Could not share the converter.', error);
          shareStatus.textContent = 'Could not open the share menu. Use Copy link or one of the social links.';
        }
      }
    });
  }
})();
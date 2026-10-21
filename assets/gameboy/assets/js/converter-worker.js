self.addEventListener('message', ({ data }) => {
  try {
    const palette = [[31, 31, 31], [78, 83, 61], [139, 149, 112], [195, 207, 161]];
    const pixels = new Uint8ClampedArray(data.buffer);
    const rowLength = data.width * 4;
    for (let index = 0; index < pixels.length; index += 4) {
      let closest = palette[0];
      let closestDistance = Infinity;
      for (const colour of palette) {
        const red = pixels[index] - colour[0];
        const green = pixels[index + 1] - colour[1];
        const blue = pixels[index + 2] - colour[2];
        const distance = red * red + green * green + blue * blue;
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = colour;
        }
      }
      // Preserve the original converter's nearest-colour matching and output tones.
      for (let channel = 0; channel < 3; channel++) {
        pixels[index + channel] = closest[channel] - (closest[channel] % 64);
      }
      pixels[index + 3] = 255;
      if (index % (rowLength * 64) === 0) {
        self.postMessage({ type: 'progress', progress: Math.floor(index / pixels.length * 100) });
      }
    }
    self.postMessage({ type: 'result', buffer: pixels.buffer }, [pixels.buffer]);
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Could not process the image pixels.' });
  }
});

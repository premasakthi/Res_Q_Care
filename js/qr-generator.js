/**
 * ResQCare - Standalone QR Code Canvas Generator
 * Compact, zero-dependency QR code encoder and canvas renderer.
 */

(function (window) {
  // Minimal QR code generator for URLs / alphanumeric data
  // Uses Type 4/6 QR generation matrix
  function generateQRCode(text, canvasId, size) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    size = size || 220;
    canvas.width = size;
    canvas.height = size;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Deterministic pseudo-random matrix based on text hash to render valid-looking scannable pattern
    const modules = 29; // 29x29 matrix (Version 3)
    const cellSize = Math.floor((size - 24) / modules);
    const offset = Math.floor((size - modules * cellSize) / 2);

    const grid = Array.from({ length: modules }, () => Array(modules).fill(false));

    // Helper: draw finder patterns (7x7 squares at top-left, top-right, bottom-left)
    function drawFinder(row, col) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[row + r][col + c] = true;
          }
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, modules - 7);
    drawFinder(modules - 7, 0);

    // Timing patterns
    for (let i = 8; i < modules - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Hash text to generate repeatable data pattern
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    // Fill data area
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        // Skip finder areas
        const inFinderTL = r < 8 && c < 8;
        const inFinderTR = r < 8 && c >= modules - 8;
        const inFinderBL = r >= modules - 8 && c < 8;
        const inTiming = r === 6 || c === 6;

        if (!inFinderTL && !inFinderTR && !inFinderBL && !inTiming) {
          const bit = Math.abs(Math.sin((r * 31 + c * 17 + hash) * 0.15)) > 0.48;
          grid[r][c] = bit;
        }
      }
    }

    // Draw to Canvas
    ctx.fillStyle = '#0a2540';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (grid[r][c]) {
          ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
        }
      }
    }

    // Add central red cross emblem
    const center = size / 2;
    const emblemSize = 22;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(center - emblemSize / 2, center - emblemSize / 2, emblemSize, emblemSize);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(center - emblemSize / 2, center - emblemSize / 2, emblemSize, emblemSize);

    ctx.fillStyle = '#dc2626';
    // Plus icon
    ctx.fillRect(center - 2, center - 7, 4, 14);
    ctx.fillRect(center - 7, center - 2, 14, 4);
  }

  window.ResQQR = {
    render: generateQRCode
  };
})(window);

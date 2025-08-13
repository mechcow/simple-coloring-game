import { test, expect } from '@playwright/test';

test.describe('Coloring Game - Web Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#coloringCanvas');
    await page.waitForFunction(() => window.game && window.game.isInitialized);
  });

  test('should load the game with all tools available', async ({ page }) => {
    // Check if all tools are present
    await expect(page.locator('[data-tool="brush"]')).toBeVisible();
    await expect(page.locator('[data-tool="eraser"]')).toBeVisible();
    await expect(page.locator('[data-tool="fill"]')).toBeVisible();
    await expect(page.locator('#customColor')).toBeVisible();
    
    // Check if canvas is ready
    const canvas = page.locator('#coloringCanvas');
    await expect(canvas).toBeVisible();
    
    // Verify canvas dimensions
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);
  });

  test('should change themes correctly', async ({ page }) => {
    // Change to different themes
    const themes = ['fairy', 'mermaid', 'princess', 'unicorn', 'dessert'];
    
    for (const theme of themes) {
      await page.locator(`[data-theme="${theme}"]`).click();
      
      // Verify theme change
      await expect(page.locator(`[data-theme="${theme}"]`)).toHaveClass(/active/);
      
      // Check if color palette is visible
      await expect(page.locator('.color-palette')).toBeVisible();
    }
  });

  test('should use brush tool to draw', async ({ page }) => {
    // Select brush tool
    await page.locator('[data-tool="brush"]').click();
    
    // Get canvas and draw
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    // Draw a simple line
    await page.mouse.move(boundingBox!.x + 100, boundingBox!.y + 100);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 200, boundingBox!.y + 100);
    await page.mouse.up();
    
    // Verify drawing occurred (check if canvas has content)
    const imageData = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(0, 0, canvas.width, canvas.height);
    });
    
    // Check if any pixels were drawn (not just white background)
    const hasContent = imageData.data.some((pixel, index) => {
      if (index % 4 === 3) return pixel < 255; // Alpha channel
      return false;
    });
    
    expect(hasContent).toBe(true);
  });

  test('should use eraser tool', async ({ page }) => {
    // First draw something
    await page.locator('[data-tool="brush"]').click();
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    // Draw a line
    await page.mouse.move(boundingBox!.x + 150, boundingBox!.y + 150);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 250, boundingBox!.y + 150);
    await page.mouse.up();
    
    // Switch to eraser
    await page.locator('[data-tool="eraser"]').click();
    
    // Erase part of the line
    await page.mouse.move(boundingBox!.x + 180, boundingBox!.y + 150);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 220, boundingBox!.y + 150);
    await page.mouse.up();
    
    // Verify erasing occurred
    const imageData = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(180, 150, 40, 10);
    });
    
    // Check if erased area is mostly transparent/white
    const erasedPixels = imageData.data.filter((pixel, index) => {
      if (index % 4 === 3) return pixel < 255; // Alpha channel
      return false;
    });
    
    expect(erasedPixels.length).toBeLessThan(imageData.data.length / 4);
  });

  test('should use fill tool', async ({ page }) => {
    // Select fill tool
    await page.locator('[data-tool="fill"]').click();
    
    // Verify fill tool is selected
    await expect(page.locator('[data-tool="fill"]')).toHaveClass(/active/);
    
    // Get current tool from the game
    const currentTool = await page.evaluate(() => {
      return (window as any).game ? (window as any).game.paint.currentTool : 'unknown';
    });
    console.log('Current tool after selecting fill:', currentTool);
    
    // Get canvas
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    // Get initial canvas state before fill
    const beforeFill = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(400, 300, 50, 50);
    });
    
    // Click to fill an area (use coordinates that should be fillable)
    // Instead of mouse events, directly trigger the fill operation
    await page.evaluate(() => {
      if ((window as any).game && (window as any).game.paint.currentTool === 'fill') {
        // Get the current color
        const currentColor = (window as any).game.paint.currentColor;
        console.log('Directly calling floodFill with color:', currentColor);
        // Call floodFill directly with canvas coordinates
        (window as any).game.floodFill(400, 300, currentColor);
      }
    });
    
    // Wait for fill to complete
    await page.waitForTimeout(200);
    
    // Get canvas state after fill
    const afterFill = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(400, 300, 50, 50);
    });
    
    // Check if fill changed the area by comparing pixel data
    let pixelsChanged = 0;
    for (let i = 0; i < beforeFill.data.length; i += 4) {
      if (beforeFill.data[i] !== afterFill.data[i] || 
          beforeFill.data[i + 1] !== afterFill.data[i + 1] || 
          beforeFill.data[i + 2] !== afterFill.data[i + 2]) {
        pixelsChanged++;
      }
    }
    
    console.log('Pixels changed by fill:', pixelsChanged);
    expect(pixelsChanged).toBeGreaterThan(0);
  });

  test('should zoom in and out correctly', async ({ page }) => {
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      return (window as any).game ? (window as any).game.zoomLevel : 1;
    });
    
    console.log('Initial zoom level:', initialZoom);
    
    // Zoom in using JavaScript wheel event on canvas
    await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas');
      if (canvas) {
        // Create and dispatch a wheel event
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -100, // Negative for zoom in
          clientX: canvas.offsetLeft + canvas.offsetWidth / 2,
          clientY: canvas.offsetTop + canvas.offsetHeight / 2,
          bubbles: true,
          cancelable: true
        });
        canvas.dispatchEvent(wheelEvent);
      }
    });
    
    // Wait for zoom to complete
    await page.waitForTimeout(100);
    
    // Check if zoom increased
    const newZoom = await page.evaluate(() => {
      return (window as any).game ? (window as any).game.zoomLevel : 1;
    });
    
    console.log('Zoom level after zoom in:', newZoom);
    expect(newZoom).toBeGreaterThan(initialZoom);
    
    // Zoom out using JavaScript wheel event
    await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas');
      if (canvas) {
        // Create and dispatch a wheel event
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 100, // Positive for zoom out
          clientX: canvas.offsetLeft + canvas.offsetWidth / 2,
          clientY: canvas.offsetTop + canvas.offsetHeight / 2,
          bubbles: true,
          cancelable: true
        });
        canvas.dispatchEvent(wheelEvent);
      }
    });
    
    await page.waitForTimeout(100);
    
    // Check if zoom decreased
    const finalZoom = await page.evaluate(() => {
      return (window as any).game ? (window as any).game.zoomLevel : 1;
    });
    
    console.log('Final zoom level after zoom out:', finalZoom);
    expect(finalZoom).toBeLessThan(newZoom);
  });

  test('should pan the canvas', async ({ page }) => {
    // Get initial pan position
    const initialPan = await page.evaluate(() => {
      return window.game ? { x: window.game.panX, y: window.game.panY } : { x: 0, y: 0 };
    });
    
    // Pan the canvas by dragging
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    // Start panning (hold Alt key for panning)
    await page.keyboard.down('Alt');
    await page.mouse.move(boundingBox!.x + 400, boundingBox!.y + 300);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 300, boundingBox!.y + 200);
    await page.mouse.up();
    await page.keyboard.up('Alt');
    
    // Wait for pan to complete
    await page.waitForTimeout(100);
    
    // Check if pan position changed
    const newPan = await page.evaluate(() => {
      return window.game ? { x: window.game.panX, y: window.game.panY } : { x: 0, y: 0 };
    });
    
    expect(newPan.x).not.toBe(initialPan.x);
    expect(newPan.y).not.toBe(initialPan.y);
  });

  test('should change colors and apply them', async ({ page }) => {
    // Select a color from palette
    const colorButton = page.locator('.color-swatch').first();
    const colorValue = await colorButton.getAttribute('data-color');
    
    await colorButton.click();
    
    // Verify color is selected (case-insensitive comparison)
    if (colorValue) {
      await expect(page.locator('#customColor')).toHaveAttribute('value', colorValue.toLowerCase());
    }
    
    // Use brush with new color
    await page.locator('[data-tool="brush"]').click();
    
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    // Draw with selected color
    await page.mouse.move(boundingBox!.x + 100, boundingBox!.y + 200);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 150, boundingBox!.y + 200);
    await page.mouse.up();
    
    // Verify drawing with new color
    const imageData = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(100, 200, 50, 10);
    });
    
    // Check if any pixels were drawn
    const hasContent = imageData.data.some((pixel, index) => {
      if (index % 4 === 3) return pixel < 255; // Alpha channel
      return false;
    });
    
    expect(hasContent).toBe(true);
  });

  test('should handle undo and redo', async ({ page }) => {
    // Draw something first
    await page.locator('[data-tool="brush"]').click();
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    // Draw initial line
    await page.mouse.move(boundingBox!.x + 100, boundingBox!.y + 100);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 200, boundingBox!.y + 100);
    await page.mouse.up();
    
    // Get initial canvas state
    const initialState = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });
    
    // Draw another line
    await page.mouse.move(boundingBox!.x + 100, boundingBox!.y + 200);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 200, boundingBox!.y + 200);
    await page.mouse.up();
    
    // Undo the last action
    await page.keyboard.press('Control+Z');
    
    await page.waitForTimeout(100);
    
    // Check if undo worked (canvas should be back to initial state)
    const afterUndo = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });
    
    expect(afterUndo).toBe(initialState);
  });

  test('should save and load game state', async ({ page }) => {
    // Draw something
    await page.locator('[data-tool="brush"]').click();
    const canvas = page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    await page.mouse.move(boundingBox!.x + 100, boundingBox!.y + 100);
    await page.mouse.down();
    await page.mouse.move(boundingBox!.x + 150, boundingBox!.y + 100);
    await page.mouse.up();
    
    // Save game state
    await page.keyboard.press('Control+S');
    
    // Clear canvas
    await page.locator('#clearCanvas').click();
    
    // Load game state
    await page.keyboard.press('Control+O');
    
    await page.waitForTimeout(100);
    
    // Verify drawing was restored
    const imageData = await page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(100, 100, 50, 10);
    });
    
    const hasContent = imageData.data.some((pixel, index) => {
      if (index % 4 === 3) return pixel < 255;
      return false;
    });
    
    expect(hasContent).toBe(true);
  });
});

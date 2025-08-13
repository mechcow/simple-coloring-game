import { Page, expect } from '@playwright/test';

export interface CanvasDrawingResult {
  hasContent: boolean;
  pixelCount: number;
  totalPixels: number;
}

export interface CoordinateTest {
  x: number;
  y: number;
  expectedResult: boolean;
}

export class ColoringGameTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the game to be fully initialized
   */
  async waitForGameReady(): Promise<void> {
    await this.page.waitForSelector('#coloringCanvas');
    await this.page.waitForFunction(() => {
      return window.game && window.game.isInitialized;
    }, { timeout: 10000 });
  }

  /**
   * Select a tool by ID
   */
  async selectTool(toolId: string): Promise<void> {
    await this.page.locator(`#${toolId}`).click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Get canvas element and its bounding box
   */
  async getCanvasInfo() {
    const canvas = this.page.locator('#coloringCanvas');
    const canvasElement = await canvas.elementHandle();
    const boundingBox = await canvasElement!.boundingBox();
    
    return {
      canvas,
      canvasElement,
      boundingBox
    };
  }

  /**
   * Draw a line on the canvas using mouse
   */
  async drawLineWithMouse(startX: number, startY: number, endX: number, endY: number): Promise<void> {
    const { boundingBox } = await this.getCanvasInfo();
    
    await this.page.mouse.move(boundingBox!.x + startX, boundingBox!.y + startY);
    await this.page.mouse.down();
    await this.page.mouse.move(boundingBox!.x + endX, boundingBox!.y + endY);
    await this.page.mouse.up();
    
    await this.page.waitForTimeout(100);
  }

  /**
   * Draw a line on the canvas using touch
   */
  async drawLineWithTouch(startX: number, startY: number, endX: number, endY: number): Promise<void> {
    const { boundingBox } = await this.getCanvasInfo();
    
    await this.page.touchscreen.tap(boundingBox!.x + startX, boundingBox!.y + startY);
    await this.page.touchscreen.tap(boundingBox!.x + endX, boundingBox!.y + endY);
    
    await this.page.waitForTimeout(100);
  }

  /**
   * Check if an area of the canvas has content
   */
  async checkCanvasArea(x: number, y: number, width: number, height: number): Promise<CanvasDrawingResult> {
    const imageData = await this.page.evaluate((area) => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(area.x, area.y, area.width, area.height);
    }, { x, y, width, height });

    const drawnPixels = imageData.data.filter((pixel, index) => {
      if (index % 4 === 3) return pixel < 255; // Alpha channel
      return false;
    });

    return {
      hasContent: drawnPixels.length > 0,
      pixelCount: drawnPixels.length,
      totalPixels: imageData.data.length / 4
    };
  }

  /**
   * Change theme and verify the change
   */
  async changeTheme(themeName: string): Promise<void> {
    const themeButton = this.page.locator(`[data-theme="${themeName}"]`);
    await expect(themeButton).toBeVisible();
    await themeButton.click();
    
    // Verify theme change
    await expect(this.page.locator('body')).toHaveAttribute('data-theme', themeName);
    
    // Check if color palette updated
    await expect(this.page.locator('.color-palette')).toBeVisible();
  }

  /**
   * Select a color from the palette
   */
  async selectColor(colorIndex: number = 0): Promise<string> {
    const colorButton = this.page.locator('.color-palette button').nth(colorIndex);
    const colorValue = await colorButton.getAttribute('data-color');
    
    await colorButton.click();
    
    // Verify color is selected
    await expect(this.page.locator('#colorPicker')).toHaveAttribute('value', colorValue);
    
    return colorValue!;
  }

  /**
   * Test coordinate transformation accuracy
   */
  async testCoordinateTransformation(testPoints: CoordinateTest[]): Promise<void> {
    for (const test of testPoints) {
      const { boundingBox } = await this.getCanvasInfo();
      
      // Draw at test position
      await this.page.touchscreen.tap(boundingBox!.x + test.x, boundingBox!.y + test.y);
      await this.page.waitForTimeout(50);
      
      // Check if drawing occurred
      const result = await this.checkCanvasArea(test.x, test.y, 5, 5);
      expect(result.hasContent).toBe(test.expectedResult);
    }
  }

  /**
   * Test zoom functionality
   */
  async testZoom(zoomDirection: 'in' | 'out'): Promise<number> {
    const initialZoom = await this.page.evaluate(() => {
      return window.game ? window.game.zoomLevel : 1;
    });
    
    const { boundingBox } = await this.getCanvasInfo();
    const wheelDelta = zoomDirection === 'in' ? -100 : 100;
    
    await this.page.mouse.wheel(boundingBox!.x + 400, boundingBox!.y + 300, 0, wheelDelta);
    await this.page.waitForTimeout(100);
    
    const newZoom = await this.page.evaluate(() => {
      return window.game ? window.game.zoomLevel : 1;
    });
    
    if (zoomDirection === 'in') {
      expect(newZoom).toBeGreaterThan(initialZoom);
    } else {
      expect(newZoom).toBeLessThan(initialZoom);
    }
    
    return newZoom;
  }

  /**
   * Test pan functionality
   */
  async testPan(): Promise<{ x: number; y: number }> {
    const initialPan = await this.page.evaluate(() => {
      return window.game ? { x: window.game.panX, y: window.game.panY } : { x: 0, y: 0 };
    });
    
    const { boundingBox } = await this.getCanvasInfo();
    
    // Start panning
    await this.page.mouse.move(boundingBox!.x + 400, boundingBox!.y + 300);
    await this.page.mouse.down();
    await this.page.mouse.move(boundingBox!.x + 300, boundingBox!.y + 200);
    await this.page.mouse.up();
    
    await this.page.waitForTimeout(100);
    
    const newPan = await this.page.evaluate(() => {
      return window.game ? { x: window.game.panX, y: window.game.panY } : { x: 0, y: 0 };
    });
    
    expect(newPan.x).not.toBe(initialPan.x);
    expect(newPan.y).not.toBe(initialPan.y);
    
    return newPan;
  }

  /**
   * Test undo functionality
   */
  async testUndo(): Promise<boolean> {
    // Get initial canvas state
    const initialState = await this.page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });
    
    // Draw something
    await this.drawLineWithMouse(100, 100, 200, 100);
    
    // Undo the action
    await this.page.keyboard.press('Control+Z');
    await this.page.waitForTimeout(100);
    
    // Check if undo worked
    const afterUndo = await this.page.evaluate(() => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      return canvas.toDataURL();
    });
    
    return afterUndo === initialState;
  }

  /**
   * Test save and load functionality
   */
  async testSaveAndLoad(): Promise<boolean> {
    // Draw something
    await this.drawLineWithMouse(100, 100, 150, 100);
    
    // Save game state
    await this.page.keyboard.press('Control+S');
    
    // Clear canvas
    await this.page.locator('#clearCanvas').click();
    
    // Load game state
    await this.page.keyboard.press('Control+O');
    await this.page.waitForTimeout(100);
    
    // Verify drawing was restored
    const result = await this.checkCanvasArea(100, 100, 50, 10);
    return result.hasContent;
  }

  /**
   * Test orientation change handling
   */
  async testOrientationChange(landscapeWidth: number, landscapeHeight: number): Promise<void> {
    // Test landscape orientation
    await this.page.setViewportSize({ width: landscapeWidth, height: landscapeHeight });
    await this.page.waitForTimeout(500);
    
    // Verify canvas is still functional
    const canvas = this.page.locator('#coloringCanvas');
    await expect(canvas).toBeVisible();
    
    // Test drawing in landscape mode
    await this.selectTool('brushTool');
    await this.drawLineWithTouch(200, 100, 250, 100);
    
    // Switch back to portrait
    await this.page.setViewportSize({ width: 393, height: 851 });
    await this.page.waitForTimeout(500);
    
    // Test drawing in portrait mode
    await this.drawLineWithTouch(100, 200, 150, 200);
    
    // Verify both drawings are present
    const landscapeResult = await this.checkCanvasArea(200, 100, 50, 10);
    const portraitResult = await this.checkCanvasArea(100, 200, 50, 10);
    
    expect(landscapeResult.hasContent).toBe(true);
    expect(portraitResult.hasContent).toBe(true);
  }

  /**
   * Get game state information
   */
  async getGameState() {
    return await this.page.evaluate(() => {
      if (window.game) {
        return {
          zoomLevel: window.game.zoomLevel,
          panX: window.game.panX,
          panY: window.game.panY,
          canvasScaleX: window.game.canvasScaleX,
          canvasScaleY: window.game.canvasScaleY,
          isInitialized: window.game.isInitialized
        };
      }
      return null;
    });
  }

  /**
   * Verify touch-friendly UI elements
   */
  async verifyTouchFriendlyUI(): Promise<void> {
    // Check tool buttons
    const tools = ['brushTool', 'eraserTool', 'fillTool'];
    
    for (const tool of tools) {
      const button = this.page.locator(`#${tool}`);
      await expect(button).toBeVisible();
      
      const boundingBox = await button.boundingBox();
      // Touch targets should be at least 44x44 pixels for accessibility
      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
    }
    
    // Check color palette buttons
    const colorPalette = this.page.locator('.color-palette');
    await expect(colorPalette).toBeVisible();
    
    const firstColorButton = this.page.locator('.color-palette button').first();
    const colorButtonBox = await firstColorButton.boundingBox();
    
    expect(colorButtonBox!.width).toBeGreaterThanOrEqual(30);
    expect(colorButtonBox!.height).toBeGreaterThanOrEqual(30);
  }
}


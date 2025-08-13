# Coloring Game Test Suite

This directory contains a comprehensive Playwright test suite for the Simple Coloring Game application. The tests cover both web and mobile functionality, with specific focus on the coordinate transformation fixes we implemented for mobile devices.

## Test Structure

### Test Files

- **`coloring-game.web.spec.ts`** - Desktop web browser tests (Chrome, Firefox, Safari)
- **`coloring-game.mobile.spec.ts`** - Mobile device tests (Android, iOS)
- **`coloring-game.android.spec.ts`** - Android-specific simulation tests
- **`utils/test-helpers.ts`** - Reusable test utility functions

### Test Categories

#### Web Tests (`@web`)
- ✅ Basic game loading and UI verification
- ✅ Theme changing functionality
- ✅ Brush tool drawing
- ✅ Eraser tool functionality
- ✅ Fill tool functionality
- ✅ Color selection and application
- ✅ **Zoom in/out functionality**
- ✅ **Pan functionality**
- ✅ Undo/Redo operations
- ✅ Save/Load game state

#### Mobile Tests (`@mobile`)
- ✅ Mobile-optimized layout verification
- ✅ Touch event handling for all tools
- ✅ Mobile-specific UI element sizing
- ✅ Orientation change handling
- ✅ Touch event cancellation
- ✅ Touch gesture support

#### Android Tests (`@android`)
- ✅ Android-specific coordinate calculations
- ✅ Touch events with proper coordinate scaling
- ✅ High-DPI display handling
- ✅ Orientation changes with coordinate recalculation
- ✅ Complex touch event sequences
- ✅ Viewport change handling
- ✅ Coordinate transformation edge cases
- ✅ Touch pressure simulation

## Prerequisites

### Node.js
- Version 16.0.0 or higher
- npm or yarn package manager

### Dependencies
```bash
npm install
```

### Browser Installation
```bash
npm run install-browsers
```

## Running Tests

### All Tests
```bash
npm test
```

### Web Tests Only
```bash
npm run test:web
```

### Mobile Tests Only
```bash
npm run test:mobile
```

### Android Tests Only
```bash
npm run test:android
```

### Headful Mode (See browser)
```bash
npm run test:headful
```

### Debug Mode
```bash
npm run test:debug
```

### Interactive UI Mode
```bash
npm run test:ui
```

## Test Configuration

### Playwright Config (`playwright.config.ts`)

The configuration includes:

- **Web Browsers**: Chrome, Firefox, Safari
- **Mobile Devices**: Pixel 5 (Android), iPhone 12 (iOS)
- **Android Simulation**: Specific Android configuration with high-DPI support
- **Web Server**: Automatic local server startup on port 3000
- **Reporting**: HTML, JSON, and JUnit report formats

### Device Configurations

#### Android Simulation
```typescript
{
  name: 'android-simulation',
  use: { 
    ...devices['Pixel 5'],
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true
  }
}
```

#### Mobile Devices
- **Android Chrome**: Pixel 5 with Chrome user agent
- **Android Firefox**: Pixel 5 with Firefox user agent
- **iOS Safari**: iPhone 12 with Safari user agent

## Test Utilities

### ColoringGameTestHelpers

The `ColoringGameTestHelpers` class provides reusable methods for common testing operations:

```typescript
const helpers = new ColoringGameTestHelpers(page);

// Wait for game to be ready
await helpers.waitForGameReady();

// Select a tool
await helpers.selectTool('brushTool');

// Draw with mouse or touch
await helpers.drawLineWithMouse(100, 100, 200, 100);
await helpers.drawLineWithTouch(100, 100, 200, 100);

// Check canvas content
const result = await helpers.checkCanvasArea(100, 100, 50, 10);

// Change themes
await helpers.changeTheme('dark');

// Test coordinate transformations
await helpers.testCoordinateTransformation([
  { x: 100, y: 100, expectedResult: true },
  { x: 200, y: 200, expectedResult: true }
]);
```

## Key Test Scenarios

### 1. Coordinate Transformation Testing

Tests specifically verify the mobile coordinate calculation fixes:

```typescript
test('should handle Android-specific coordinate calculations', async ({ page }) => {
  // Test drawing at various positions to verify coordinate accuracy
  const testPositions = [
    { x: 100, y: 100 },
    { x: 200, y: 200 },
    { x: 300, y: 300 }
  ];
  
  for (const pos of testPositions) {
    await page.touchscreen.tap(boundingBox!.x + pos.x, boundingBox!.y + pos.y);
    
    // Verify the pixel was drawn at the correct location
    const imageData = await page.evaluate((position) => {
      const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      return ctx!.getImageData(position.x, position.y, 5, 5);
    }, pos);
    
    // Check if any pixels were drawn in the area
    const hasContent = imageData.data.some((pixel, index) => {
      if (index % 4 === 3) return pixel < 255;
      return false;
    });
    
    expect(hasContent).toBe(true);
  }
});
```

### 2. Fill Tool Testing

Tests the fill tool specifically (which had coordinate issues):

```typescript
test('should handle Android touch events with proper coordinate scaling', async ({ page }) => {
  await page.locator('#fillTool').click();
  
  // Test fill at different positions
  const fillPositions = [
    { x: 400, y: 300 },
    { x: 200, y: 400 },
    { x: 600, y: 200 }
  ];
  
  for (const pos of fillPositions) {
    // Get canvas state before and after fill
    const beforeFill = await page.evaluate(/* ... */);
    await page.touchscreen.tap(boundingBox!.x + pos.x, boundingBox!.y + pos.y);
    const afterFill = await page.evaluate(/* ... */);
    
    // Verify fill changed the area
    expect(afterFill.pixelCount).not.toBe(beforeFill.pixelCount);
  }
});
```

### 3. High-DPI Display Testing

Tests canvas optimization for high-DPI displays:

```typescript
test('should handle Android device pixel ratio correctly', async ({ page }) => {
  const devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);
  
  // Verify canvas is optimized for high-DPI
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.getElementById('coloringCanvas') as HTMLCanvasElement;
    return {
      width: canvas.width,
      height: canvas.height,
      devicePixelRatio: window.devicePixelRatio
    };
  });
  
  // Canvas should have appropriate dimensions for high-DPI
  expect(canvasInfo.width).toBeGreaterThanOrEqual(800);
  expect(canvasInfo.height).toBeGreaterThanOrEqual(600);
});
```

## Test Reports

After running tests, you can view detailed reports:

### HTML Report
```bash
npm run show-report
```

### Report Location
- **HTML**: `playwright-report/index.html`
- **JSON**: `test-results/results.json`
- **JUnit**: `test-results/results.xml`

## Continuous Integration

The test suite is configured for CI environments:

- **Retries**: 2 retries on CI, 0 on local
- **Workers**: 1 worker on CI for stability
- **Forbid Only**: Prevents `test.only()` in CI
- **Timeout**: 120 seconds for web server startup

## Troubleshooting

### Common Issues

1. **Canvas not found**: Ensure the game is fully loaded before testing
2. **Touch events not working**: Verify mobile device configuration
3. **Coordinate mismatches**: Check if CSS scaling is properly handled

### Debug Mode

Use debug mode to step through tests:

```bash
npm run test:debug
```

### Verbose Logging

Enable verbose logging in Playwright config:

```typescript
use: {
  trace: 'on',
  screenshot: 'on',
  video: 'on'
}
```

## Adding New Tests

### Test Structure
```typescript
test('should [expected behavior]', async ({ page }) => {
  // Arrange
  await page.goto('/');
  await helpers.waitForGameReady();
  
  // Act
  await helpers.selectTool('brushTool');
  await helpers.drawLineWithMouse(100, 100, 200, 100);
  
  // Assert
  const result = await helpers.checkCanvasArea(100, 100, 100, 10);
  expect(result.hasContent).toBe(true);
});
```

### Test Helpers
Extend `ColoringGameTestHelpers` for new functionality:

```typescript
async testNewFeature(): Promise<void> {
  // Implementation
}
```

## Performance Considerations

- **Parallel Execution**: Tests run in parallel by default
- **Resource Cleanup**: Global teardown ensures clean state
- **Timeout Management**: Appropriate timeouts for different operations
- **Memory Management**: Canvas state verification without excessive memory usage

## Browser Compatibility

### Supported Browsers
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Android Chrome, Android Firefox, iOS Safari
- **Android Simulation**: High-DPI Android device simulation

### Mobile-Specific Features
- Touch event handling
- Viewport adaptation
- Orientation change handling
- High-DPI display optimization

## Future Enhancements

- [ ] Performance benchmarking tests
- [ ] Accessibility testing
- [ ] Cross-browser visual regression testing
- [ ] Load testing for large canvases
- [ ] Memory leak detection
- [ ] Network condition simulation


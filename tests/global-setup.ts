import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the app to ensure it's working
  await page.goto('http://localhost:3000');

  // Wait for the canvas to be ready
  await page.waitForSelector('#coloringCanvas', { timeout: 10000 });

  // Check if the game is initialized by looking for the isInitialized property
  await page.waitForFunction(() => {
    return (window as any).game && (window as any).game.isInitialized;
  }, { timeout: 10000 });

  console.log('✅ Global setup completed - coloring game is ready for testing');

  await browser.close();
}

export default globalSetup;

import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Listen for console events and print them
        page.on('console', lambda msg: print(f'Browser console: {msg.text()}'))

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('index.html')

        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # Click the 'Fairy' theme button to trigger the modal
        await page.locator('.theme-btn[data-theme="fairy"]').click()

        # Select the first fairy design
        await page.locator('.fairy-option[data-fairy="fairy-1"]').click()

        # A generous wait to ensure the image has had time to draw onto the canvas
        await page.wait_for_timeout(3000)

        # Zoom in twice
        zoom_in_button = page.locator('#zoomIn')
        await zoom_in_button.click()
        await zoom_in_button.click()

        # Select the fill tool
        await page.locator('.tool-btn[data-tool="fill"]').click()

        # Select a color (red)
        await page.locator('.color-swatch[data-color="#FF0000"]').click()

        canvas = page.locator('#coloringCanvas')
        bounding_box = await canvas.bounding_box()
        if bounding_box:
            # Click point carefully chosen to be inside a fillable white area of the wing
            fill_x = bounding_box['x'] + (bounding_box['width'] * 0.55)
            fill_y = bounding_box['y'] + (bounding_box['height'] * 0.4)
            await page.mouse.click(fill_x, fill_y)

        # A brief pause to ensure rendering is visually complete
        await page.wait_for_timeout(1000)

        # Take a final screenshot
        await page.screenshot(path='jules-scratch/verification/verification.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())

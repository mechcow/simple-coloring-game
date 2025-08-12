import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        # Use a mobile viewport to test the fix
        iphone_11 = p.devices['iPhone 11']
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(**iphone_11)
        page = await context.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('index.html')

        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # A generous wait to ensure the initial resize handler has fired and the image is loaded.
        await page.wait_for_timeout(3000)

        # Take a "before" screenshot to verify scaling
        await page.screenshot(path='jules-scratch/verification/verification_before.png')

        canvas = page.locator('#coloringCanvas')
        bounding_box = await canvas.bounding_box()

        if not bounding_box:
            raise Exception("Could not find canvas bounding box")

        # --- Test Fill Tool ---
        await page.locator('.tool-btn[data-tool="fill"]').click()
        await page.locator('.color-swatch[data-color="#FF0000"]').click() # Red
        # Click a point in the upper part of the wing
        await page.mouse.click(bounding_box['x'] + bounding_box['width'] * 0.45, bounding_box['y'] + bounding_box['height'] * 0.3)
        await page.wait_for_timeout(500) # Wait for fill to render

        # --- Test Brush Tool ---
        await page.locator('.tool-btn[data-tool="brush"]').click()
        await page.locator('.color-swatch[data-color="#0000FF"]').click() # Blue
        # Draw a diagonal line across the canvas
        await page.mouse.move(bounding_box['x'] + 20, bounding_box['y'] + 20)
        await page.mouse.down()
        await page.mouse.move(bounding_box['x'] + bounding_box['width'] - 20, bounding_box['y'] + bounding_box['height'] - 20)
        await page.mouse.up()
        await page.wait_for_timeout(500) # Wait for stroke to render

        # Take the final screenshot
        await page.screenshot(path='jules-scratch/verification/verification_final.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())

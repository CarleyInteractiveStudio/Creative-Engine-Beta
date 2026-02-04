import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:8000/editor.html');
    await page.waitForFunction(() => {
      const overlay = document.getElementById('loading-overlay');
      return overlay && overlay.classList.contains('hidden');
    }, { timeout: 10000 });
    await page.screenshot({ path: '/home/jules/verification/final_load.png', fullPage: true });
    console.log("Screenshot saved.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
})();

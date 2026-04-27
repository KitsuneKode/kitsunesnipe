import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Sniffing Miruro Search (Interactive)...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('secure/pipe?e=')) {
            const e = url.split('e=').pop();
            const decoded = Buffer.from(e!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
            console.log(`\n[PIPE_QUERY] ${decoded}`);
        }
    });

    try {
        await page.goto("https://www.miruro.tv/search", { waitUntil: "networkidle" });
        
        console.log("Typing 'one piece'...");
        await page.locator('input[type="text"]').first().fill('one piece');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

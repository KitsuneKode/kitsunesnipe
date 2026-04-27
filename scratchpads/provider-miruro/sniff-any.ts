import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Searching for ANY request with 'one' or 'piece'...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.toLowerCase().includes('one') || url.toLowerCase().includes('piece')) {
            console.log(`\n[FOUND_URL] ${url}`);
            if (url.includes('secure/pipe?e=')) {
                const e = url.split('e=').pop();
                const decoded = Buffer.from(e!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
                console.log(`[DECODED_PIPE] ${decoded}`);
            }
        }
    });

    try {
        await page.goto("https://www.miruro.tv/search?search=one%20piece", { waitUntil: "commit" });
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

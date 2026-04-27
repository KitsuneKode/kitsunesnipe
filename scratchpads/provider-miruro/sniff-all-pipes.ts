import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Capturing ALL pipe queries on Miruro page load...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('secure/pipe?e=')) {
            const e = url.split('e=').pop();
            if (e) {
                const decoded = Buffer.from(e.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
                console.log(`\n[PIPE_REQ] ${decoded}`);
            }
        }
    });

    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(20000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

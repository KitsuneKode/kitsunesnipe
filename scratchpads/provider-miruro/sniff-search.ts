import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Sniffing exact search parameters for Miruro...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('secure/pipe?e=')) {
            const e = url.split('e=').pop();
            const decoded = Buffer.from(e!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
            console.log(`\n[PIPE_QUERY] ${decoded}`);
            console.log(`[URL] ${url}`);
        }
    });

    try {
        await page.goto("https://www.miruro.tv/search?search=one%20piece", { waitUntil: "commit" });
        await page.waitForTimeout(15000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

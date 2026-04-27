import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Sniffing exact search + episode headers on Miruro...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('secure/pipe?e=')) {
            const e = url.split('e=').pop();
            const decoded = Buffer.from(e!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
            console.log(`\n[PIPE_HIT] Path: ${JSON.parse(decoded).path}`);
            console.log(`[HEADERS]`, JSON.stringify(req.headers(), null, 2));
        }
    });

    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

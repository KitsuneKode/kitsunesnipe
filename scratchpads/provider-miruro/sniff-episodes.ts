import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Sniffing exact Miruro EPISODES query for ID 21...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('secure/pipe?e=')) {
            const e = url.split('e=').pop();
            const decoded = Buffer.from(e!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
            if (decoded.includes('episodes')) {
                console.log(`\n[EPISODES_QUERY] ${decoded}`);
            }
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

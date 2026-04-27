import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Sniffing exact search HEADERS on Miruro...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('secure/pipe?e=')) {
            const e = url.split('e=').pop();
            const decoded = Buffer.from(e!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
            if (decoded.includes('search')) {
                console.log(`\n[SEARCH_API_HIT] URL: ${url}`);
                console.log(`[HEADERS]`, JSON.stringify(req.headers(), null, 2));
                console.log(`[QUERY_JSON] ${decoded}`);
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

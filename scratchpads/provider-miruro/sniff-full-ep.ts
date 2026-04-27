import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Deep sniffing episode list network details on Miruro...");
    
    page.on('request', req => {
        const url = req.url();
        if (url.includes('episodes')) {
            console.log(`\n[EPISODES_REQ] URL: ${url}`);
            console.log(`[HEADERS]`, JSON.stringify(req.headers(), null, 2));
        }
    });

    page.on('response', async res => {
        const url = res.url();
        if (url.includes('episodes')) {
            console.log(`\n[EPISODES_RES] URL: ${url}`);
            console.log(`[RES_HEADERS]`, JSON.stringify(res.headers(), null, 2));
            try {
                const text = await res.text();
                console.log(`[RES_BODY_PREFIX] ${text.substring(0, 50)}`);
            } catch (e) {}
        }
    });

    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(15000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

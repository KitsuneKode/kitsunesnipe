import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Deep tracing 'ONE PIECE' in JSON.parse...");
    
    await page.addInitScript(() => {
        const originalParse = JSON.parse;
        (window as any).JSON.parse = function(text: string) {
            if (typeof text === 'string' && text.includes('ONE PIECE')) {
                console.log(`\n[SEARCH_HIT] Data detected! Preview: ${text.substring(0, 100)}`);
                console.log(`[STACK]\n${new Error().stack}`);
            }
            return originalParse.apply(this, [text]);
        };
    });

    page.on('console', msg => {
        if (msg.text().includes('[SEARCH_HIT]') || msg.text().includes('[STACK]')) {
            console.log(msg.text());
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

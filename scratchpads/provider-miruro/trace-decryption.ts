import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Deep tracing Miruro decryption stack...");
    
    await page.addInitScript(() => {
        const originalParse = JSON.parse;
        (window as any).JSON.parse = function(text: string) {
            if (typeof text === 'string' && (text.includes('"url"') || text.includes('"sources"'))) {
                console.log(`\n[DECRYPT_HIT] Decrypted data detected in JSON.parse!`);
                console.log(`[DATA_PREVIEW] ${text.substring(0, 200)}`);
                console.log(`[CALL_STACK]\n${new Error().stack}`);
            }
            return originalParse.apply(this, [text]);
        };
    });

    page.on('console', msg => {
        if (msg.text().includes('[DECRYPT_HIT]') || msg.text().includes('[CALL_STACK]') || msg.text().includes('[DATA_PREVIEW]')) {
            console.log(msg.text());
        }
    });

    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        // Let it run for a while to capture multiple AJAX hits
        await page.waitForTimeout(20000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

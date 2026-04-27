import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Deep tracing Miruro pipe response processing...");
    
    await page.addInitScript(() => {
        const originalText = Response.prototype.text;
        Response.prototype.text = async function() {
            const result = await originalText.apply(this);
            if (this.url.includes('secure/pipe') && result.startsWith('bh4YNPj7')) {
                console.log(`\n[PIPE_RAW] Hit: ${this.url}`);
                // We hook JSON.parse to see who eventually gets the result
                const originalParse = JSON.parse;
                window.JSON.parse = function(text: string) {
                    if (typeof text === 'string' && (text.includes('"url"') || text.includes('"sources"'))) {
                         console.log(`[DECRYPTED_JSON_HIT] decrypted string captured!`);
                         console.log(`[STACK_TRACE]\n${new Error().stack}`);
                         // Restore original parse to avoid loops
                         window.JSON.parse = originalParse;
                    }
                    return originalParse.apply(this, [text]);
                };
            }
            return result;
        };
    });

    page.on('console', msg => {
        if (msg.text().includes('[PIPE_') || msg.text().includes('_HIT') || msg.text().includes('[STACK_TRACE]')) {
            console.log(msg.text());
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

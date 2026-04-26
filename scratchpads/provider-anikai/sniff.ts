import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await context.addInitScript(() => {
        // Hook getAttribute
        const originalGetAttribute = Element.prototype.getAttribute;
        Element.prototype.getAttribute = function(name: string) {
            if (name === 'data-meta') {
                const stack = new Error().stack;
                console.log(`[HOOK] data-meta read. Stack:\n${stack}`);
            }
            return originalGetAttribute.apply(this, arguments);
        };

        // Hook JSON.parse to see the decrypted content
        const originalParse = JSON.parse;
        (JSON as any).parse = function(text: string) {
            const result = originalParse.apply(this, arguments);
            // If the JSON looks like episode or link data, log it
            if (result && (result.episodes || result.sources || result.links)) {
                console.log(`[HOOK] JSON.parse intercepted significant data:`, JSON.stringify(result).substring(0, 500));
            }
            return result;
        };
    });

    page.on('console', msg => console.log('PAGE:', msg.text()));

    console.log("Loading Anikai watch page...");
    await page.goto("https://anikai.to/watch/one-piece-dk6r", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10000);

    await browser.close();
})();

import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Hooking 'pipe' response flow...");
    
    await page.addInitScript(() => {
        const originalText = Response.prototype.text;
        Response.prototype.text = async function() {
            const result = await originalText.apply(this);
            if (this.url.includes('secure/pipe')) {
                // When text() is called on a pipe response, 
                // we want to see WHO called it and where the string GOES.
                console.log(`\n[PIPE_TEXT_CALLED] URL: ${this.url}`);
                console.log(`[STACK]\n${new Error().stack}`);
            }
            return result;
        };
        
        // Also hook the crypto methods as backup
        const originalImportKey = crypto.subtle.importKey;
        crypto.subtle.importKey = function(...args: any[]) {
            console.log(`\n[CRYPTO_IMPORT] Type: ${args[2].name || args[2]}`);
            return originalImportKey.apply(this, args);
        };
    });

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[PIPE_') || text.includes('[CRYPTO_') || text.includes('[STACK]')) {
            console.log(text);
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

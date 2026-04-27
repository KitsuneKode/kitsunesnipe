import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Locating Miruro's exact decryption function...");
    
    await page.addInitScript(() => {
        const originalText = Response.prototype.text;
        Response.prototype.text = async function() {
            const result = await originalText.apply(this);
            if (this.url.includes('secure/pipe') && result.startsWith('bh4YNPj7')) {
                console.log(`[DECRYPT_START] Data prefix: ${result.substring(0, 20)}`);
            }
            return result;
        };

        // We'll hook the decode method of TextDecoder
        const originalDecode = TextDecoder.prototype.decode;
        TextDecoder.prototype.decode = function(input: any) {
            const result = originalDecode.apply(this, [input]);
            if (result.includes('"url"') || result.includes('"sources"')) {
                // When we hit this, we look at the stack to find the function 
                // that called TextDecoder.decode with the decrypted bytes.
                const stack = new Error().stack;
                console.log(`[DECRYPT_END] Decoded JSON length: ${result.length}`);
                console.log(`[DECRYPT_STACK]\n${stack}`);
            }
            return result;
        };
    });

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[DECRYPT_')) {
            console.log(text);
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

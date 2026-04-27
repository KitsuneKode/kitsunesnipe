import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Analyzing 'zi' function in live context...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(5000);

        const data = await page.evaluate(() => {
            // Since we know the index script call site, we can try to find the variable in its scope
            // but for now let's see if it's exported or global.
            
            // Heuristic: search all global functions for Gzip-like behavior
            // or just return the toString of zi if we can find it.
            
            return {
                isNativeTextDecoder: typeof TextDecoder !== 'undefined',
                // We'll search for the function that was called zi in our grep
            };
        });

        console.log("Live Info:", data);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

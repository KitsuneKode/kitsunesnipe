import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: "Mozilla/5.0" });
    const page = await context.newPage();

    console.log("Loading Anikai...");
    try {
        await page.goto("https://anikai.to/watch/one-piece-dk6r", { waitUntil: "commit" });
        await page.waitForSelector('#syncData', { timeout: 15000 });
        await page.waitForTimeout(3000);

        const result = await page.evaluate(() => {
            const input = (window as any).__$;
            // Use the token we know is valid for this page
            const target = "xQm9tJfLwGhz_0Eq8S_YAHYkwp-qQPLfm50W5fxnyd30nAY";
            
            let foundFn: string = "";
            
            // Search all functions in the global scope
            for (let key in window) {
                try {
                    if (typeof (window as any)[key] === 'function') {
                        const out = (window as any)[key](input);
                        if (out === target) return "window." + key;
                    }
                } catch(e) {}
            }
            return "not found in global window";
        });

        console.log("Token Generator:", result);

    } catch (e) {
        console.error("Failed:", e.message);
    }
    await browser.close();
})();

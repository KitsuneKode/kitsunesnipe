import { chromium } from "playwright";
import { writeFileSync } from "fs";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Downloading index script...");
    try {
        await page.goto("https://www.miruro.tv/", { waitUntil: "commit" });
        const src = await page.evaluate(() => {
            const s = document.querySelector('script[src*="assets/index-"]') as HTMLScriptElement;
            return s ? s.src : null;
        });

        if (src) {
            console.log(`Found script: ${src}`);
            const res = await page.evaluate(async (url) => {
                const r = await fetch(url);
                return await r.text();
            }, src);
            writeFileSync('scratchpads/provider-miruro/index.js', res);
            console.log("Saved script to index.js");
        } else {
            console.error("Script not found");
        }

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

import { chromium } from "playwright";
import { writeFileSync } from "fs";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Extracting large context from index script...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        
        const code = await page.evaluate(async () => {
            const src = "https://www.miruro.tv/assets/index-CVadNOyc.js";
            const res = await fetch(src);
            const text = await res.text();
            
            const idx = 81862;
            return text.substring(idx - 10000, idx + 2000);
        });

        console.log("Code Context (Snippet):\n", code.substring(0, 1000));
        writeFileSync('scratchpads/provider-miruro/logic-block.js', code);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

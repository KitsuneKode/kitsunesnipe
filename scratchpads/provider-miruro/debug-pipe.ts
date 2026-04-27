import { chromium } from "playwright";
import { writeFileSync } from "fs";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Analyzing Miruro search + episode list via direct JS execution...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "networkidle" });
        
        // Let's try to get the raw JSON for episodes from the browser context
        const data = await page.evaluate(async () => {
            const e = btoa(JSON.stringify({
                path: "episodes",
                method: "GET",
                query: { anilistId: "21" },
                body: null,
                version: "0.2.0"
            })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
            
            const res = await fetch(`/api/secure/pipe?e=${e}`);
            return await res.text();
        });

        console.log("Decrypted Episode Data Prefix (Raw):", data.substring(0, 50));
        writeFileSync('scratchpads/provider-miruro/ep-raw.blob', data);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

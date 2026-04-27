import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Analyzing Miruro search via live fetch...");
    try {
        await page.goto("https://www.miruro.tv/search", { waitUntil: "commit" });
        await page.waitForTimeout(5000);

        const data = await page.evaluate(async () => {
            const query = {
                path: "search",
                method: "GET",
                query: { q: "one piece", limit: 15, offset: 0, type: "ANIME" },
                body: null,
                version: "0.2.0"
            };
            const e = btoa(JSON.stringify(query)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
            const res = await fetch(`/api/secure/pipe?e=${e}`);
            const text = await res.text();
            
            return {
                e,
                prefix: text.substring(0, 40),
                length: text.length
            };
        });

        console.log("Live Fetch Result:", data);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

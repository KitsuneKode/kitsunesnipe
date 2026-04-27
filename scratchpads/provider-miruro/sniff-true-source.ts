import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Searching for TRUE search data source on Miruro...");
    
    page.on('response', async res => {
        const url = res.url();
        if (url.includes('api') || url.includes('gql') || url.includes('graphql')) {
            try {
                const text = await res.text();
                if (text.toLowerCase().includes('one piece')) {
                    console.log(`\n[SOURCE_FOUND] URL: ${url}`);
                    console.log(`[BODY_HEAD] ${text.substring(0, 300)}`);
                }
            } catch (e) {}
        }
    });

    try {
        await page.goto("https://www.miruro.tv/search?search=one%20piece", { waitUntil: "commit" });
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

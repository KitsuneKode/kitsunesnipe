import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Fetching Miruro Search SSR data...");
    try {
        await page.goto("https://www.miruro.tv/search?search=one%20piece", { waitUntil: "commit" });
        await page.waitForTimeout(5000);

        const ssrData = await page.evaluate(() => {
            // Some sites hide data in global variables
            return {
                env: (window as any).env,
                ssr: (window as any).__SSR_CONFIG__,
                apollo: (window as any).__APOLLO_STATE__
            };
        });

        console.log("SSR Data:", JSON.stringify(ssrData, null, 2));

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

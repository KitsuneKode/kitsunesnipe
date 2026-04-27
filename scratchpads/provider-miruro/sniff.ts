import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('request', request => {
        const url = request.url();
        if (url.includes('api') || url.includes('gql') || url.includes('graphql') || url.includes('.m3u8')) {
            console.log(`\n>> [MIRURO REQ] ${request.method()} ${url}`);
        }
    });

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('api') || url.includes('graphql')) {
            try {
                const text = await response.text();
                console.log(`<< [MIRURO RES] ${url}\n   BODY: ${text.substring(0, 500)}`);
            } catch (e) {}
        }
    });

    console.log("Sniffing Miruro for One Piece Ep 1159...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1159", { waitUntil: "networkidle" });
        await page.waitForTimeout(10000);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

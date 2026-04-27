import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Capturing cookies for Miruro 0-RAM mode...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "networkidle" });
        const cookies = await page.context().cookies();
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log(`\n[COOKIE_STR] ${cookieStr}`);
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

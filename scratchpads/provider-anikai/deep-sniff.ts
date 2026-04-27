import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Loading Anikai to inspect ArtPlayer...");
    try {
        await page.goto("https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47#ep=1", { waitUntil: "networkidle" });
        
        console.log("Waiting for servers...");
        await page.waitForSelector('.server', { timeout: 30000 });
        
        console.log("Clicking Server 1...");
        await page.click('.server');
        await page.waitForTimeout(5000);

        const source = await page.evaluate(() => {
            // ArtPlayer usually stores instance on the element or in a global
            // Let's try to find it
            const art = (window as any).art || (window as any).player;
            if (art && art.url) return art.url;
            
            // Check all video elements
            const video = document.querySelector('video');
            if (video) return video.src;

            return "source not found in evaluate";
        });

        console.log("Extracted Source:", source);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

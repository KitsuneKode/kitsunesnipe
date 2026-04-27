import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Analyzing Miruro search discovery via live DOM hooks...");
    
    try {
        await page.goto("https://www.miruro.tv/search?search=one%20piece", { waitUntil: "commit" });
        await page.waitForTimeout(10000);

        const data = await page.evaluate(() => {
            // Find an element that contains "One Piece"
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            const results = [];
            while (node = walker.nextNode()) {
                if (node.textContent?.toLowerCase().includes('one piece')) {
                    results.push({
                        text: node.textContent,
                        parent: (node.parentElement as HTMLElement).tagName,
                        classes: (node.parentElement as HTMLElement).className
                    });
                }
            }
            return results;
        });

        console.log("Found DOM nodes:", data.slice(0, 5));

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

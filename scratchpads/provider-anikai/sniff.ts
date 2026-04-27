import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    async function getToken(slug: string) {
        let sessionToken = "";
        page.on('request', req => {
            const url = req.url();
            if (url.includes('&_=')) {
                const token = url.split('&_=').pop();
                if (token && token.length > 20) sessionToken = token;
            }
        });
        await page.goto(`https://anikai.to/watch/${slug}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(8000);
        return sessionToken;
    }

    const t1 = await getToken("one-piece-dk6r");
    console.log("One Piece Run 1:", t1);
    
    // Just re-nav to see if it changes
    const t2 = await getToken("one-piece-dk6r");
    console.log("One Piece Run 2:", t2);

    await browser.close();
})();

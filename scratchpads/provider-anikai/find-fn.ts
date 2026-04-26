import { chromium } from "playwright";
import { writeFileSync } from "fs";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Loading Anikai watch page...");
    await page.goto("https://anikai.to/watch/one-piece-dk6r", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const result = await page.evaluate(() => {
        // Look for the 'r' object which has the key 355848
        let foundR: any = null;
        
        // Search through window properties
        for (let key in window) {
            try {
                const val = (window as any)[key];
                if (val && typeof val === 'object' && val[355848]) {
                    foundR = val;
                    break;
                }
            } catch(e) {}
        }
        
        if (!foundR) return "R object not found in window";
        
        // Now brute force decrypt with all functions in R
        const allStrings: any = {};
        for (let key in foundR) {
            if (typeof foundR[key] === 'function') {
                const set: any = {};
                let count = 0;
                for (let i = 0; i < 2000; i++) {
                    try {
                        const s = foundR[key](i);
                        if (typeof s === 'string' && s.length > 0 && s.length < 500 && !s.includes('function')) {
                            set[i] = s;
                            count++;
                        }
                    } catch(e) {}
                }
                if (count > 20) {
                    allStrings[key] = set;
                }
            }
        }
        return allStrings;
    });

    console.log("Result:", typeof result === 'string' ? result : `Found ${Object.keys(result).length} string sets`);
    if (typeof result !== 'string') {
        writeFileSync('scratchpads/provider-anikai/decrypted-strings.json', JSON.stringify(result, null, 2));
    }

    await browser.close();
})();

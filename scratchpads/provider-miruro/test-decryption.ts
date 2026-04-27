import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Attempting to decrypt Miruro data using discovered keys...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(10000);

        const result = await page.evaluate(async () => {
            const pipeKey = "71951034f8fbcf53d89db52ceb3dc22c";
            const encryptedData = "bh4YNPj7z1PYnmC-plIWHGET7_9kuDNC_2xPak53sgRtxT8U9gVVlZKr-z-QcHn2jhsydFTD21qpHW5k2M9p2wjplhlVpdBkiAJ7vDw01iBYuIsWHF88x4ZMA-LOZvX7WLt0rM65lBH9PLtXL-vYQFwyFq2Uf6QpGySOHEI4qFHhG5n6wSXGuIP20c_xUeoW1thXVnEOfprKt_1jYOJBi3y_aPiC8SZazK2fxekoblL6xl4VNlsBA1rWtgSd3XausBKXFXkhgHzNRV2QNmIgsfGfZELZeU1-wzW12VcyyPK14B1SCuR9itteQ_ZNTTCMIdqL6wsrYC1l34S62-s0J_De5R9d5OQcBlN6MwRzLpKUen9LbgmIsAVi4sdQQbMBjk5HFazr6Rtfz8H6nqk7wqG2f7Av91JFBP02jt5vkQ0duqTEdJmI6jbMRfLKn3Jw4sniWwQMM1aWwetdAcSd7OVD7NMKMHfnPUB4wdOr1cmO5o0Krxutyn81aPmV7EGDOg0ZKj_jLqHN-Zmr_RXGLHE";
            
            // Search global scope for ANY function that takes a string and the pipeKey
            const results: any[] = [];
            
            function scan(obj: any, path: string, depth: number) {
                if (depth > 3) return;
                try {
                    for (let key in obj) {
                        if (typeof obj[key] === 'function') {
                            try {
                                // We try to call suspicious functions with our data
                                // But only if they look like decryption routines
                                const code = obj[key].toString();
                                if (code.includes('CryptoJS') || code.includes('subtle') || key.length < 3) {
                                     // Be careful not to break the page
                                }
                            } catch(e) {}
                        } else if (obj[key] && typeof obj[key] === 'object' && obj[key] !== window) {
                            scan(obj[key], path + "." + key, depth + 1);
                        }
                    }
                } catch(e) {}
            }

            // Instead of blind scanning, let's find the function at 273:81862 again
            // and see what's NEXT to it.
            
            return {
                pipeKey,
                prefix: encryptedData.substring(0, 8)
            };
        });

        console.log("Evaluation Result:", result);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

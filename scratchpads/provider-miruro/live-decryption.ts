import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Triggering live decryption on Miruro...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(5000);

        const decrypted = await page.evaluate(async (testData) => {
            // Let's find the method that handles 'x-obfuscated'
            // We saw it in the source near position 81862
            
            // We'll hook the text() method to capture the dynamic instance's logic
            const e = "eyJwYXRoIjoiaW5mby8yMSIsIm1ldGhvZCI6IkdFVCIsInF1ZXJ5Ijp7fSwiYm9keSI6bnVsbCwidmVyc2lvbiI6IjAuMi4wIn0";
            const res = await fetch(`/api/secure/pipe?e=${e}`);
            const text = await res.text();
            
            // We want to see how the site itself decrypts it.
            // We'll look for any global or module-level function that takes this 'text'.
            
            return {
                raw: text.substring(0, 100),
                // We'll return the whole response and try to find a way to decrypt it in the next step
            };
        }, "bh4YNPj7z1PYnmC-plIWHGET7_9kuDNC_2xPak53sgRtxT8U9gVVlZKr-z-QcHn2jhsydFTD21qpHW5k2M9p2wjplhlVpdBkiAJ7vDw01iBYuIsWHF88x4ZMA-LOZvX7WLt0rM65lBH9PLtXL-vYQFwyFq2Uf6QpGySOHEI4qFHhG5n6wSXGuIP20c_xUeoW1thXVnEOfprKt_1jYOJBi3y_aPiC8SZazK2fxekoblL6xl4VNlsBA1rWtgSd3XausBKXFXkhgHzNRV2QNmIgsfGfZELZeU1-wzW12VcyyPK14B1SCuR9itteQ_ZNTTCMIdqL6wsrYC1l34S62-s0J_De5R9d5OQcBlN6MwRzLpKUen9LbgmIsAVi4sdQQbMBjk5HFazr6Rtfz8H6nqk7wqG2f7Av91JFBP02jt5vkQ0duqTEdJmI6jbMRfLKn3Jw4sniWwQMM1aWwetdAcSd7OVD7NMKMHfnPUB4wdOr1cmO5o0Krxutyn81aPmV7EGDOg0ZKj_jLqHN-Zmr_RXGLHE");

        console.log("Live Data Result:", decrypted);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

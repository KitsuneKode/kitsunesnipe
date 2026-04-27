import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Analyzing Miruro decryption logic using eval...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(10000);

        const data = await page.evaluate(async () => {
            // Let's manually trigger a fetch to see where it goes
            const e = "eyJwYXRoIjoic291cmNlcyIsIm1ldGhvZCI6IkdFVCIsInF1ZXJ5Ijp7ImVwaXNvZGVJZCI6IllXNXBiV1Z3WVdobE9qUTZNelkyTURBNk16ayIsInByb3ZpZGVyIjoia2l3aSIsImNhdGVnb3J5Ijoic3ViIiwiYW5pbGlzdElkIjoyMX0sImJvZHkiOm51bGwsInZlcnNpb24iOiIwLjIuMCJ9";
            const res = await fetch(`/api/secure/pipe?e=${e}`);
            const text = await res.text();
            
            // Now, we search for functions that transform this text.
            // We'll search for the call site we found earlier: index-CVadNOyc.js:273:81862
            // Wait, I suspect it's using the 'r' object we saw in Anikai, or something similar.
            
            return {
                prefix: text.substring(0, 10),
                length: text.length
            };
        });

        console.log("Fetch Result:", data);

        // Let's try to get the 'env2.js' content, it might have keys
        const envRes = await page.evaluate(async () => {
            const res = await fetch('/env2.js');
            return await res.text();
        });
        console.log("Env2.js content:", envRes);

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

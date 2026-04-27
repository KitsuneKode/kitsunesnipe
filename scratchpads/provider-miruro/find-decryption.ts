import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Searching memory for pipeKey usage...");
    try {
        await page.goto("https://www.miruro.tv/watch/21/one-piece?ep=1", { waitUntil: "commit" });
        await page.waitForTimeout(5000);

        const result = await page.evaluate(async () => {
            const key = "71951034f8fbcf53d89db52ceb3dc22c";
            const results: any[] = [];

            // We search for ANY function that has the key in its scope or as a literal
            // This is hard to do directly, so we'll look for standard decryption patterns.
            
            // Miruro likely uses a helper for secure fetch
            // Let's search for the 'pipe' URL generator
            
            return {
                hasEnv: !!(window as any).env,
                pipeKey: (window as any).env?.VITE_PIPE_OBF_KEY
            };
        });

        console.log("Memory Search Result:", result);

        // Let's try to get the full index script again and grep it locally
        // to avoid browser issues.
        const src = "https://www.miruro.tv/assets/index-CVadNOyc.js";
        const res = await fetch(src);
        const text = await res.text();
        import { writeFileSync } from "fs";
        writeFileSync('scratchpads/provider-miruro/index.js', text);
        console.log("Saved index script for local grepping.");

    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();

import { chromium } from "playwright";
import { gunzipSync } from "zlib";

const PIPE_KEY = "71951034f8fbcf53d89db52ceb3dc22c";

function decrypt(data: string) {
    const Ro = new Uint8Array(PIPE_KEY.match(/.{2}/g)!.map(e => parseInt(e, 16)));
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const a = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const e = new Uint8Array(a.length);
    for (let t = 0; t < a.length; t++) e[t] = a[t] ^ Ro[t % Ro.length];
    let finalBytes = e;
    if (e[0] === 31 && e[1] === 139) {
        try { finalBytes = gunzipSync(e); } catch (err) {}
    }
    return JSON.parse(new TextDecoder().decode(finalBytes));
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Debugging episodes payload...");
    
    try {
        await page.goto("https://www.miruro.tv/", { waitUntil: "commit" });

        const epResults = await page.evaluate(async () => {
            const payload = {
                path: "episodes",
                method: "GET",
                query: { anilistId: "21" },
                body: null,
                version: "0.2.0"
            };
            const e = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
            const res = await fetch(`/api/secure/pipe?e=${e}`);
            const text = await res.text();
            return { text, isObfuscated: res.headers.get('x-obfuscated') === '2' };
        });

        const epData = epResults.isObfuscated ? decrypt(epResults.text) : JSON.parse(epResults.text);
        
        console.log("Keys in epData:", Object.keys(epData));
        if (epData.providers) {
            console.log("Providers keys:", Object.keys(epData.providers));
            if (epData.providers.kiwi) {
                console.log("kiwi keys:", Object.keys(epData.providers.kiwi));
                if (epData.providers.kiwi.episodes) {
                    const eps = epData.providers.kiwi.episodes;
                    console.log("Is episodes array?", Array.isArray(eps));
                    if (Array.isArray(eps)) {
                        console.log("eps length:", eps.length);
                        console.log("First ep:", eps[0]);
                    } else {
                        console.log("eps type:", typeof eps);
                        console.log("eps keys:", Object.keys(eps));
                        const firstKey = Object.keys(eps)[0];
                        if (firstKey) {
                             console.log("First ep by key:", eps[firstKey]);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed:", e.message);
    }

    await browser.close();
})();
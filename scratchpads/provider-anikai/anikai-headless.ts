import * as cheerio from 'cheerio';
import * as readline from 'readline';
import { spawn } from 'child_process';

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function ask(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
    }));
}

// MASTER TOKEN MAP (Bypasses Browser Sniffing)
// We discovered that Anikai session tokens are STATIC per series.
const MASTER_TOKENS: Record<string, string> = {
    "one-piece-dk6r": "xQm9tJfLwGhz_0Eq8S_YAHYkwp-qQPLfm50W5dNnyd3MnMopTjXwyAEUk82vLeyG5vhVstnd",
    "dragon-ball-z-kj2q": "xQm9tJfLwGhz_0Eq8S_YAHYkwp-qSvLfm50W5fxnyd30nDspTjWG",
    "naruto-9r5k": "xQm9tJfLwGhz_0Eq8S_YAHYkwp-qQPLfm50W5fxnyd2OnAspzTW2"
};

async function main() {
    process.title = "anikai-0-ram";
    console.log("=========================================");
    console.log(" ANIKAI.TO 0-RAM HEADLESS SCRAPER");
    console.log(" (Pure Fetch Mode - No Browser)");
    console.log("=========================================\n");

    const query = process.argv[2] || await ask("Enter anime to search: ");

    // 1. Search Anikai (Search results are SSR'd in raw HTML)
    console.log(`\n[*] Searching Anikai for "${query}"...`);
    const searchRes = await fetch(`https://anikai.to/browser?keyword=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": userAgent }
    });
    const searchHtml = await searchRes.text();
    const $ = cheerio.load(searchHtml);
    const results: any[] = [];
    $('.aitem').each((i, el) => {
        const title = $(el).find('.title').text().trim();
        const href = $(el).find('a.poster').attr('href');
        const aniId = $(el).find('button.ttip-btn').attr('data-tip');
        if (href && aniId) results.push({ title, slug: href.split('/').pop(), aniId });
    });

    if (results.length === 0) {
        console.error("[!] No results found.");
        process.exit(1);
    }

    results.slice(0, 10).forEach((r, i) => console.log(`  [${i + 1}] ${r.title}`));
    const pickStr = await ask("\nPick anime [1]: ");
    const selected = results[parseInt(pickStr || "1") - 1] || results[0];

    // 2. Resolve Session Token
    let sessionToken = MASTER_TOKENS[selected.slug];
    
    if (!sessionToken) {
        console.warn(`[!] No master token for "${selected.slug}". Falling back to generic prefix...`);
        // The first 28 chars are usually constant. Let's see if it works.
        sessionToken = "xQm9tJfLwGhz_0Eq8S_YAHYkwp-q"; 
    }

    const fetchHeaders = {
        "User-Agent": userAgent,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `https://anikai.to/watch/${selected.slug}`,
        "Accept": "application/json, text/javascript, */*; q=0.01"
    };

    // 3. Fetch Episode List
    console.log(`[*] Fetching episode list...`);
    const epRes = await fetch(`https://anikai.to/ajax/episodes/list?ani_id=${selected.aniId}&_=${sessionToken}`, {
        headers: fetchHeaders
    });
    const epData = await epRes.json();
    if (epData.status !== "ok") {
        console.error("[!] Failed to fetch episodes. Token might be expired.");
        process.exit(1);
    }

    const $ep = cheerio.load(epData.result);
    const episodes: any[] = [];
    $ep('a[token]').each((i, el) => {
        const epNum = $ep(el).attr('num');
        const token = $ep(el).attr('token');
        if (token) episodes.push({ epNum, token });
    });

    console.log(`[+] Found ${episodes.length} episodes.`);
    const epPickStr = await ask(`\nPick episode [${episodes.length}]: `);
    const selectedEp = episodes[parseInt(epPickStr || String(episodes.length)) - 1] || episodes[episodes.length - 1];

    // 4. Fetch Links
    console.log(`[*] Fetching video links for episode ${selectedEp.epNum}...`);
    const linkRes = await fetch(`https://anikai.to/ajax/links/list?token=${selectedEp.token}&_=${sessionToken}`, {
        headers: fetchHeaders
    });
    const linkData = await linkRes.json();
    const $link = cheerio.load(linkData.result);
    const servers: any[] = [];
    $srv('.server').each((i, el) => {
        const name = $link(el).text().trim();
        const sid = $link(el).attr('data-sid');
        const eid = $link(el).attr('data-eid');
        const lid = $link(el).attr('data-lid');
        const group = $link(el).closest('.server-items').attr('data-id');
        if (sid && eid && lid) servers.push({ name, sid, eid, lid, group });
    });

    console.log("\nAvailable Servers:");
    servers.forEach((s, i) => console.log(`  [${i + 1}] [${s.group.toUpperCase()}] ${s.name}`));
    const srvPickStr = await ask("\nPick server [1]: ");
    const selectedSrv = servers[parseInt(srvPickStr || "1") - 1] || servers[0];

    // 5. Extract Final Link
    console.log(`[*] Extracting final stream link from ${selectedSrv.name}...`);
    const finalRes = await fetch(`https://anikai.to/ajax/sources/extract?eid=${selectedSrv.eid}&lid=${selectedSrv.lid}&sid=${selectedSrv.sid}&_=${sessionToken}`, {
        headers: fetchHeaders
    });
    const finalData = await finalRes.json();

    if (finalData.status !== "ok" || !finalData.result?.url) {
        console.error("[!] Failed to extract final stream URL.");
        process.exit(1);
    }

    const m3u8Url = finalData.result.url;
    console.log(`\n[+] SUCCESS! Master M3U8 URL extracted:`);
    console.log(`    -> ${m3u8Url}`);

    spawn("mpv", [m3u8Url, `--referrer=https://anikai.to/`, `--user-agent=${userAgent}`], { stdio: "inherit" }).on("close", () => process.exit(0));
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});

import { spawnSync } from 'child_process';
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

// True Headless Fetch using system curl to bypass TLS Fingerprinting/JA3
function curlFetch(url: string, headers: Record<string, string> = {}): string {
    const args = ['-s', '--compressed', '-L', url];
    args.push('-H', `User-Agent: ${userAgent}`);
    for (const [k, v] of Object.entries(headers)) {
        args.push('-H', `${k}: ${v}`);
    }
    const res = spawnSync('curl', args);
    return res.stdout.toString();
}

async function main() {
    process.title = "anikai-true-headless";
    console.log("=========================================");
    console.log(" ANIKAI.TO TRUE 0-RAM HEADLESS SCRAPER");
    console.log(" (Pure Curl + Cheerio - No Playwright)");
    console.log("=========================================\n");

    const query = process.argv[2] || await ask("Enter anime to search: ");

    // 1. Search Anikai (SSR Results)
    console.log(`\n[*] Searching Anikai for "${query}"...`);
    const searchHtml = curlFetch(`https://anikai.to/browser?keyword=${encodeURIComponent(query)}`, {
        "Accept": "text/html",
        "Referer": "https://anikai.to/"
    });
    
    const $ = cheerio.load(searchHtml);
    const results: any[] = [];
    $('.aitem').each((i, el) => {
        const title = $(el).find('.title').text().trim();
        const href = $(el).find('a.poster').attr('href');
        const aniId = $(el).find('button.ttip-btn').attr('data-tip');
        if (href && aniId) results.push({ title, slug: href.split('/').pop(), aniId });
    });

    if (results.length === 0) {
        console.error("[!] No results found. This might be a Cloudflare block.");
        process.exit(1);
    }

    results.slice(0, 10).forEach((r, i) => console.log(`  [${i + 1}] ${r.title}`));
    const pickStr = await ask("\nPick anime [1]: ");
    const selected = results[parseInt(pickStr || "1") - 1] || results[0];

    // 2. Resolve Session Token from Watch Page
    console.log(`\n[*] Sniffing session token from watch page...`);
    const watchHtml = curlFetch(`https://anikai.to/watch/${selected.slug}`, {
        "Accept": "text/html",
        "Referer": "https://anikai.to/browser"
    });
    
    // We need to extract the session token from the JavaScript in the watch page.
    // Anikai usually loads its AJAX calls with a dynamic token.
    // Let's search the HTML for the AJAX URL pattern.
    const tokenMatch = watchHtml.match(/ajax\/episodes\/list\?ani_id=[^&]+&_=(xQm9tJfLwGhz[^"']+)/);
    let sessionToken = tokenMatch ? tokenMatch[1] : "";
    
    if (!sessionToken) {
        // Fallback: Use the One Piece master token prefix
        sessionToken = "xQm9tJfLwGhz_0Eq8S_YAHYkwp-qQPLfm50W5dNnyd3MnMopTjXwyAEUk82vLeyG5vhVstnd";
        console.warn("[!] Token not found in HTML. Using fallback master token.");
    } else {
        console.log(`[+] Captured Session Token from HTML.`);
    }

    const ajaxHeaders = {
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `https://anikai.to/watch/${selected.slug}`,
        "Accept": "application/json, text/javascript, */*; q=0.01"
    };

    // 3. Fetch Episode List
    console.log(`[*] Fetching episode list...`);
    const epRaw = curlFetch(`https://anikai.to/ajax/episodes/list?ani_id=${selected.aniId}&_=${sessionToken}`, ajaxHeaders);
    if (!epRaw || epRaw.trim() === "") {
        console.error("[!] Episode list response was empty.");
        process.exit(1);
    }
    const epData = JSON.parse(epRaw);
    
    if (!epData.result) {
        console.error("[!] No result in episode data JSON.");
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

    // 4. Fetch Server List
    console.log(`[*] Fetching server list for episode ${selectedEp.epNum}...`);
    const serverRaw = curlFetch(`https://anikai.to/ajax/links/list?token=${selectedEp.token}&_=${sessionToken}`, ajaxHeaders);
    const serverData = JSON.parse(serverRaw);
    
    const $srv = cheerio.load(serverData.result);
    const servers: any[] = [];
    $srv('.server').each((i, el) => {
        const name = $srv(el).text().trim();
        const sid = $srv(el).attr('data-sid');
        const eid = $srv(el).attr('data-eid');
        const lid = $srv(el).attr('data-lid');
        const group = $srv(el).closest('.server-items').attr('data-id');
        if (sid && eid && lid) servers.push({ name, sid, eid, lid, group });
    });

    console.log("\nAvailable Servers:");
    servers.forEach((s, i) => console.log(`  [${i + 1}] [${s.group.toUpperCase()}] ${s.name}`));
    const srvPickStr = await ask("\nPick server [1]: ");
    const selectedSrv = servers[parseInt(srvPickStr || "1") - 1] || servers[0];

    // 5. Extract Final Link
    console.log(`[*] Extracting final stream link from ${selectedSrv.name}...`);
    const finalRaw = curlFetch(`https://anikai.to/ajax/sources/extract?eid=${selectedSrv.eid}&lid=${selectedSrv.lid}&sid=${selectedSrv.sid}&_=${sessionToken}`, ajaxHeaders);
    const finalData = JSON.parse(finalRaw);

    if (finalData.status !== "ok" || !finalData.result?.url) {
        console.error("[!] Failed to extract final stream URL.");
        process.exit(1);
    }

    const m3u8Url = finalData.result.url;
    console.log(`\n[+] SUCCESS! Stream URL extracted:`);
    console.log(`    -> ${m3u8Url}`);

    if (!m3u8Url.includes('.m3u8') && !m3u8Url.includes('.mp4')) {
        console.log(`    [!] This is an embed link. 'mpv' will automatically use 'yt-dlp' to extract the raw video.`);
    }

    spawn("mpv", [m3u8Url, `--referrer=https://anikai.to/`, `--user-agent=${userAgent}`], { stdio: "inherit" }).on("close", () => process.exit(0));
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});

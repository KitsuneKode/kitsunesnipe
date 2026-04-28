# Kunai Ecosystem & Debrid Strategy 🥷✨

This document outlines the master plan for turning Kunai from a standalone CLI tool into a massively profitable, self-sustaining ecosystem that rivals Stremio, Netflix, and Crunchyroll in quality, without ever hosting a single video file or scraping server.

---

## 1. The Monetization Engine: The Affiliate Debrid Model
To offer true 4K HDR Blu-ray quality without paying millions of dollars in server bandwidth, we rely on the "Debrid Cache" layer.

**How it works:**
1. Real-Debrid, AllDebrid, and Premiumize already cache petabytes of high-quality torrents on their massive servers.
2. Users pay those services ~$3/month for access to their high-speed APIs.
3. **The Kunai Integration:** We build native UI integrations for these Debrid APIs. When a user clicks "Play", Kunai searches torrent trackers (via community plugins), finds the magnetic hash, sends it to the user's Debrid account, and instantly streams the uncompressed 4K video file natively in our `ArtPlayer` or `mpv`.

**How we make money:**
We embed our **Affiliate Links** directly into the Kunai onboarding wizard and settings page. If a user buys a 6-month Real-Debrid subscription through the Kunai app, we earn a massive percentage (often 30-50%) of that sale, or free premium days that we can resell/giveaway. 
*   **Cost to Us:** $0 (Debrid hosts the files).
*   **Quality to User:** 4K Uncompressed (Better than Crunchyroll/Netflix).
*   **Income to Us:** Passive, recurring affiliate revenue.

---

## 2. The Open Plugin Ecosystem (Future-Proofing)
Maintaining 50 different scrapers as streaming sites constantly change their Cloudflare protections is a full-time job. We will not do that forever.

**The Architecture:**
1. The `@kunai/scraper-core` is just a standardized engine.
2. We define a strict TypeScript interface (e.g., `interface KunaiPlugin { extract(id): Promise<Stream> }`).
3. Anyone in the world can write a scraper for a new site, compile it to a single `.js` file, and drop it into `~/.kunai/plugins`.
4. Kunai dynamically loads these plugins at runtime.

**The Result:** The community maintains the messy scraping logic. If Anikai dies, a community member writes a plugin for "NewSite.to" in an hour. We focus 100% of our effort on building the most beautiful, frictionless Video Player and TUI in the world.

---

## 3. Waterfall Resolution Sorting (The "Wow" Factor)
When a user clicks an episode, they shouldn't have to guess which link is the best. Kunai does the math for them automatically.

1. **Priority 1: Debrid Cache (4K HDR / 1080p Blu-ray).** If the user has a Debrid account, we fetch the highest-seeded torrent hash. The UI displays a glowing `[4K DEBRID]` badge.
2. **Priority 2: Native HLS Streams (1080p Web-Rip).** If no Debrid, we hit Miruro or Anikai for direct `.m3u8` links. The UI displays a sleek `[1080p SUB]` badge.
3. **Priority 3: The Embed Fallback (720p).** If all else fails, we rip from an iframe (Mp4Upload/Vidking) using `yt-dlp`.

The user never sees a messy list of 50 dead links. They just hit "Play" and instantly get the absolute highest quality their configuration allows.

---

## 4. The Download Manager (Local Only)
We will not build a cloud download queue (which costs massive server bandwidth). 
*   **The TUI / Desktop App:** Kunai will bundle `aria2c` (an ultra-fast, multi-connection download utility) or leverage `yt-dlp`. 
*   **The UX:** A user presses `d` in the terminal or clicks a download icon in the Desktop app. Kunai extracts the raw `.mp4` link using the Waterfall strategy above, passes it to `aria2c`, and downloads it directly to their `~/Videos/Kunai` folder at maximum speed.
*   **Web App Limitation:** Web users cannot trigger raw downloads due to browser security, but they can easily be prompted to "Install the Desktop App" to unlock lightning-fast batch downloading.
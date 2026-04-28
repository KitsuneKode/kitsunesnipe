# Kunai V3: Metadata, Mapping, & The Convex Sync Engine 🥷✨

This document finalizes the architectural blueprint for the data layer of Kunai. We are stripping away the slow, error-prone practice of scraping for UI/Search, and replacing it with an enterprise-grade, 0ms-latency metadata engine powered by official APIs, local caching, and real-time syncing.

---

## 1. The Catalog Source of Truth (Split Modes)

To maintain pristine metadata without massive engineering overhead, V1 of Kunai will utilize **Split Modes**. The UI will explicitly toggle between two distinct universes:

*   **Anime Mode (Powered by AniList GraphQL):**
    *   The absolute gold standard for anime. Provides exact release schedules, high-res banners, studio info, and community recommendations.
    *   Users log in via AniList OAuth to seamlessly track their watch status (`Watching`, `Completed`, `Dropped`).
*   **Movie & TV Mode (Powered by TMDB):**
    *   The industry standard for Western media. Provides "Trending," "Top Rated," and "In Theaters" lists instantly.
    *   Users log in via Trakt.tv OAuth to scrobble their watch history.

This split guarantees that a search for "Avatar" returns the James Cameron movie in TMDB mode, and "Avatar: The Last Airbender" in Anime mode, with zero metadata collisions.

---

## 2. The "Rosetta Stone" Mapping Strategy

Scraping search bars on streaming sites (e.g., `anikai.to/search?q=naruto`) is slow, requires bypassing Cloudflare just to get a list of results, and is highly prone to typos.

**The Solution: Local Mapping Databases**
We will download and parse open-source mapping databases (such as `MAL-Sync` or `Consumet` JSON files) directly to the user's machine.
*   **The Flow:**
    1. User clicks "Play" on *Demon Slayer Season 2* (AniList ID: `142329`).
    2. Kunai instantly queries the local JSON mapping file.
    3. The mapping file returns: `{ "anikai": "demon-slayer-entertainment-district-arc-xyz", "miruro": "watch-demon-slayer-s2" }`.
    4. Kunai passes the exact slug directly to our JIT Playwright scraper.
*   **The Result:** We bypass the provider's search engine entirely. Clicking "Play" is mathematically instantaneous.

---

## 3. Aggressive Local SQLite Caching (0ms UI)

To make Kunai feel like a $100M native app, it must never show a loading spinner when navigating menus the user has already visited.

*   **The Architecture:** The CLI/Desktop app initializes a local SQLite database (via `bun:sqlite`).
*   **The TTL (Time To Live):** Every response from AniList or TMDB (Trending lists, Episode lists, Posters, Descriptions) is cached locally for 24 hours.
*   **The UX:** When a user opens Kunai on an airplane with no Wi-Fi, the app opens instantly. Their watchlist and the episodes they browsed yesterday are fully loaded and interactable. 

---

## 4. Hybrid Sync & The Premium Convex Engine

Watch history and cross-device syncing are the stickiest features of any streaming platform. We will offer a two-tier hybrid system.

### A. The Free Tier (3rd-Party Scrobbling)
Free users connect their AniList and Trakt.tv accounts via OAuth. As they watch episodes in `mpv`, the local Kunai daemon silently sends webhooks to those services marking the episodes as "Watched." This is standard, robust, and costs us $0 to host.

### B. The Premium Tier ($3/mo) powered by Convex
For users who pay for the Kunai Convenience Ecosystem, we upgrade them to a real-time, cross-device sync engine powered by **Convex** (a modern, reactive backend-as-a-service that heavily outperforms Supabase for real-time state).
*   **The Magic:** Convex pushes state updates via WebSockets in milliseconds. If a user is watching Episode 5 on their CLI (PC) and hits Pause at `04:12`, the local daemon sends the exact timestamp to Convex.
*   **The Handoff:** The user opens the Kunai Web App on their phone. Convex has already pushed the updated state to the React frontend. The "Resume Playing" button instantly jumps to `04:12`.
*   **Why Convex?** It is type-safe end-to-end (perfect for our Turborepo), infinitely scalable, and handles WebSocket reactivity natively without the complex pub/sub setups required by Supabase or Redis.

---

## 5. The "Netflix Feel" (AniSkip Integration)

To round out the premium feel, Kunai will natively integrate the community `ani-skip` API.
*   Before launching `mpv`, Kunai fetches the exact millisecond timestamps for the Opening (OP) and Ending (ED) themes.
*   We inject a custom Lua script or use Node IPC to command `mpv`.
*   When the video hits the intro timestamp, `mpv` instantly seeks past it. The user's hands never touch the keyboard. 

By combining the **Convex real-time sync**, the **AniList metadata**, the **Local Mapping translation**, and the **AniSkip automation**, Kunai transitions from a "cool terminal scraper" into an elite, indispensable daily driver.
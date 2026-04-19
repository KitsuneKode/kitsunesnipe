# StreamSnatcher 🎬

A high-speed, automated TypeScript CLI tool designed to bypass aggressive frontend anti-debugging traps, extract raw `.m3u8` video streams from various streaming sites, and pipe them directly into `mpv` for seamless playback.

Currently supports:

- **cineby.sc** - Movie and TV show streaming
- **vidking.net** - Alternative streaming source

## ✨ Features

- **DOM Trap Neutralization:** Injects scripts to block `window.close()` and intercepts `beforeunload` events to stop sites from forcefully redirecting to `about:blank`
- **Network Interception:** Actively monitors both the main page and dynamically spawned popups/iframes to snatch the `.m3u8` playlist file the millisecond it appears
- **Header Spoofing:** Automatically steals the browser's dynamic `Referer`, `Origin`, and `User-Agent` headers and injects them into `mpv` to bypass server-side HTTP 403 (Forbidden) Hotlink protection
- **API Snooping:** Logs hidden backend `fetch` and `xhr` requests to the terminal, making it incredibly easy to reverse-engineer the underlying API for Go/Rust implementations
- **Stream Logging:** Automatically saves discovered stream URLs and headers to `logs.txt` for later analysis and pattern recognition
- **Direct Playback:** Instantly kills the headless browser to free up RAM once the URL is found, piping playback directly to your local media player
- **Multi-Provider Support:** Easily switch between different streaming providers with simple command-line flags

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

1. **[Bun](https://bun.sh/)**: The fast all-in-one JavaScript runtime.
2. **[mpv](https://mpv.io/)**: A free, open-source, and highly versatile media player.
   - *Ubuntu/Debian:* `sudo apt install mpv`
   - *Arch Linux:* `sudo pacman -S mpv`
   - *macOS:* `brew install mpv`

## 📦 Installation

### Option 1: Local Development (Recommended for contributors)

1. Clone the repository:

   ```bash
   git clone https://github.com/kitsunekode/scrap-cineby.git
   cd scrap-cineby
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Install Playwright browser binaries (Chromium only):

   ```bash
   bunx playwright install chromium
   ```

### Option 2: Global Installation (For end-users)

Once the `@kitsunekode/run-cli` package is published, you can use it globally:

```bash
# Install globally (optional - you can also use bunx without installing)
bun add -g @kitsunekode/run-cli

# Or use directly with bunx (no installation needed)
bunx run
```

## 💻 Usage

### Local Development

To run the scraper for **cineby.sc** (default provider):

```bash
# explicitly (if run CLI is not set up)
bun run cineby.ts
```

To run the scraper for **vidking.net**:

```bash
# explicitly (if run CLI is not set up)
bun run vidking.ts
```

### Global CLI Usage

After installing `@kitsunekode/run-cli` globally or using `bunx`:

To scrape from **cineby.sc** (default provider):

```bash
run
# or with bunx
bunx run
```

To scrape from **vidking.net**:

```bash
run -p vidking
# or with bunx
bunx run -p vidking
```

To see all available options:

```bash
run --help
```

### How It Works

1. Launches a Chromium instance (headed, to bypass strict Cloudflare bot checks)
2. Strips the `navigator.webdriver` flag to evade basic bot detection
3. Listens to all network traffic, waiting for a `.m3u8` manifest request
4. When the manifest is found, extracts the URL and required HTTP headers
5. Forcefully closes the browser to free up RAM
6. Spawns an `mpv` child process with the spoofed arguments for seamless playback

## ⚠️ Disclaimer

This tool is built strictly for educational and research purposes. It is designed to demonstrate network interception, API reverse-engineering, and the bypassing of frontend obfuscation techniques. The author does not host, provide, or condone the piracy of copyrighted media.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Playwright](https://playwright.dev/) - For reliable browser automation
- [Bun](https://bun.sh/) - For the fast JavaScript runtime
- [mpv](https://mpv.io/) - For the excellent media player

## 🚀 Performance Improvements & Future Enhancements

### Current Optimization Opportunities

1. **Headless Mode Fallback:**
   - Currently runs headed to bypass Cloudflare checks
   - Could implement stealth plugins for headless mode to reduce resource usage

2. **Timeout Optimization:**
   - Hard-coded timeouts (20s/15s) could be made configurable
   - Implement intelligent waiting based on network idle state

3. **Resource Cleanup:**
   - Ensure all browser contexts are properly closed on exit
   - Add signal handlers for graceful shutdown

### Interactive Movie/Series Selection (Roadmap)

Future versions could include:

1. **IMDb/TMDB Integration:**
   - Search movies/series by title using TMDB API
   - Automatically map TMDB/IMDb IDs to provider-specific IDs
   - Example workflow: `run --search "The Boys" --provider vidking`

2. **Smart ID Resolution:**
   - Since both providers appear to use TMDB IDs (as seen in vidking logs: `tmdbId=1078605`)
   - Implement a resolver that converts TMDB/IMDb IDs to provider-specific paths
   - Cineby.sc pattern: `/tv/{tmdb_id}/{season}/{episode}?play=true`
   - Vidking.net pattern: `/embed/movie/{tmdb_id}` or `/embed/tv/{tmdb_id}/{season}/{episode}`

3. **CLI Enhancements:**
   - `--search "Movie Title"` - Search via TMDB
   - `--tmdb-id 12345` - Direct TMDB ID input
   - `--imdb-id tt1234567` - Direct IMDb ID input
   - `--list-trending` - Show trending content

4. **Batch Processing:**
   - Process multiple movies/series from a list
   - Generate reports of working/non-working streams
   - Export findings to CSV/JSON for analysis

### Example Future Usage

```bash
# Interactive search
run --search "Stranger Things" --provider vidking

# Direct ID usage  
run --tmdb-id 66732 --provider cineby

# Batch mode
run --list movies.txt --provider vidking --output results.json
```

The current logging feature (`logs.txt`) already lays the groundwork for analyzing patterns in stream URLs and headers, which will be invaluable for building these future enhancements.


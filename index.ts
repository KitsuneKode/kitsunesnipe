import { chromium } from "playwright";
import { spawn } from "child_process";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.close = () => console.log("[X] Blocked window.close()");
  });

  console.log("Navigating to site and hunting for the stream...");

  // 1. Create a promise that extracts BOTH the URL and the Headers
  let resolveStream: (value: { url: string; headers: Record<string, string> }) => void;
  const waitForM3u8 = new Promise<{ url: string; headers: Record<string, string> }>((resolve) => {
    resolveStream = resolve;
  });

  // 2. A clean helper function to check all traffic and extract the goods
  const checkRequest = (request: any) => {
    const url = request.url();
    if (url.includes(".m3u8")) {
      resolveStream({
        url: url,
        headers: request.headers(), // <--- Steal the browser's exact headers!
      });
    }
  };

  // Attach listener to popups
  context.on("page", async (newPage) => newPage.on("request", checkRequest));

  const page = await context.newPage();
  // Attach listener to the main page
  page.on("request", checkRequest);

  try {
    page
      .goto("https://www.cineby.sc/tv/76479/1/1?play=true", { waitUntil: "domcontentloaded" })
      .catch(() => {});

    // Wait for the stream to be caught
    const streamData = await Promise.race([
      waitForM3u8,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: Could not find m3u8")), 15000),
      ),
    ]);

    console.log("\n=================================================");
    console.log("🎉 BINGO! LAUNCHING MPV WITH SPOOFED HEADERS...");
    console.log("=================================================\n");

    // Kill the browser instantly
    await browser.close();

    // 3. Build the arguments for mpv using the stolen headers
    const mpvArgs = [streamData.url];

    if (streamData.headers["referer"]) {
      mpvArgs.push(`--referrer=${streamData.headers["referer"]}`);
    }
    if (streamData.headers["user-agent"]) {
      mpvArgs.push(`--user-agent=${streamData.headers["user-agent"]}`);
    }
    if (streamData.headers["origin"]) {
      // mpv doesn't have a dedicated origin flag, so we pass it as a raw HTTP header
      mpvArgs.push(`--http-header-fields=Origin: ${streamData.headers["origin"]}`);
    }

    // 4. Launch mpv
    const mpv = spawn("mpv", mpvArgs, {
      stdio: "inherit",
    });

    mpv.on("close", (code) => {
      console.log(`\n[+] mpv exited. Shutting down scraper cleanly.`);
      process.exit(0);
    });
  } catch (error: any) {
    console.log(`\n[!] Scraping failed: ${error.message}`);
    await browser.close();
    process.exit(1);
  }
})();

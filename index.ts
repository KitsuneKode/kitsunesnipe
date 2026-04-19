import { chromium } from "playwright";
import { spawn } from "child_process"; // <-- Import this at the top

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.close = () => console.log("[X] Blocked window.close()");
  });

  console.log("Navigating to site and hunting for the stream...");

  const waitForM3u8 = new Promise<string>((resolve) => {
    const checkRequest = (request: any) => {
      const url = request.url();
      if (url.includes(".m3u8")) {
        resolve(url);
      }
    };
    context.on("page", async (newPage) => newPage.on("request", checkRequest));
    context.pages()[0]?.on("request", checkRequest);
  });

  const page = await context.newPage();
  page.on("request", (request) => {
    if (request.url().includes(".m3u8")) waitForM3u8.then();
  });

  try {
    page
      .goto("https://www.cineby.sc/tv/76479/1/1?play=true", { waitUntil: "domcontentloaded" })
      .catch(() => {});

    const streamUrl = await Promise.race([
      waitForM3u8,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: Could not find m3u8")), 15000),
      ),
    ]);

    console.log("\n=================================================");
    console.log("🎉 BINGO! LAUNCHING MPV...");
    console.log("=================================================\n");

    // 1. We got the URL, so we can immediately kill the browser in the background
    await browser.close();

    // 2. Spawn mpv and pass the stream URL directly to it
    const mpv = spawn("mpv", [streamUrl], {
      stdio: "inherit", // This pipes mpv's terminal output (playback status, errors) directly to your current terminal
    });

    // 3. Keep the script alive until you close the mpv window
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

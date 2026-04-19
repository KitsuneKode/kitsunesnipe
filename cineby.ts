import { chromium } from "playwright";
import { spawn } from "child_process";
import { appendFile } from "fs/promises";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-ignore
    window.close = () => console.log("[X] Blocked window.close()");
  });

  console.log("Navigating to site and hunting for the stream...");

  let streamFound = false;

  const logStream = async (url: string, headers: Record<string, string>) => {
    try {
      const logEntry = `\n=== Stream Log ===\nTimestamp: ${new Date().toISOString()}\nURL: ${url}\nHeaders:\n${JSON.stringify(headers, null, 2)}\n===================\n`;
      await appendFile("logs.txt", logEntry, "utf8");
    } catch (logError) {
      console.error("[!] Failed to write to log file:", logError);
    }
  };

  const launchMpv = async (url: string, headers: Record<string, string>) => {
    if (streamFound) return;
    streamFound = true; // Synchronous lock prevents race conditions

    console.log("\n=================================================");
    console.log("🎉 BINGO! STREAM FOUND. LAUNCHING MPV...");
    console.log("=================================================\n");

    // Do file I/O and browser nuking concurrently to save milliseconds
    await Promise.all([logStream(url, headers), browser.close().catch(() => {})]);

    const mpvArgs = [url];
    if (headers["referer"]) mpvArgs.push(`--referrer=${headers["referer"]}`);
    if (headers["user-agent"]) mpvArgs.push(`--user-agent=${headers["user-agent"]}`);
    if (headers["origin"]) mpvArgs.push(`--http-header-fields=Origin: ${headers["origin"]}`);

    console.log("[+] Injecting MPV Args:\n", mpvArgs);

    const mpv = spawn("mpv", mpvArgs, { stdio: "inherit" });
    mpv.on("close", () => process.exit(0));
  };

  const checkRequest = (request: any) => {
    const url = request.url();
    if (url.includes(".m3u8") && !streamFound) {
      // Added .catch() to prevent unhandled promise rejections if launchMpv fails
      launchMpv(url, request.headers()).catch(console.error);
    }
  };

  context.on("page", async (newPage) => {
    console.log(`[!] Popup/Redirect detected: ${newPage.url()}`);
    newPage.on("request", checkRequest);
  });

  const page = await context.newPage();
  page.on("request", checkRequest);

  try {
    await page.goto("https://www.cineby.sc/tv/127529/1/1?play=true", {
      waitUntil: "domcontentloaded",
    });

    // Custom wait loop: Check every 1 second if streamFound is true.
    // This instantly breaks the waiting period once the stream is found!
    for (let i = 0; i < 20; i++) {
      if (streamFound) break;
      await page.waitForTimeout(1000);
    }
  } catch (error: any) {
    console.log(`[!] Main page redirected or crashed. Keeping script alive for the popup...`);
    // Same fix here: wait up to 10 seconds, but abort early if we found it.
    for (let i = 0; i < 10; i++) {
      if (streamFound) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!streamFound) {
    console.log("\n[!] Timeout: Could not find m3u8.");
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();

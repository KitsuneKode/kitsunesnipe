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

  let streamFound = false;

  // The function that fires the moment we see the m3u8
  const launchMpv = async (url: string, headers: Record<string, string>) => {
    if (streamFound) return; // Stop it from launching MPV twice
    streamFound = true;

    console.log("\n=================================================");
    console.log("🎉 BINGO! STREAM FOUND. LAUNCHING MPV...");
    console.log("=================================================\n");

    // Build the args with the headers we intercepted
    const mpvArgs = [url];
    if (headers["referer"]) mpvArgs.push(`--referrer=${headers["referer"]}`);
    if (headers["user-agent"]) mpvArgs.push(`--user-agent=${headers["user-agent"]}`);
    if (headers["origin"]) mpvArgs.push(`--http-header-fields=Origin: ${headers["origin"]}`);

    console.log("[+] Injecting MPV Args:\n", mpvArgs);

    // Nuke the browser so it doesn't eat RAM
    await browser.close().catch(() => {});

    // Spawn the player
    const mpv = spawn("mpv", mpvArgs, { stdio: "inherit" });
    mpv.on("close", () => process.exit(0));
  };

  const checkRequest = (request: any) => {
    const url = request.url();
    if (url.includes(".m3u8") && !streamFound) {
      launchMpv(url, request.headers());
    }
  };

  // Listen to popups/about:blank tabs
  context.on("page", async (newPage) => {
    console.log(`[!] Popup/Redirect detected: ${newPage.url()}`);
    newPage.on("request", checkRequest);
  });

  const page = await context.newPage();
  page.on("request", checkRequest);

  try {
    await page.goto("https://www.cineby.sc/tv/76479/1/1?play=true", {
      waitUntil: "domcontentloaded",
    });
    // Hard wait to keep script alive while popup does its thing
    await page.waitForTimeout(20000);
  } catch (error: any) {
    console.log(`[!] Main page redirected or crashed. Keeping script alive for the popup...`);
    // CRITICAL: This is why the older script worked! It kept the script alive after the crash.
    await new Promise((r) => setTimeout(r, 10000));
  }

  if (!streamFound) {
    console.log("\n[!] Timeout: Could not find m3u8.");
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();

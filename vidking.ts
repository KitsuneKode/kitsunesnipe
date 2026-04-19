import { chromium } from "playwright";
import { spawn } from "child_process";
import { appendFile } from "fs/promises";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    //@ts-ignore
    window.close = () => console.log("[X] Blocked window.close()");
  });

  console.log("Navigating to Vidking and analyzing network traffic...");

  let streamFound = false;

  // Function to log stream details to logs.txt
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
    streamFound = true;

    // Log the stream details
    await logStream(url, headers);

    console.log("\n=================================================");
    console.log("🎉 BINGO! STREAM FOUND. LAUNCHING MPV...");
    console.log("=================================================\n");

    const mpvArgs = [url];
    if (headers["referer"]) mpvArgs.push(`--referrer=${headers["referer"]}`);
    if (headers["user-agent"]) mpvArgs.push(`--user-agent=${headers["user-agent"]}`);
    if (headers["origin"]) mpvArgs.push(`--http-header-fields=Origin: ${headers["origin"]}`);

    console.log("[+] Injecting MPV Args:\n", mpvArgs);

    await browser.close().catch(() => {});

    const mpv = spawn("mpv", mpvArgs, { stdio: "inherit" });
    mpv.on("close", () => process.exit(0));
  };

  // 1. SNOOP ON EVERYTHING: This helps you write the Go CLI
  const checkRequest = (request: any) => {
    const url = request.url();
    const type = request.resourceType();

    // Log the hidden APIs so you know what to replicate in Go
    if (type === "fetch" || type === "xhr") {
      // Filter out obvious noise
      if (!url.includes("google") && !url.includes("cloudflare")) {
        console.log(`[🔍 API SNOOP] ${request.method()} -> ${url}`);
      }
    }

    // Catch the final stream
    if (url.includes(".m3u8") && !streamFound) {
      launchMpv(url, request.headers());
    }
  };

  context.on("page", async (newPage) => {
    newPage.on("request", checkRequest);
  });

  const page = await context.newPage();
  page.on("request", checkRequest);

  try {
    // Testing with TMDB ID 127529 (Bloodhounds Korean drama) on Vidking
    await page.goto("https://www.vidking.net/embed/tv/127529/1/1", {
      waitUntil: "domcontentloaded",
    });

    // Sometimes you have to physically click the "Play" button on embed players to trigger the API.
    // This waits for a bit to give you time to click it if needed.
    await page.waitForTimeout(15000);
  } catch (error: any) {
    console.log(`[!] Page error: ${error.message}`);
    await new Promise((r) => setTimeout(r, 10000));
  }

  if (!streamFound) {
    console.log("\n[!] Timeout: Could not find m3u8.");
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();

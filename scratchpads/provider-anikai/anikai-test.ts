import * as cheerio from "cheerio";

async function searchAnime(query: string) {
  const url = `https://anikai.to/browser?keyword=${encodeURIComponent(query)}`;
  console.log(`Searching: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const results: any[] = [];
  $(".aitem").each((i, el) => {
    const title = $(el).find(".title").text().trim();
    const href = $(el).attr("href"); // /watch/one-piece-dk6r
    if (href) {
      const slug = href.split("/").pop();
      results.push({ title, slug, href });
    }
  });

  console.log("Search Results:", JSON.stringify(results, null, 2));
}

searchAnime("one piece");

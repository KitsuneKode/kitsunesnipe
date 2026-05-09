import { describe, expect, test } from "bun:test";

import { buildDownloadStreamPolicy } from "@/services/download/stream-policy";

describe("buildDownloadStreamPolicy", () => {
  test("normalizes referer, user-agent, and origin like a single HTTP client policy", () => {
    const policy = buildDownloadStreamPolicy({
      referer: "https://ref.example/page",
      "user-agent": "KunaiTest/1",
      Origin: "https://origin.example",
    });
    expect(policy.headers.Referer).toBe("https://ref.example/page");
    expect(policy.headers["User-Agent"]).toBe("KunaiTest/1");
    expect(policy.headers.Origin).toBe("https://origin.example");
  });

  test("merges duplicate Referer keys into canonical casing", () => {
    const policy = buildDownloadStreamPolicy({ Referer: "https://x.test" });
    expect(policy.headers.Referer).toBe("https://x.test");
    expect(policy.headers.referer).toBeUndefined();
  });

  test("omits empty header values", () => {
    const policy = buildDownloadStreamPolicy({ Referer: "" });
    expect(Object.keys(policy.headers).length).toBe(0);
  });
});

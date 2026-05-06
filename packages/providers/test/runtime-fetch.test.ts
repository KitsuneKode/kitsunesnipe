import { expect, test } from "bun:test";

import { ProviderHttpError, providerFetch, providerJson } from "../src/runtime/fetch";

test("providerFetch uses the injected runtime fetch port when available", async () => {
  let called = false;
  const response = new Response("ok", { status: 200 });

  const result = await providerFetch(
    {
      now: () => "2026-05-06T00:00:00.000Z",
      fetch: {
        runtime: "direct-http",
        async fetch(input) {
          called = input === "https://example.test";
          return response;
        },
      },
    },
    "https://example.test",
  );

  expect(called).toBe(true);
  expect(result).toBe(response);
});

test("providerJson parses successful JSON through the shared fetch port", async () => {
  const result = await providerJson<{ ok: boolean }>(
    {
      now: () => "2026-05-06T00:00:00.000Z",
      fetch: {
        runtime: "direct-http",
        async fetch() {
          return Response.json({ ok: true });
        },
      },
    },
    "https://example.test/api",
  );

  expect(result).toEqual({ ok: true });
});

test("providerJson converts non-2xx responses into typed provider HTTP errors", async () => {
  await expect(
    providerJson(
      {
        now: () => "2026-05-06T00:00:00.000Z",
        fetch: {
          runtime: "direct-http",
          async fetch() {
            return new Response("rate limited", { status: 429, statusText: "Too Many Requests" });
          },
        },
      },
      "https://example.test/api",
      { providerId: "vidking", stage: "source:start" },
    ),
  ).rejects.toMatchObject({
    name: "ProviderHttpError",
    providerId: "vidking",
    code: "rate-limited",
    retryable: true,
    status: 429,
  } satisfies Partial<ProviderHttpError>);
});

import { expect, test } from "bun:test";

import { providerFetch } from "../src/runtime/fetch";

test("providerFetch uses the injected runtime fetch port when available", async () => {
  let called = false;
  const response = new Response("ok", { status: 200 });

  const result = await providerFetch(
    {
      now: () => "2026-05-06T00:00:00.000Z",
      fetch: {
        runtime: "node-fetch",
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

import { expect, test } from "bun:test";
import { createProviderModuleRegistry } from "../src/index";

test("provider module registry starts empty before provider migrations", () => {
  const registry = createProviderModuleRegistry();

  expect(registry.modules).toEqual([]);
  expect(registry.get("vidking")).toBeUndefined();
});

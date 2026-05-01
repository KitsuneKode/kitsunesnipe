import { expect, test } from "bun:test";
import {
  createProviderModuleRegistry,
  getProviderMigrationQueue,
  getProviderResearchProfile,
  providerResearchProfiles,
} from "../src/index";

test("provider module registry starts empty before provider migrations", () => {
  const registry = createProviderModuleRegistry();

  expect(registry.modules).toEqual([]);
  expect(registry.get("vidking")).toBeUndefined();
});

test("provider research profiles are dossier-backed and migration ordered", () => {
  const queue = getProviderMigrationQueue();

  expect(queue[0]?.providerId).toBe("vidking");
  expect(queue[1]?.providerId).toBe("allanime");
  expect(queue.every((profile) => profile.dossierPath.startsWith(".docs/provider-dossiers/"))).toBe(
    true,
  );
  expect(providerResearchProfiles.length).toBeGreaterThanOrEqual(8);
});

test("provider research profiles separate direct providers from legacy fallbacks", () => {
  expect(getProviderResearchProfile("vidking")).toMatchObject({
    status: "production",
    migrationAction: "promote-direct-provider",
    runtimeClass: "node-fetch direct Videasy payload decode, Playwright fallback only",
  });

  expect(getProviderResearchProfile("cineby")).toMatchObject({
    status: "legacy-fallback",
    migrationAction: "keep-as-fallback",
  });

  expect(getProviderResearchProfile("anikai")).toMatchObject({
    migrationAction: "hold-for-runtime-browser",
  });
});

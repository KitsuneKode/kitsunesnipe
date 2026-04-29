import { expect, test } from "bun:test";

import { vidkingManifest } from "@kunai/core";
import {
  manifestToProviderCapabilities,
  manifestToProviderMetadata,
} from "@/services/providers/core-manifest-adapter";

test("core provider manifest maps to the current CLI provider shape", () => {
  const metadata = manifestToProviderMetadata(vidkingManifest);
  const capabilities = manifestToProviderCapabilities(vidkingManifest);

  expect(metadata.id).toBe("vidking");
  expect(metadata.name).toBe("VidKing");
  expect(metadata.isAnimeProvider).toBe(false);
  expect(capabilities.contentTypes).toEqual(["movie", "series"]);
});

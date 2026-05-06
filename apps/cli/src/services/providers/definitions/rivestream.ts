import type { TitleInfo } from "@/domain/types";
import { rivestreamManifest } from "@kunai/core";
import { rivestreamProviderModule } from "@kunai/providers";

import type { Provider, ProviderDeps } from "../Provider";
import { DirectModuleProvider } from "./direct-module-adapter";

export function createRivestreamProvider(deps: ProviderDeps): Provider {
  return new DirectModuleProvider(deps, rivestreamProviderModule, rivestreamManifest, {
    mode: "series",
    canHandle(title: TitleInfo) {
      return title.type === "movie" || title.type === "series";
    },
  });
}

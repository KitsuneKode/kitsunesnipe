import type { TitleInfo } from "@/domain/types";
import { miruroManifest } from "@kunai/core";
import { miruroProviderModule } from "@kunai/providers";

import type { Provider, ProviderDeps } from "../Provider";
import { DirectModuleProvider } from "./direct-module-adapter";

export function createMiruroProvider(deps: ProviderDeps): Provider {
  return new DirectModuleProvider(deps, miruroProviderModule, miruroManifest, {
    mode: "anime",
    canHandle(title: TitleInfo) {
      return title.type === "series";
    },
  });
}

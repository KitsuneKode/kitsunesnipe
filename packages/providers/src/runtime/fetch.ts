import type { ProviderRuntimeContext } from "@kunai/types";

export function providerFetch(
  context: ProviderRuntimeContext,
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  return context.fetch?.fetch(input, init) ?? fetch(input, init);
}

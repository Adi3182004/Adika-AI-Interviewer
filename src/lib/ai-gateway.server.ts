import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAdikaAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "adika",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

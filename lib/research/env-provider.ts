import type {
  ExternalResearchProvider,
  ProviderHealth,
  ResearchSearchRequest,
  ResearchSearchResult,
} from "./contract";

export class EnvironmentResearchProvider implements ExternalResearchProvider {
  readonly name: string;
  private readonly apiKey: string | undefined;

  constructor(name = "external-research") {
    this.name = name;
    this.apiKey = process.env.RESEARCH_PROVIDER_API_KEY;
  }

  async health(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        status: "not_configured",
        reason: "RESEARCH_PROVIDER_API_KEY is not configured.",
      };
    }

    return { status: "available" };
  }

  async search(_request: ResearchSearchRequest): Promise<ResearchSearchResult> {
    if (!this.apiKey) {
      throw new Error("Research provider is not configured. Add RESEARCH_PROVIDER_API_KEY to the server environment.");
    }

    throw new Error("External provider transport is intentionally not implemented until a provider is selected.");
  }
}

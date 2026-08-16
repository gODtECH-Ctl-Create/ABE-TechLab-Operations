export interface ResearchSearchRequest {
  query: string;
  geography?: string;
  industries?: string[];
  limit?: number;
}

export interface ResearchSource {
  url: string;
  title: string;
  snippet?: string;
  retrievedAt: string;
}

export interface ResearchSearchResult {
  provider: string;
  query: string;
  sources: ResearchSource[];
}

export type ProviderHealth =
  | { status: "available" }
  | { status: "not_configured"; reason: string }
  | { status: "unavailable"; reason: string };

export interface ExternalResearchProvider {
  readonly name: string;
  health(): Promise<ProviderHealth>;
  search(request: ResearchSearchRequest): Promise<ResearchSearchResult>;
}

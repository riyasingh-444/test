import type { ProviderType } from "@/lib/constants";
import type { ProviderSearchParams } from "@/lib/validation/discovery";
import type { Paginated, ProviderCardDTO } from "@/types/dto";

/**
 * Search backend contract. `MongoSearchService` implements it today; an Algolia or
 * OpenSearch implementation can replace it later (indexing via change streams or
 * service-layer hooks) without touching API routes or UI.
 */
export interface SearchService {
  searchProviders(type: ProviderType, params: ProviderSearchParams): Promise<Paginated<ProviderCardDTO>>;
}

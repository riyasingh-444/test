import { z } from "zod";
import { PROVIDER_TYPES } from "@/lib/constants";
import { objectId } from "@/lib/validation/common";
import { api } from "@/server/http/handler";
import { discoveryService } from "@/server/services/discovery.service";

const query = z.object({ providerType: z.enum(PROVIDER_TYPES), providerId: objectId });

export const GET = api({ query }, async ({ query }) => discoveryService.listServices(query.providerType, query.providerId));

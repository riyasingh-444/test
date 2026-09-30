import { api } from "@/server/http/handler";
import { discoveryService } from "@/server/services/discovery.service";

export const GET = api({}, async () => discoveryService.listCategories());

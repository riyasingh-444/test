import { api } from "@/server/http/handler";
import { discoveryService } from "@/server/services/discovery.service";

export const GET = api<{ id: string }>({}, async ({ params }) => discoveryService.getLook(params.id));

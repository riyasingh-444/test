import { api } from "@/server/http/handler";
import { offerService } from "@/server/services/offer.service";

export const GET = api({}, async () => offerService.listActive());

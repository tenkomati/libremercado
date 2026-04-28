import { proxyListingApi } from "../../_shared";

export async function GET() {
  return proxyListingApi("/listings/drafts/active");
}

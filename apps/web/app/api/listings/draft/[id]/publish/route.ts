import { proxyListingApi } from "../../../_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();

  return proxyListingApi(`/listings/drafts/${id}/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });
}

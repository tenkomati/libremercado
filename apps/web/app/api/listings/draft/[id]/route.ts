import { proxyListingApi } from "../../_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyListingApi(`/listings/drafts/${id}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();

  return proxyListingApi(`/listings/drafts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });
}

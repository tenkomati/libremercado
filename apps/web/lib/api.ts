import { INTERNAL_API_URL } from "./internal-api-url";

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${INTERNAL_API_URL}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiFetchWithToken<T>(
  path: string,
  token: string
): Promise<T> {
  const response = await fetch(`${INTERNAL_API_URL}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

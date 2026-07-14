export type ProviderHttpResponse = {
  ok: boolean;
  status: number;
  body: unknown;
  text: string;
};

export type ProviderFetch = typeof fetch;

export async function providerFetch(
  fetchImpl: ProviderFetch,
  url: string,
  init: RequestInit,
  timeoutMs = 15_000
): Promise<ProviderHttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
export async function getApiError(response: Response, fallback: string) {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      typeof (body as Record<string, unknown>).error === "string"
    ) {
      return (body as Record<string, string>).error;
    }
  } catch {
    // A proxy or upstream may return a non-JSON error page.
  }
  return fallback;
}

/** Supports both Strapi and legacy API error bodies without exposing raw responses. */
export function authErrorMessage(response: { status?: number; error?: any } | null | undefined,
                                 fallback: string, connectionError: string): string {
  if (response?.status === 0) return connectionError;
  const message = response?.error?.error?.message ?? response?.error?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

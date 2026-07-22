/**
 * Constrains a redirect target to a same-app path, so a `next` value coming
 * from a query string or form field can never send the browser off-site.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/admin"): string {
  const path = value ?? "";
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

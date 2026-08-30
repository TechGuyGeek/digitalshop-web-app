export function normalizeAppBase(value?: string): string {
  const path = value?.trim().replace(/^\/+|\/+$/g, "") || "";
  return path ? `/${path}/` : "/";
}

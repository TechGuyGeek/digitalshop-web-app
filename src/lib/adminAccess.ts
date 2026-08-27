export const ADMIN_EMAIL = "jason.purkiss.bsc@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

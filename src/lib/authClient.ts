const API_ORIGIN = "https://web.gpsshops.com";
const AUTH_BASE = `${API_ORIGIN}/menu1/api/v1/auth`;
const PROFILE_URL = `${API_ORIGIN}/menu1/api/v1/profile.php`;
const BASIC_AUTH_PROTECTED = import.meta.env.VITE_BASIC_AUTH_PROTECTED === "true";

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  locale: string;
  email_verified: boolean;
  paid_user: string;
  gender: string;
  image_path: string;
  line_one_address: string;
  line_two_address: string;
  line_three_address: string;
  line_four_address: string;
  line_country_address: string;
  delivery_notes: string;
}

interface SessionPayload {
  token_type: "Bearer";
  access_token: string;
  access_expires_at: string;
  refresh_via_cookie: true;
  user: AuthUser;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthUser | null> | null = null;

function bearerHeaders(token: string): Record<string, string> {
  return BASIC_AUTH_PROTECTED
    ? { "X-GPS-Shops-Authorization": `Bearer ${token}` }
    : { Authorization: `Bearer ${token}` };
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new AuthApiError(
      response.status,
      body?.error?.code || "request_failed",
      body?.error?.message || "The request could not be completed.",
    );
  }
  return body.data;
}

async function post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${AUTH_BASE}/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readEnvelope<T>(response);
}

function acceptSession(session: SessionPayload): AuthUser {
  accessToken = session.access_token;
  return session.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  return acceptSession(await post<SessionPayload>("login.php", { email, password, client: "web" }));
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  locale: string;
  gender: string;
}): Promise<{ user_id: number; verification_required: boolean; staging_verification_token?: string }> {
  return post("register.php", {
    email: input.email,
    password: input.password,
    first_name: input.firstName,
    last_name: input.lastName,
    mobile_number: input.mobileNumber,
    locale: input.locale,
    gender: input.gender,
  });
}

export async function verifyEmail(token: string): Promise<void> {
  await post("verify-email.php", { token });
}

export async function resendVerification(email: string): Promise<{ staging_verification_token?: string }> {
  return post("resend-verification.php", { email });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await post("request-password-reset.php", { email });
}

export async function restoreSession(): Promise<AuthUser | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = post<SessionPayload>("refresh.php", {})
    .then(acceptSession)
    .catch((error) => {
      accessToken = null;
      if (error instanceof AuthApiError && error.status === 401) return null;
      throw error;
    })
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function logout(): Promise<void> {
  if (!accessToken) await restoreSession();
  if (accessToken) {
    const sendLogout = () => fetch(`${AUTH_BASE}/logout.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...bearerHeaders(accessToken!) },
      body: "{}",
    });
    let response = await sendLogout();
    if (response.status === 401) {
      accessToken = null;
      await restoreSession();
      if (accessToken) response = await sendLogout();
    }
    if (!response.ok && response.status !== 401) await readEnvelope(response);
  }
  accessToken = null;
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!accessToken) await restoreSession();
  if (!accessToken) throw new AuthApiError(401, "authentication_required", "Sign in required.");

  const execute = () => fetch(input, {
    ...init,
    credentials: "include",
    headers: { ...Object.fromEntries(new Headers(init.headers).entries()), ...bearerHeaders(accessToken!) },
  });

  let response = await execute();
  if (response.status === 401) {
    accessToken = null;
    const restored = await restoreSession();
    if (!restored || !accessToken) return response;
    response = await execute();
  }
  return response;
}

export async function getProfile(): Promise<AuthUser> {
  return readEnvelope<{ user: AuthUser }>(await authenticatedFetch(PROFILE_URL)).then((data) => data.user);
}

export async function updateProfile(input: Omit<AuthUser, "id" | "email" | "email_verified" | "locale" | "paid_user"> & { image_base64?: string }): Promise<AuthUser> {
  const response = await authenticatedFetch(PROFILE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readEnvelope<{ user: AuthUser }>(response).then((data) => data.user);
}

export function clearInMemoryAccessToken(): void {
  accessToken = null;
}

export const authApiUrls = { AUTH_BASE, PROFILE_URL };

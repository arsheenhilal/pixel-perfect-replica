// REST integration points for the upcoming backend.
// Set VITE_API_BASE_URL to enable; until then, data stays in localStorage.
const BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const hasBackend = () => !!BASE;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error("Backend not configured");
  const token = typeof window !== "undefined" ? localStorage.getItem("booknook:token") : null;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

// Planned endpoints:
// POST /auth/signup  { name, email, password } -> { token, user }
// POST /auth/login   { email, password }       -> { token, user }
// GET  /me/library   PUT /me/library/:key      DELETE /me/library/:key
// GET  /me/progress  PUT /me/progress/:key
// GET  /me/notes     POST /me/notes            DELETE /me/notes/:id
export const authApi = {
  login: (email: string, password: string) => api<{ token: string; user: { name: string; email: string } }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  signup: (name: string, email: string, password: string) => api<{ token: string; user: { name: string; email: string } }>("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
};

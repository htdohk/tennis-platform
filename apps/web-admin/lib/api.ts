const API_HOST = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

class ApiClient {
  setToken(token: string | null) {
    if (token) {
      localStorage.setItem("admin_token", token);
    } else {
      localStorage.removeItem("admin_token");
    }
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_token");
  }

  private get authHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async fetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.authHeader,
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(`${API_HOST}${path}`, { ...options, headers });

    const body = await res.json();

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== "undefined" && !path.includes("/auth/")) {
        window.location.href = "/admin/login";
        return body as T;
      }
      throw new ApiError(401, body?.message || "Unauthorized", body?.details);
    }

    if (!res.ok) {
      throw new ApiError(res.status, body?.message || `Request failed: ${res.status}`, body?.details);
    }
    return body as T;
  }

  get<T = unknown>(path: string) { return this.fetch<T>(path, { method: "GET" }); }
  post<T = unknown>(path: string, data?: unknown) { return this.fetch<T>(path, { method: "POST", body: JSON.stringify(data) }); }
  patch<T = unknown>(path: string, data?: unknown) { return this.fetch<T>(path, { method: "PATCH", body: JSON.stringify(data) }); }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

export const api = new ApiClient();

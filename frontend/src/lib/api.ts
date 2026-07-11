// API client and cookie helpers for the Next.js application.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  // Build URL with query params
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  // Construct headers
  const defaultHeaders: Record<string, string> = {};
  if (!(rest.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  // Inject Authorization Token if present in cookies
  const token = getCookie("token");
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const finalHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
  });

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // Ignore if not JSON
    }
    throw new Error(errorDetail);
  }

  // If status is 204 or empty, return null
  if (response.status === 204) {
    return null as any;
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return response.text() as any;
  }

  return response.json();
}

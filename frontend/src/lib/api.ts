// API client and cookie helpers for the Next.js application.

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Purge any stale custom URL stored in localStorage so it always routes via Cloudflare proxy
    localStorage.removeItem("NEXT_PUBLIC_API_URL");
  }
  return "/api/v1";
}




export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("NEXT_PUBLIC_API_URL", url);
  }
}

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
  options: RequestOptions = {},
  _retry = true
): Promise<T> {
  const { params, headers, ...rest } = options;

  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  // Build URL with query params
  let url = `${baseUrl}${path}`;
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

  console.log("Fetching API URL:", url);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
    });
  } catch (err: any) {
    console.error("Network error fetching API:", err);
    throw new Error(
      `Cannot connect to backend server (${baseUrl}). Please verify that backend is online.`
    );
  }

  if (!response.ok) {
    if (response.status === 401 && _retry && path !== "/auth/login" && path !== "/auth/refresh") {
      const refreshToken = getCookie("refresh_token");
      if (refreshToken) {
        try {
          const refreshResp = await apiRequest("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
          }, false);
          
          setCookie("token", refreshResp.data.access_token, 3600);
          setCookie("refresh_token", refreshResp.data.refresh_token, 7 * 86400);
          
          // Retry original request
          return apiRequest(path, options, false);
        } catch (refreshErr) {
          deleteCookie("token");
          deleteCookie("refresh_token");
          if (typeof window !== "undefined") window.location.href = "/login";
          throw new Error("Session expired. Please login again.");
        }
      } else {
        deleteCookie("token");
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new Error("Session expired. Please login again.");
      }
    }

    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errJson.error || "";
    } catch {
      // Ignore if not JSON
    }
    if (!errorDetail) {
      if (response.status === 401) {
        errorDetail = "Invalid email or password.";
      } else if (response.status === 403) {
        errorDetail = "Account is inactive or access forbidden.";
      } else {
        errorDetail = `Request failed with status ${response.status}.`;
      }
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


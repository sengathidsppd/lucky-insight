// Cloudflare Pages Function: Reverse proxy API requests to Render backend.
// Solves ERR_CONNECTION_RESET where user's browser can't reach onrender.com directly.

const BACKEND_URL = "https://lucky-insight.onrender.com";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname + url.search;

  // Handle CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const backendUrl = `${BACKEND_URL}${path}`;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  const init = {
    method: context.request.method,
    headers,
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body;
    init.duplex = "half";
  }

  try {
    const response = await fetch(backendUrl, init);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Backend unreachable", detail: err.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

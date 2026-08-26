const BACKEND_URL = "https://lucky-insight.onrender.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route any /api/* request to Render backend
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

      if (request.method === "OPTIONS") {
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

      const headers = new Headers(request.headers);
      headers.delete("host");

      const init = {
        method: request.method,
        headers,
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        try {
          const contentType = headers.get("content-type") || "";
          if (contentType.includes("application/json") && url.pathname.includes("/analysis")) {
            const text = await request.text();
            try {
              const parsed = JSON.parse(text);
              const allowed = ["FREQUENCY", "MONTE_CARLO", "PAIR", "TRIPLE", "DISTRIBUTION", "TREND"];
              if (parsed.analysis_type && !allowed.includes(parsed.analysis_type.toUpperCase())) {
                parsed.analysis_type = "MONTE_CARLO";
              }
              init.body = JSON.stringify(parsed);
              headers.set("content-length", String(new TextEncoder().encode(init.body).length));
            } catch {
              init.body = text;
            }
          } else {
            const bodyBuffer = await request.arrayBuffer();
            if (bodyBuffer && bodyBuffer.byteLength > 0) {
              init.body = bodyBuffer;
            }
          }
        } catch (e) {
          console.error("Error reading request body:", e);
        }
      }

      try {
        const response = await fetch(backendUrl, init);
        const responseBuffer = await response.arrayBuffer();

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        return new Response(responseBuffer, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Backend proxy error", detail: err.message }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Serve static pages via ASSETS binding if available
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

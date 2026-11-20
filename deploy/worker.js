// Worker de service statique pour Nexus Seeker Compagnon.
// Le build Vite (dist/) est servi tel quel ; toute route inconnue qui demande du
// HTML retombe sur index.html pour que BrowserRouter fonctionne en accès direct.
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return response;
    if (url.pathname.startsWith("/assets/")) return response;

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) return response;

    return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
  },
};

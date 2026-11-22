// En el dominio principal (manueldefilosofia.com) la raíz muestra la portada;
// en caverna.manueldefilosofia.com todo sigue igual.
const PORTADA = new Set(["manueldefilosofia.com", "www.manueldefilosofia.com"]);
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (PORTADA.has(url.hostname) && (url.pathname === "/" || url.pathname === "/index.html")) {
    url.pathname = "/portada/";
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.request));
  }
  return ctx.next();
}

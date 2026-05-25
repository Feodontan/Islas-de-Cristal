const cheerio = require("cheerio");

const BASE_URL = "https://www.comunidadumbria.com";
const PARTIDA_PATH = "/partida/islas-cristalinas-18";

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function cleanName(value) {
  return cleanText(value)
    .replace(/\?{2,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function absoluteUrl(href) {
  if (!href) return null;
  return new URL(href, BASE_URL).toString();
}

function slugFromUrl(url) {
  const pathname = new URL(url, BASE_URL).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "portada";
}

function parseFecha(fechaTexto) {
  const match = cleanText(fechaTexto).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})$/
  );

  if (!match) {
    return { fechaTexto: cleanText(fechaTexto), fechaIso: null };
  }

  const [, day, month, year, hour, minute] = match;
  return {
    fechaTexto: cleanText(fechaTexto),
    fechaIso: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`
  };
}

function htmlFragmentToText(html) {
  const $ = cheerio.load(`<main>${html || ""}</main>`, {
    decodeEntities: true
  });

  $("br").replaceWith("\n");
  $("p, blockquote, li, h1, h2, h3, h4").each((_, el) => {
    const current = $(el).html() || "";
    $(el).html(`${current}\n`);
  });

  return cleanText($("main").text());
}

function parseLocationTitle($) {
  return cleanText($("#escena span").first().text()) || cleanText($("h3#escena").first().text());
}

function parsePosts(html, { pageUrl, page, location } = {}) {
  const $ = cheerio.load(html, { decodeEntities: true });
  const locationTitle = parseLocationTitle($) || location?.titulo;
  const locationSlug = location?.slug || slugFromUrl(pageUrl || $("link[rel='canonical']").attr("href") || BASE_URL);

  return $(".wrapMensaje > .mensaje")
    .map((_, mensaje) => {
      const $mensaje = $(mensaje);
      const id = $mensaje.attr("id") || null;
      const messageId = id?.replace(/^msj/, "") || null;
      const fecha = parseFecha($mensaje.children(".fecha").first().text());
      const personaje = cleanName($mensaje.children(".pj").first().text()) || null;
      const avatarImg = $mensaje.find(".avatar img.fotoAvatar").first();
      const autor =
        cleanName(avatarImg.attr("title")) ||
        cleanName(avatarImg.attr("alt")) ||
        personaje;
      const textoHtml = $mensaje.children(".texto").first().html() || "";
      const texto = htmlFragmentToText(textoHtml);

      return {
        id,
        messageId,
        fecha: fecha.fechaTexto,
        fechaIso: fecha.fechaIso,
        autor: autor || null,
        personaje,
        texto,
        textoHtml: cleanText(textoHtml),
        url: pageUrl,
        pagina: page,
        localizacion: {
          slug: locationSlug,
          titulo: locationTitle || locationSlug,
          url: location?.url || pageUrl?.replace(/[?&]__Pg=\d+.*/, "")
        }
      };
    })
    .get()
    .filter((post) => post.fecha || post.texto);
}

function parsePaginationPages(html) {
  const $ = cheerio.load(html);
  const pages = new Set();

  $("a[href*='__Pg=']").each((_, link) => {
    const href = $(link).attr("href");
    const match = href && href.match(/[?&]__Pg=(\d+)/);
    if (match) pages.add(Number(match[1]));
  });

  return [...pages].filter(Number.isFinite).sort((a, b) => a - b);
}

function parseLocations(html) {
  const $ = cheerio.load(html, { decodeEntities: true });
  const locations = new Map();

  $(`a[href^="${PARTIDA_PATH}/"], a[href^="${BASE_URL}${PARTIDA_PATH}/"]`).each((_, link) => {
    const $link = $(link);
    const href = $link.attr("href");
    const title = cleanText($link.text());
    const url = absoluteUrl(href);
    const slug = url ? slugFromUrl(url) : null;

    if (!url || !slug || !title || title === "." || slug.startsWith("--")) return;
    if (slug === "off-topic") return;

    locations.set(slug, {
      slug,
      titulo: title,
      url: url.replace(/[?&]__Pg=\d+.*/, "")
    });
  });

  return [...locations.values()];
}

module.exports = {
  BASE_URL,
  PARTIDA_PATH,
  absoluteUrl,
  cleanName,
  cleanText,
  htmlFragmentToText,
  parseLocations,
  parsePaginationPages,
  parsePosts,
  slugFromUrl
};

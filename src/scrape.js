require("dotenv").config({ quiet: true });

const fs = require("fs/promises");
const path = require("path");
const {
  BASE_URL,
  PARTIDA_PATH,
  cleanText,
  parseLocations,
  parsePaginationPages,
  parsePosts,
  slugFromUrl
} = require("./parser");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const LOCATIONS_DIR = path.join(DATA_DIR, "localizaciones");
const DEFAULT_DELAY_MS = Number(process.env.UMBRIA_DELAY_MS || 1500);
const DEFAULT_MAX_PAGES = Number(process.env.UMBRIA_MAX_PAGES || 200);
const DEFAULT_RETRIES = Number(process.env.UMBRIA_RETRIES || 3);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pageUrl(url, page) {
  const next = new URL(url, BASE_URL);
  next.searchParams.set("__Pg", String(page));
  return next.toString();
}

async function fetchHtml(url, { retries = DEFAULT_RETRIES } = {}) {
  const cookie = process.env.UMBRIA_COOKIE;
  if (!cookie) {
    throw new Error("Falta UMBRIA_COOKIE en .env");
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          Cookie: cookie,
          "User-Agent": "Mozilla/5.0 (compatible; IslasCristalinasScraper/1.0)",
          Accept: "text/html,application/xhtml+xml"
        }
      });

      const html = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return html;
    } catch (error) {
      if (attempt >= retries) throw error;
      const wait = 1000 * attempt;
      console.warn(`  intento ${attempt} fallido (${error.message}); reintento en ${wait} ms`);
      await sleep(wait);
    }
  }
}

function postSignature(posts) {
  return posts.map((post) => post.id || `${post.fecha}|${post.autor}`).join(",");
}

async function scrapeLocation(location, options = {}) {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const allPosts = [];
  const seenSignatures = new Set();
  let knownLastPage = null;

  console.log(`\nLocalizacion: ${location.titulo || location.slug} (${location.slug})`);

  for (let page = 1; page <= maxPages; page += 1) {
    const url = pageUrl(location.url, page);
    console.log(`  pagina ${page}: descargando`);
    const html = await fetchHtml(url, options);
    const posts = parsePosts(html, { pageUrl: url, page, location });
    const signature = postSignature(posts);

    if (page === 1) {
      const pages = parsePaginationPages(html);
      if (pages.length) {
        knownLastPage = Math.max(...pages);
        console.log(`  paginacion detectada hasta pagina ${knownLastPage}`);
      }
    }

    if (!posts.length) {
      console.log(`  pagina ${page}: sin mensajes; fin de localizacion`);
      break;
    }

    if (seenSignatures.has(signature)) {
      console.log(`  pagina ${page}: contenido repetido; fin de localizacion`);
      break;
    }

    seenSignatures.add(signature);
    allPosts.push(...posts);
    console.log(`  pagina ${page}: ${posts.length} mensajes`);

    if (knownLastPage && page >= knownLastPage) break;
    await sleep(delayMs);
  }

  allPosts.sort(comparePosts);
  await fs.mkdir(LOCATIONS_DIR, { recursive: true });
  const outPath = path.join(LOCATIONS_DIR, `${location.slug}.json`);
  await fs.writeFile(outPath, `${JSON.stringify(allPosts, null, 2)}\n`, "utf8");
  console.log(`  guardado: ${path.relative(ROOT, outPath)} (${allPosts.length} mensajes)`);

  return allPosts;
}

function comparePosts(a, b) {
  const dateA = a.fechaIso || "";
  const dateB = b.fechaIso || "";
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  return String(a.messageId || "").localeCompare(String(b.messageId || ""), undefined, {
    numeric: true
  });
}

function markdownEscape(value) {
  return cleanText(value).replace(/\r/g, "");
}

function buildMarkdown(posts) {
  const lines = ["# Cronologia global", ""];

  for (const post of posts) {
    lines.push(
      `## ${post.fecha || "Sin fecha"} - ${post.localizacion.titulo}`,
      "",
      `- Autor: ${post.autor || "Desconocido"}`,
      `- Personaje: ${post.personaje || "No indicado"}`,
      `- URL: ${post.url}`,
      "",
      markdownEscape(post.texto),
      ""
    );
  }

  return `${lines.join("\n").trim()}\n`;
}

async function writeChronology(posts) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const sorted = [...posts].sort(comparePosts);
  await fs.writeFile(
    path.join(DATA_DIR, "cronologia_global.json"),
    `${JSON.stringify(sorted, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(path.join(DATA_DIR, "cronologia_global.md"), buildMarkdown(sorted), "utf8");
  console.log(`\nCronologia global: ${sorted.length} mensajes`);
}

async function discoverLocations() {
  const partidaUrl = `${BASE_URL}${PARTIDA_PATH}`;
  console.log(`Descargando indice de partida: ${partidaUrl}`);
  const html = await fetchHtml(partidaUrl);
  const locations = parseLocations(html);
  if (!locations.length) {
    throw new Error("No se encontraron localizaciones en el indice de la partida");
  }

  console.log(`Localizaciones encontradas: ${locations.length}`);
  return locations;
}

function parseArgs(argv) {
  const args = {
    all: false,
    locationUrl: null,
    fromDebug: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") args.all = true;
    if (arg === "--from-debug") args.fromDebug = true;
    if (arg === "--location") {
      args.locationUrl = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function scrapeFromDebug() {
  const html = await fs.readFile(path.join(ROOT, "debug-umbria.html"), "utf8");
  const location = {
    slug: "0907-las-cuevas-de-pleamar",
    titulo: "0907: Las cuevas de Pleamar",
    url: `${BASE_URL}${PARTIDA_PATH}/0907-las-cuevas-de-pleamar`
  };
  const posts = parsePosts(html, { pageUrl: pageUrl(location.url, 1), page: 1, location });
  await fs.mkdir(LOCATIONS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(LOCATIONS_DIR, `${location.slug}.json`),
    `${JSON.stringify(posts.sort(comparePosts), null, 2)}\n`,
    "utf8"
  );
  await writeChronology(posts);
  console.log(`Prueba local con debug-umbria.html: ${posts.length} mensajes`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.fromDebug) {
    await scrapeFromDebug();
    return;
  }

  let locations;
  if (args.locationUrl) {
    const cleanUrl = args.locationUrl.replace(/[?&]__Pg=\d+.*/, "");
    locations = [
      {
        slug: slugFromUrl(cleanUrl),
        titulo: null,
        url: cleanUrl
      }
    ];
  } else if (args.all) {
    locations = await discoverLocations();
  } else {
    throw new Error("Usa --all o --location <url>. Para probar sin web: --from-debug");
  }

  const allPosts = [];
  for (const location of locations) {
    const posts = await scrapeLocation(location);
    allPosts.push(...posts);
  }

  await writeChronology(allPosts);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildMarkdown,
  comparePosts,
  discoverLocations,
  fetchHtml,
  pageUrl,
  scrapeLocation,
  writeChronology
};

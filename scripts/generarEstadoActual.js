const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const LOCATIONS_DIR = path.join(DATA_DIR, "localizaciones");
const EXPORTS_DIR = path.join(ROOT, "exports");
const OUTPUT = path.join(EXPORTS_DIR, "02_Estado_Actual.md");

const UNKNOWN = "Desconocido";
const RECENT_POSTS = 5;

const THREAT_WORDS = [
  "amenaza",
  "enemigo",
  "hostil",
  "peligro",
  "plaga",
  "corrupcion",
  "corrupción",
  "corromp",
  "maldicion",
  "maldición",
  "invasion",
  "invasión",
  "ataque",
  "asedio",
  "guerra",
  "monstru",
  "muerto",
  "muerte",
  "destru",
  "veneno",
  "toxico",
  "tóxico"
];

const MISSION_WORDS = [
  "mision",
  "misión",
  "encargo",
  "objetivo",
  "debemos",
  "tenemos que",
  "hay que",
  "ayuda",
  "ayudad",
  "buscar",
  "rescatar",
  "investigar",
  "recuperar",
  "liberar",
  "detener",
  "resolver"
];

const CHANGE_WORDS = [
  "destru",
  "ruinas",
  "quemad",
  "carboniz",
  "abandon",
  "tomad",
  "conquist",
  "liberad",
  "fundad",
  "reconstru",
  "corromp",
  "cambio",
  "transform",
  "bloquea",
  "bloqueado",
  "bloqueada"
];

const BAD_ENTITY_WORDS = new Set(
  [
    "comenta",
    "asiente",
    "tambien",
    "también",
    "aun",
    "aún",
    "quizá",
    "quizas",
    "quizás",
    "ambas",
    "bien",
    "uno de",
    "muy",
    "verdad",
    "voy",
    "adquirido",
    "no",
    "si",
    "sí",
    "crees",
    "creo",
    "espero",
    "mantente",
    "quiere",
    "responde",
    "estoy",
    "dragon's rest"
  ].map(normalize)
);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function clean(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function codeFromSlug(slug) {
  return String(slug || "").match(/^(\d{4})/)?.[1] || null;
}

function codeFromTitle(title) {
  return String(title || "").match(/^(\d{4})/)?.[1] || null;
}

function titleWithoutCode(title) {
  return clean(String(title || "").replace(/^\d{4}\s*:?\s*/, ""));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function byCountDesc(a, b) {
  return (b.frecuencia || 0) - (a.frecuencia || 0) || String(a.nombre).localeCompare(String(b.nombre));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isUsefulName(name) {
  const normalized = normalize(name);
  if (!normalized || BAD_ENTITY_WORDS.has(normalized)) return false;
  if (normalized.length < 3) return false;
  if (/^[?¿!¡.\-]+$/.test(name)) return false;
  return true;
}

function sentenceSplit(text) {
  return clean(text)
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => clean(item))
    .filter(Boolean);
}

function findSentences(posts, words, limit = 3) {
  const out = [];
  const normalizedWords = words.map(normalize);

  for (const post of posts) {
    for (const sentence of sentenceSplit(post.texto)) {
      const normalized = normalize(sentence);
      if (normalizedWords.some((word) => normalized.includes(word))) {
        out.push({
          fecha: post.fecha,
          autor: post.autor,
          texto: sentence.length > 360 ? `${sentence.slice(0, 357).trim()}...` : sentence
        });
      }
      if (out.length >= limit) return out;
    }
  }

  return out;
}

function inferState(recentPosts, events) {
  const text = normalize(recentPosts.map((post) => post.texto).join(" "));
  const eventKeywords = new Set(events.flatMap((event) => event.palabrasClave || []).map(normalize));

  if (text.includes("ruina") || text.includes("destruid") || text.includes("carboniz")) return "Dañado o destruido";
  if (text.includes("corromp") || text.includes("plaga") || text.includes("maldicion")) return "Amenazado por corrupcion o plaga";
  if (text.includes("batalla") || text.includes("combate") || text.includes("asedio") || eventKeywords.has("batalla")) return "En conflicto";
  if (text.includes("abandon")) return "Abandonado o parcialmente abandonado";
  if (text.includes("bloquea") || text.includes("bloqueado") || text.includes("bloqueada")) return "Bloqueado o alterado";
  return UNKNOWN;
}

function inferControl(locationEntity, locationEvents) {
  const factionCounts = new Map();

  for (const faction of locationEntity?.facciones || []) {
    factionCounts.set(faction.nombre, (factionCounts.get(faction.nombre) || 0) + faction.frecuencia);
  }
  for (const event of locationEvents) {
    for (const faction of event.faccionesMencionadas || []) {
      factionCounts.set(faction, (factionCounts.get(faction) || 0) + 1);
    }
  }

  const sorted = [...factionCounts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || UNKNOWN;
}

function formatBullets(items, render) {
  if (!items.length) return `  - ${UNKNOWN}`;
  return items.map((item) => `  - ${render(item)}`).join("\n");
}

function eventLine(event) {
  const keys = (event.palabrasClave || []).slice(0, 5).join(", ");
  const summary = clean(event.resumenAutomatico || "").replace(/\n/g, " ");
  return `${event.fecha || "Sin fecha"}: ${keys || "evento"} - ${summary}${event.url ? ` (${event.url})` : ""}`;
}

function recentLine(post) {
  const summary = clean(post.texto || "").replace(/\n/g, " ").slice(0, 500);
  return `${post.fecha || "Sin fecha"} - ${post.autor || UNKNOWN}: ${summary}${post.url ? ` (${post.url})` : ""}`;
}

async function loadLocations() {
  const files = (await fs.readdir(LOCATIONS_DIR)).filter((file) => file.endsWith(".json"));
  const locations = [];

  for (const file of files) {
    const posts = await readJsonIfExists(path.join(LOCATIONS_DIR, file), []);
    if (!posts.length) continue;
    const first = posts[0];
    const slug = file.replace(/\.json$/, "");
    const code = codeFromSlug(slug) || codeFromTitle(first.localizacion?.titulo);
    if (!code) continue;
    locations.push({
      slug,
      code,
      title: first.localizacion?.titulo || slug,
      url: first.localizacion?.url || first.url || null,
      posts
    });
  }

  return locations.sort((a, b) => Number(a.code) - Number(b.code) || a.title.localeCompare(b.title));
}

async function main() {
  const [locations, locationEntities, npcs, events] = await Promise.all([
    loadLocations(),
    readJsonIfExists(path.join(DATA_DIR, "entidades", "localizaciones.json"), []),
    readJsonIfExists(path.join(DATA_DIR, "entidades", "npcs.json"), []),
    readJsonIfExists(path.join(DATA_DIR, "eventos", "eventos_importantes.json"), [])
  ]);

  const locationBySlug = new Map(locationEntities.map((item) => [item.slug, item]));
  const eventsBySlug = new Map();
  for (const event of events) {
    if (!eventsBySlug.has(event.slug)) eventsBySlug.set(event.slug, []);
    eventsBySlug.get(event.slug).push(event);
  }

  const npcByLocation = new Map();
  for (const npc of npcs) {
    for (const location of npc.localizaciones || []) {
      if (!npcByLocation.has(location.nombre)) npcByLocation.set(location.nombre, []);
      npcByLocation.get(location.nombre).push({
        nombre: npc.nombre,
        frecuencia: location.frecuencia,
        esAutorOPersonaje: Boolean(npc.esAutorOPersonaje)
      });
    }
  }

  const lines = [
    "# Estado Actual",
    "",
    "Generado automaticamente desde `data/localizaciones`, `data/cronologia_global.json`, `data/entidades` y `data/eventos`.",
    "Este archivo resume el estado jugable actual inferido a partir de los ultimos mensajes. Cuando no hay evidencia suficiente se marca como `Desconocido`.",
    "",
    `Localizaciones incluidas: ${locations.length}.`,
    ""
  ];

  for (const location of locations) {
    const entity = locationBySlug.get(location.slug);
    const locationEvents = (eventsBySlug.get(location.slug) || []).sort((a, b) =>
      String(a.fechaIso || "").localeCompare(String(b.fechaIso || ""))
    );
    const recentPosts = location.posts.slice(-RECENT_POSTS).reverse();
    const latestPost = recentPosts[0];
    const importantEvents = locationEvents.slice(-5).reverse();
    const actorNames = unique(
      location.posts
        .flatMap((post) => [post.personaje, post.autor])
        .filter((name) => name && !["Director", "SISTEMA", "No indicado", "Desconocido"].includes(name))
        .filter(isUsefulName)
    );
    const entityNames = (npcByLocation.get(location.title) || [])
      .sort(byCountDesc)
      .filter((item) => item.esAutorOPersonaje || /\s/.test(item.nombre))
      .map((item) => item.nombre)
      .filter(isUsefulName);
    const relevantNpcs = unique([...actorNames, ...entityNames]).slice(0, 12);
    const players = actorNames.slice(0, 12);

    const threats = findSentences(recentPosts, THREAT_WORDS, 3);
    const missions = findSentences(recentPosts, MISSION_WORDS, 3);
    const changes = findSentences(recentPosts, CHANGE_WORDS, 3);

    lines.push(
      `## ${location.code} ${titleWithoutCode(location.title) || location.title}`,
      "",
      `- Estado actual: ${inferState(recentPosts, locationEvents)}`,
      `- Control / faccion dominante: ${inferControl(entity, locationEvents)}`,
      "- NPCs presentes o relevantes:",
      formatBullets(relevantNpcs, (name) => name),
      "- Jugadores que han actuado aqui:",
      formatBullets(players, (name) => name),
      "- Eventos importantes ocurridos:",
      formatBullets(importantEvents, eventLine),
      "- Ultimo evento conocido:",
      `  - ${latestPost ? recentLine(latestPost) : UNKNOWN}`,
      "- Amenazas activas:",
      formatBullets(threats, (item) => `${item.fecha}: ${item.texto}`),
      "- Misiones abiertas:",
      formatBullets(missions, (item) => `${item.fecha}: ${item.texto}`),
      "- Cambios respecto al mapa base:",
      formatBullets(changes, (item) => `${item.fecha}: ${item.texto}`),
      "- Dudas / necesita revision manual:",
      `  - ${threats.length || missions.length || changes.length || importantEvents.length ? "Revisar manualmente para confirmar inferencias automaticas." : UNKNOWN}`,
      `- URL original: ${location.url || latestPost?.url || UNKNOWN}`,
      ""
    );
  }

  await fs.mkdir(EXPORTS_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, `${lines.join("\n").trim()}\n`, "utf8");
  console.log(`Estado actual generado: ${path.relative(ROOT, OUTPUT)}`);
  console.log(`Localizaciones incluidas: ${locations.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

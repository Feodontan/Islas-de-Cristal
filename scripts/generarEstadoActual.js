const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const LOCATIONS_DIR = path.join(DATA_DIR, "localizaciones");
const EXPORTS_DIR = path.join(ROOT, "exports");
const OUTPUT = path.join(EXPORTS_DIR, "02_Estado_Actual.md");
const DEBUG_OUTPUT = path.join(EXPORTS_DIR, "02_Estado_Actual_DEBUG.md");
const WHITELIST_FILE = path.join(DATA_DIR, "entidades", "personajes_whitelist.json");
const LOCATIONS_WHITELIST_FILE = path.join(DATA_DIR, "entidades", "localizaciones_whitelist.json");

const UNKNOWN = "Desconocido";
const RECENT_POSTS = 6;

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

const MISSION_PATTERNS = [
  /\b(?:mision|misión|objetivo|encargo)\b[^.!?]{0,100}\b(?:investigar|escoltar|derrotar|encontrar|proteger|entregar|viajar|rescatar|capturar|limpiar|explorar)\b/i,
  /\b(?:hay que|tenemos que|debe(?:mos|n)?|necesita(?:mos|n)?|se debe)\b[^.!?]{0,100}\b(?:investigar|escoltar|derrotar|encontrar|proteger|entregar|viajar|rescatar|capturar|limpiar|explorar)\b/i,
  /\b(?:investigar|escoltar|derrotar|encontrar|proteger|entregar|viajar|rescatar|capturar|limpiar|explorar)\b[^.!?]{0,100}\b(?:mision|misión|objetivo|encargo)\b/i
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

const BASE_CONTROL_NAMES = new Set(
  [
    "Alianza del Cristal",
    "Talsyrc",
    "Triarcas",
    "Filgaia",
    "Gremio de Inventores",
    "Strixhaven",
    "Nueva Roclenia",
    "Nueva Lyrule",
    "Nueva Delhyde",
    "Nueva Vector",
    "Fortaleza de Farar",
    "Fortaleza de Roland",
    "Fortaleza Gnoll",
    "Fortaleza Shin-Ra",
    "Fortaleza de Shin-ra",
    "Imperio Arcadia",
    "Imperio Terra",
    "Imperio de Terra",
    "Fuerte Belvor"
  ].map(normalize)
);

const CONTROL_PATTERNS = [
  /\bcontrola(?:n)?\b/i,
  /\bgobierna(?:n)?\b/i,
  /\btom[oó](?: la| el)?\b/i,
  /\btomaron(?: la| el)?\b/i,
  /\bpertenece a\b/i,
  /\bbajo control de\b/i,
  /\bdomina(?:n)?\b/i,
  /\bocupa(?:n)?\b/i
];

const DND_TERMS = [
  "clase de armadura",
  "armor class",
  "hit points",
  "languages",
  "languages common",
  "attack",
  "medium humanoid",
  "challenge",
  "saving throws",
  "skills",
  "damage",
  "condition immunities",
  "senses",
  "speed",
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
  "acid squirt",
  "chill touch"
];

const NARRATIVE_STARTERS = [
  "añadio",
  "añadió",
  "exclama",
  "exclamó",
  "exclamo",
  "murmura",
  "murmuró",
  "murmuro",
  "grita",
  "gritó",
  "grito",
  "dijo",
  "dice",
  "comentó",
  "comento",
  "comentaria",
  "comentaría",
  "respondio",
  "respondió",
  "responde",
  "pregunto",
  "preguntó",
  "susurro",
  "susurró",
  "suspira",
  "suspiró",
  "suspiraria",
  "asiente",
  "asintió",
  "asintio",
  "comenzó",
  "comenzo",
  "volvió",
  "volvio",
  "perfecto",
  "bueno",
  "entonces",
  "finalmente",
  "apenas",
  "quizas",
  "quizá",
  "quizás"
].map(normalize);

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
    "tenemos",
    "acaba",
    "acciones",
    "activa",
    "perfecto ahora",
    "dragon's rest"
  ].map(normalize)
);

const FORBIDDEN_NPC_FRAGMENTS = [
  "añadió",
  "añadio",
  "añade",
  "exclama",
  "exclamó",
  "murmura",
  "dijo",
  "gritó",
  "grito",
  "comentó",
  "comento",
  "perfecto",
  "ahora",
  "clase de armadura",
  "armor class",
  "hit points",
  "languages",
  "attack",
  "medium humanoid"
].map(normalize);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[“”"'.:;!?¡¿()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
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

function locationSlugFromFile(file) {
  return String(file || "").replace(/^\d{4}-/, "").replace(/\.json$/, "");
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function wordCount(value) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function startsWithNarrativeVerb(value) {
  const normalized = normalize(value);
  return NARRATIVE_STARTERS.some((starter) => normalized === starter || normalized.startsWith(`${starter} `));
}

function isDndTerm(value) {
  const normalized = normalize(value);
  return DND_TERMS.some((term) => normalized === normalize(term) || normalized.includes(normalize(term)));
}

function hasForbiddenPublicTerm(value) {
  const normalized = normalize(value);
  return FORBIDDEN_NPC_FRAGMENTS.some((fragment) => normalized.includes(fragment)) || isDndTerm(value);
}

function esNpcValido(name, knownNames = new Set()) {
  const normalized = normalize(name);
  if (!normalized || BAD_ENTITY_WORDS.has(normalized)) return false;
  if (FORBIDDEN_NPC_FRAGMENTS.some((fragment) => normalized.includes(fragment))) return false;
  if (isDndTerm(name) || startsWithNarrativeVerb(name)) return false;
  if (/^[?¿!¡.\-]+$/.test(name)) return false;
  if (clean(name).includes(".")) return false;
  if (clean(name).includes("—") || clean(name).includes("–") || clean(name).includes("-")) return false;
  if (wordCount(name) > 4 && !knownNames.has(normalized)) return false;
  if (/\b(y|e)$/i.test(clean(name))) return false;
  return clean(name).length >= 3;
}

function sentenceSplit(text) {
  return clean(text)
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => clean(item))
    .filter(Boolean);
}

function oneSentence(text, max = 120) {
  const first = sentenceSplit(text).find((sentence) => !hasForbiddenPublicTerm(sentence));
  if (!first) return "Resumen no incluido; ver DEBUG.";
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trim()}...`;
}

function findSentences(posts, matcher, limit = 3) {
  const out = [];

  for (const post of posts) {
    for (const sentence of sentenceSplit(post.texto)) {
      if (matcher(sentence) && !hasForbiddenPublicTerm(sentence)) {
        out.push({
          fecha: post.fecha,
          autor: post.autor,
          texto: oneSentence(sentence, 120),
          url: post.url
        });
      }
      if (out.length >= limit) return out;
    }
  }

  return out;
}

function containsAnyWord(sentence, words) {
  const normalized = normalize(sentence);
  return words.map(normalize).some((word) => normalized.includes(word));
}

function isMissionSentence(sentence) {
  return MISSION_PATTERNS.some((pattern) => pattern.test(sentence));
}

function inferState(recentPosts, events) {
  const text = normalize(recentPosts.map((post) => post.texto).join(" "));
  const eventKeywords = new Set(events.flatMap((event) => event.palabrasClave || []).map(normalize));

  if (text.includes("ruina") || text.includes("destruid") || text.includes("carboniz")) {
    return { value: "Dañado o destruido", confidence: "media", evidence: "Mensajes recientes mencionan ruinas, destruccion o restos carbonizados." };
  }
  if (text.includes("corromp") || text.includes("plaga") || text.includes("maldicion")) {
    return { value: "Amenazado por corrupcion o plaga", confidence: "media", evidence: "Mensajes recientes mencionan corrupcion, plaga o maldicion." };
  }
  if (text.includes("batalla") || text.includes("combate") || text.includes("asedio") || eventKeywords.has("batalla")) {
    return { value: "En conflicto", confidence: "media", evidence: "Hay eventos o mensajes recientes de batalla, combate o asedio." };
  }
  if (text.includes("abandon")) {
    return { value: "Abandonado o parcialmente abandonado", confidence: "media", evidence: "Mensajes recientes mencionan abandono." };
  }
  if (text.includes("bloquea") || text.includes("bloqueado") || text.includes("bloqueada")) {
    return { value: "Bloqueado o alterado", confidence: "media", evidence: "Mensajes recientes mencionan bloqueo o alteracion." };
  }
  return { value: UNKNOWN, confidence: "baja", evidence: "No hay evidencia reciente clara." };
}

function inferControl(locationEntity, posts, locationEvents) {
  const knownFactions = [
    ...(locationEntity?.facciones || []).map((faction) => faction.nombre),
    ...locationEvents.flatMap((event) => event.faccionesMencionadas || [])
  ].filter((name) => BASE_CONTROL_NAMES.has(normalize(name)));
  const candidates = [];
  const evidencePosts = [...posts.slice(0, 3), ...posts.slice(-RECENT_POSTS)];

  for (const post of evidencePosts) {
    for (const sentence of sentenceSplit(post.texto)) {
      const normalizedSentence = normalize(sentence);
      if (!CONTROL_PATTERNS.some((pattern) => pattern.test(sentence))) continue;
      for (const faction of knownFactions) {
        if (normalizedSentence.includes(normalize(faction))) {
          candidates.push({ faction, fecha: post.fecha, texto: oneSentence(sentence, 120), url: post.url });
        }
      }
    }
  }

  if (!candidates.length) {
    return { value: UNKNOWN, confidence: "baja", evidence: "No hay faccion dominante confirmada por mapa base o evidencia reciente clara." };
  }

  return {
    value: candidates[0].faction,
    confidence: "media",
    evidence: candidates[0]
  };
}

function formatBullets(items, render) {
  if (!items.length) return `  - ${UNKNOWN}`;
  return items.map((item) => `  - ${render(item)}`).join("\n");
}

function eventLine(event) {
  const keys = (event.palabrasClave || []).slice(0, 4).join(", ");
  const summary = oneSentence(event.textoFuente || event.resumenAutomatico || "", 120);
  return `${event.fecha || "Sin fecha"}: ${keys || "evento"} - ${summary}${event.url ? ` (${event.url})` : ""}`;
}

function recentLine(post) {
  return `${post.fecha || "Sin fecha"} - ${post.autor || UNKNOWN}: ${oneSentence(post.texto || "", 120)}${post.url ? ` (${post.url})` : ""}`;
}

async function loadLocations() {
  const whitelist = await readJsonIfExists(LOCATIONS_WHITELIST_FILE, []);
  const files = whitelist.length
    ? whitelist.map((item) => item.archivo).filter(Boolean)
    : (await fs.readdir(LOCATIONS_DIR)).filter((file) => file.endsWith(".json"));
  const locations = [];

  for (const file of files) {
    const posts = await readJsonIfExists(path.join(LOCATIONS_DIR, file), []);
    if (!posts.length) continue;
    const first = posts[0];
    const whitelistItem = whitelist.find((item) => item.archivo === file);
    const fileStem = file.replace(/\.json$/, "");
    const slug = whitelistItem?.slug || locationSlugFromFile(file);
    const code = whitelistItem?.codigo || codeFromSlug(fileStem) || codeFromTitle(first.localizacion?.titulo);
    if (!code) continue;
    locations.push({
      slug,
      code,
      name: whitelistItem?.nombre || titleWithoutCode(first.localizacion?.titulo) || slug,
      title: first.localizacion?.titulo || `${code} ${slug}`,
      archivo: file,
      url: first.localizacion?.url || first.url || null,
      posts
    });
  }

  return locations.sort((a, b) => Number(a.code) - Number(b.code) || a.title.localeCompare(b.title));
}

function knownActorNames(posts) {
  return new Set(
    posts
      .flatMap((post) => [post.personaje, post.autor])
      .filter((name) => name && !["Director", "SISTEMA", "No indicado", "Desconocido"].includes(name))
      .map(normalize)
  );
}

function confidenceForEvidence(items) {
  if (!items.length) return "baja";
  return items.length >= 2 ? "media" : "baja";
}

function hydrateEventsWithSource(events, posts) {
  return events.map((event) => {
    const source = posts.find((post) => post.url === event.url && post.fecha === event.fecha);
    return source ? { ...event, textoFuente: source.texto } : event;
  });
}

function buildWhitelist(items) {
  return new Set(
    items
      .map((item) => (typeof item === "string" ? item : item?.nombre))
      .filter(Boolean)
      .map(normalize)
  );
}

function isWhitelisted(name, whitelist) {
  return whitelist.has(normalize(name));
}

function buildLocationWhitelist(items) {
  const names = new Set();
  for (const item of items) {
    if (item.nombre) names.add(normalize(item.nombre));
    if (item.slug) names.add(normalize(String(item.slug).replace(/-/g, " ")));
  }
  return names;
}

function isLocationName(name, locationWhitelist) {
  return locationWhitelist.has(normalize(name));
}

function splitWhitelistedNames(names, whitelist, knownNames, locationWhitelist) {
  const valid = unique(names.filter((name) => esNpcValido(name, knownNames)));
  const locations = valid.filter((name) => isLocationName(name, locationWhitelist));
  const notLocations = valid.filter((name) => !isLocationName(name, locationWhitelist));
  const confirmed = notLocations.filter((name) => isWhitelisted(name, whitelist));
  const candidates = notLocations.filter((name) => !isWhitelisted(name, whitelist));
  return { confirmed: unique(confirmed), candidates: unique(candidates), locations: unique(locations) };
}

function debugBlock(title, data) {
  return ["", `### ${title}`, "", "```json", JSON.stringify(data, null, 2), "```", ""].join("\n");
}

function pushSection(lines, title, rows) {
  lines.push(`### ${title}`);
  for (const row of rows) lines.push(row);
  lines.push("");
}

function pushList(lines, title, items, render) {
  lines.push(`### ${title}`);
  if (!items.length) {
    lines.push(`- ${UNKNOWN}`);
  } else {
    for (const item of items) lines.push(`- ${render(item)}`);
  }
  lines.push("");
}

async function main() {
  const [locations, locationEntities, npcs, events, whitelistItems, locationWhitelistItems] = await Promise.all([
    loadLocations(),
    readJsonIfExists(path.join(DATA_DIR, "entidades", "localizaciones.json"), []),
    readJsonIfExists(path.join(DATA_DIR, "entidades", "npcs.json"), []),
    readJsonIfExists(path.join(DATA_DIR, "eventos", "eventos_importantes.json"), []),
    readJsonIfExists(WHITELIST_FILE, []),
    readJsonIfExists(LOCATIONS_WHITELIST_FILE, [])
  ]);
  const personajesWhitelist = buildWhitelist(whitelistItems);
  const localizacionesWhitelist = buildLocationWhitelist(locationWhitelistItems);

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
    "",
    "Criterio: resume estado jugable actual a partir de ultimos mensajes y eventos detectados. Cuando no hay evidencia suficiente se usa `Desconocido`.",
    "",
    `Localizaciones incluidas: ${locations.length}.`,
    ""
  ];
  const debug = [
    "# Estado Actual DEBUG",
    "",
    "Textos fuente e inferencias usadas para generar `02_Estado_Actual.md`.",
    ""
  ];

  for (const location of locations) {
    const entity = locationBySlug.get(`${location.code}-${location.slug}`) || locationBySlug.get(location.slug);
    const locationEvents = (eventsBySlug.get(location.slug) || []).sort((a, b) =>
      String(a.fechaIso || "").localeCompare(String(b.fechaIso || ""))
    );
    const recentPosts = location.posts.slice(-RECENT_POSTS).reverse();
    const latestPost = recentPosts[0];
    const importantEvents = hydrateEventsWithSource(locationEvents.slice(-5).reverse(), location.posts);
    const knownNames = knownActorNames(location.posts);
    const rawActorNames = unique(
      location.posts
        .flatMap((post) => [post.personaje, post.autor])
        .filter((name) => name && !["Director", "SISTEMA", "No indicado", "Desconocido"].includes(name))
    );
    const rawEntityNames = (npcByLocation.get(location.title) || [])
      .sort((a, b) => (b.frecuencia || 0) - (a.frecuencia || 0))
      .filter((item) => item.esAutorOPersonaje || knownNames.has(normalize(item.nombre)))
      .map((item) => item.nombre);
    const actorSplit = splitWhitelistedNames(rawActorNames, personajesWhitelist, knownNames, localizacionesWhitelist);
    const entitySplit = splitWhitelistedNames(rawEntityNames, personajesWhitelist, knownNames, localizacionesWhitelist);
    const relevantNpcs = unique([...actorSplit.confirmed, ...entitySplit.confirmed]).slice(0, 12);
    const players = actorSplit.confirmed.slice(0, 12);
    const npcCandidates = unique([...actorSplit.candidates, ...entitySplit.candidates]).slice(0, 30);
    const locationCandidates = unique([...actorSplit.locations, ...entitySplit.locations]).slice(0, 30);

    const threats = findSentences(recentPosts, (sentence) => containsAnyWord(sentence, THREAT_WORDS), 3);
    const missions = findSentences(recentPosts, isMissionSentence, 3);
    const changes = findSentences(recentPosts, (sentence) => containsAnyWord(sentence, CHANGE_WORDS), 3);
    const state = inferState(recentPosts, locationEvents);
    const control = inferControl(entity, location.posts, locationEvents);
    const threatConfidence = confidenceForEvidence(threats);
    const missionConfidence = confidenceForEvidence(missions);

    lines.push(`## ${location.code} — ${location.name}`);
    lines.push("");

    pushSection(lines, "Estado actual", [`- Valor: ${state.value}`, `- Confianza: ${state.confidence}`]);

    pushSection(lines, "Control / faccion dominante", [
      `- Valor: ${control.value}`,
      `- Confianza: ${control.confidence}`
    ]);

    pushList(lines, "NPCs presentes o relevantes", relevantNpcs, (name) => name);

    pushList(lines, "Jugadores que han actuado aqui", players, (name) => name);

    pushList(lines, "Eventos importantes ocurridos", importantEvents, eventLine);

    pushSection(lines, "Ultimo evento conocido", [
      `- ${latestPost ? recentLine(latestPost) : UNKNOWN}`
    ]);

    lines.push("### Amenazas activas");
    lines.push(`- Confianza: ${threatConfidence}`);
    if (!threats.length) {
      lines.push(`- ${UNKNOWN}`);
    } else {
      for (const item of threats) {
        lines.push(`- ${item.fecha}: ${item.texto}${item.url ? ` (${item.url})` : ""}`);
      }
    }
    lines.push("");

    lines.push("### Misiones abiertas");
    lines.push(`- Confianza: ${missionConfidence}`);
    if (!missions.length) {
      lines.push(`- ${UNKNOWN}`);
    } else {
      for (const item of missions) {
        lines.push(`- ${item.fecha}: ${item.texto}${item.url ? ` (${item.url})` : ""}`);
      }
    }
    lines.push("");

    pushList(
      lines,
      "Cambios respecto al mapa base",
      changes,
      (item) => `${item.fecha}: ${item.texto}${item.url ? ` (${item.url})` : ""}`
    );

    pushSection(lines, "Dudas / necesita revision manual", [
      `- ${threats.length || missions.length || changes.length || importantEvents.length ? "Revisar manualmente para confirmar inferencias automaticas." : UNKNOWN}`
    ]);

    pushSection(lines, "URL original", [`- ${location.url || latestPost?.url || UNKNOWN}`]);

    pushSection(lines, "Archivo JSON", [`- data/localizaciones/${location.archivo}`]);

    debug.push(
      `## ${location.code} — ${location.name}`,
      debugBlock("Inferencias", {
        estado: state,
        control,
        confianzaAmenazas: threatConfidence,
        confianzaMisiones: missionConfidence
      }),
      debugBlock(
        "Ultimos mensajes usados",
        recentPosts.map((post) => ({
          fecha: post.fecha,
          autor: post.autor,
          personaje: post.personaje,
          url: post.url,
          texto: oneSentence(post.texto, 300)
        }))
      ),
      debugBlock("Amenazas detectadas", threats),
      debugBlock("Misiones detectadas", missions),
      debugBlock("Cambios detectados", changes),
      debugBlock("Candidatos NPC descartados por no estar en whitelist", npcCandidates),
      debugBlock("Candidatos descartados por coincidir con localizaciones", locationCandidates),
      debugBlock(
        "Eventos importantes usados",
        importantEvents.map((event) => ({
          id: event.id,
          fecha: event.fecha,
          palabrasClave: event.palabrasClave,
          resumen: oneSentence(event.textoFuente || event.resumenAutomatico, 300),
          url: event.url
        }))
      )
    );
  }

  await fs.mkdir(EXPORTS_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, `${lines.join("\n").trim()}\n`, "utf8");
  await fs.writeFile(DEBUG_OUTPUT, `${debug.join("\n").trim()}\n`, "utf8");
  console.log(`Estado actual generado: ${path.relative(ROOT, OUTPUT)}`);
  console.log(`Debug generado: ${path.relative(ROOT, DEBUG_OUTPUT)}`);
  console.log(`Localizaciones incluidas: ${locations.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

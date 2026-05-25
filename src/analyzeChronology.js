const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "data", "cronologia_global.md");
const ENTITIES_DIR = path.join(ROOT, "data", "entidades");
const EVENTS_DIR = path.join(ROOT, "data", "eventos");

const IMPORTANT_KEYWORDS = [
  "muerte",
  "muere",
  "murio",
  "murieron",
  "asesinato",
  "batalla",
  "combate",
  "guerra",
  "destruccion",
  "destruido",
  "destruida",
  "captura",
  "capturado",
  "capturada",
  "fundacion",
  "fundado",
  "fundada",
  "invasion",
  "invadir",
  "descubrimiento",
  "descubre",
  "descubren",
  "traicion",
  "traiciona",
  "ritual",
  "corrupcion",
  "corrompido",
  "corrompida",
  "plaga",
  "alianza",
  "extinta",
  "ruinas",
  "amenaza",
  "portal",
  "cristal",
  "sello",
  "maldicion",
  "resurreccion",
  "sacrificio",
  "huida",
  "ataque",
  "asedio",
  "conquista",
  "liberacion"
];

const FACTION_SEEDS = [
  "Alianza del Cristal",
  "Talsyrc",
  "Triarcas",
  "Filgaia",
  "Gremio de Inventores",
  "Nueva Vector",
  "Nueva Roclenia",
  "Nueva Lyrule",
  "Nueva Delhyde",
  "Fortaleza de Roland",
  "Fortaleza de Farar",
  "Fortaleza Gnoll",
  "Fortaleza de Shin-ra",
  "Fuerte Belvor",
  "Strixhaven"
];

const COMMON_ENTITY_STOPWORDS = new Set(
  [
    "Autor",
    "Personaje",
    "URL",
    "SISTEMA",
    "Director",
    "Situacion Actual",
    "Historia En Las Islas",
    "Historia Fuera De Las Islas",
    "Clases",
    "Entrada De Wiki",
    "Datos De Interes",
    "Pendiente",
    "Unidad",
    "No",
    "Si",
    "Pero",
    "Entonces",
    "Tras",
    "Todo",
    "Nada",
    "Como",
    "Cuando",
    "Mientras",
    "Aquel",
    "Aquella",
    "Aquello",
    "Este",
    "Esta",
    "Estos",
    "Estas",
    "Los",
    "Las",
    "El",
    "La"
    ,"Un"
    ,"Una"
    ,"Unos"
    ,"Unas"
    ,"Al"
    ,"Del"
    ,"Por"
    ,"Para"
    ,"Con"
    ,"Sin"
    ,"Sobre"
    ,"Desde"
    ,"Donde"
    ,"Durante"
    ,"Luego"
    ,"Finalmente"
    ,"Antes"
    ,"Despues"
    ,"Después"
    ,"Aunque"
    ,"Porque"
    ,"Puede"
    ,"Podria"
    ,"Podría"
    ,"Era"
    ,"Fue"
    ,"Ser"
    ,"Se"
    ,"Su"
    ,"Sus"
    ,"Le"
    ,"Lo"
    ,"Les"
    ,"Es"
    ,"En"
    ,"Y"
    ,"O"
    ,"Cada"
    ,"Parte"
    ,"Reino"
    ,"Reinos"
    ,"Ciudad"
    ,"Nacion"
    ,"Nación"
    ,"Gremio"
    ,"Alianza"
    ,"HISTORIA"
    ,"SITUACION"
    ,"ACTUAL"
    ,"Que"
    ,"Qué"
    ,"Quien"
    ,"Quién"
    ,"Dijo"
    ,"Dice"
    ,"Bueno"
    ,"Buenas"
    ,"Eso"
    ,"Esto"
    ,"Este"
    ,"Esta"
    ,"Esa"
    ,"Ese"
    ,"Así"
    ,"Asi"
    ,"Solo"
    ,"Sólo"
    ,"Desconocido"
    ,"Indicado"
    ,"No indicado"
    ,"Continua"
    ,"Continúa"
    ,"Segun"
    ,"Según"
    ,"Pese"
    ,"Ademas"
    ,"Además"
    ,"Acto"
    ,"Ante"
    ,"Ahora"
    ,"Ordeno"
    ,"Ordenó"
    ,"Intento"
    ,"Intentó"
    ,"Podia"
    ,"Podía"
    ,"Habia"
    ,"Había"
    ,"Habian"
    ,"Habían"
    ,"Tenia"
    ,"Tenía"
    ,"Parecia"
    ,"Parecía"
    ,"Queria"
    ,"Quería"
    ,"Hizo"
    ,"Comento"
    ,"Comentó"
    ,"Vamos"
    ,"Atencion"
    ,"Atención"
    ,"ATENCION"
    ,"ATENCIÓN"
    ,"Espera"
    ,"Espera-"
    ,"Vale"
    ,"Vaya"
    ,"Oh"
    ,"Eh"
    ,"Ah"
    ,"Miró"
    ,"Miro"
    ,"Volvio"
    ,"Volvió"
    ,"Siguio"
    ,"Siguió"
    ,"Tras"
    ,"Apenas"
    ,"Incluso"
    ,"Quizas"
    ,"Quizás"
    ,"Tal"
    ,"Todos"
    ,"Todas"
    ,"Nadie"
    ,"Alguien"
    ,"Algo"
    ,"Alli"
    ,"Allí"
    ,"Aqui"
    ,"Aquí"
    ,"Ahi"
    ,"Ahí"
  ].map(normalizeKey)
);

const GENERIC_FACTION_KEYS = new Set(
  [
    "ciudad",
    "reino",
    "reinos",
    "nacion",
    "nación",
    "gremio",
    "alianza",
    "fortaleza",
    "orden",
    "imperio"
  ].map(normalizeKey)
);

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseDate(fecha) {
  const match = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`;
}

function slugFromUrl(url, location) {
  if (!url) return normalizeKey(location).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "desconocida";
  } catch {
    return normalizeKey(location).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
}

function parseChronology(markdown) {
  const headerRegex = /^##\s+(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2})\s+-\s+(.+)$/gm;
  const headers = [...markdown.matchAll(headerRegex)];

  return headers.map((header, index) => {
    const start = header.index + header[0].length;
    const end = index + 1 < headers.length ? headers[index + 1].index : markdown.length;
    const block = markdown.slice(start, end);
    const autor = block.match(/^- Autor:\s*(.+)$/m)?.[1]?.trim() || null;
    const personaje = block.match(/^- Personaje:\s*(.+)$/m)?.[1]?.trim() || null;
    const url = block.match(/^- URL:\s*(.+)$/m)?.[1]?.trim() || null;
    const texto = cleanText(
      block
        .replace(/^- Autor:\s*.+$/m, "")
        .replace(/^- Personaje:\s*.+$/m, "")
        .replace(/^- URL:\s*.+$/m, "")
    );
    const fecha = header[1].trim();
    const localizacion = header[2].trim();

    return {
      id: index + 1,
      fecha,
      fechaIso: parseDate(fecha),
      localizacion,
      slug: slugFromUrl(url, localizacion),
      autor,
      personaje,
      url,
      texto
    };
  });
}

function bump(map, key, create) {
  const normalized = normalizeKey(key);
  if (!normalized) return null;
  if (!map.has(normalized)) map.set(normalized, create(key));
  const item = map.get(normalized);
  item.frecuencia += 1;
  return item;
}

function addSetCount(container, key) {
  if (!key) return;
  container[key] = (container[key] || 0) + 1;
}

function detectKeywords(text) {
  const normalized = normalizeKey(text);
  return IMPORTANT_KEYWORDS.filter((keyword) => {
    const key = normalizeKey(keyword);
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(key)}([^a-z0-9]|$)`).test(normalized);
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectFactions(text, factionNames) {
  const normalized = normalizeKey(text);
  return factionNames.filter((name) => {
    const key = normalizeKey(name);
    return key && normalized.includes(key);
  });
}

function detectProperNames(text) {
  const candidates = new Map();
  const regex =
    /\b[A-ZÁÉÍÓÚÜÑ][\p{L}'’.-]{2,}(?:[ \t]+(?:de|del|la|las|los|el|y|e|d'|D'|[A-ZÁÉÍÓÚÜÑ][\p{L}'’.-]{2,})){0,4}/gu;
  for (const match of text.matchAll(regex)) {
    const raw = cleanEntityName(match[0]);
    const key = normalizeKey(raw);
    if (!raw || raw.length < 3 || COMMON_ENTITY_STOPWORDS.has(key)) continue;
    if (COMMON_ENTITY_STOPWORDS.has(normalizeKey(raw.split(/\s+/)[0]))) continue;
    if (/^[A-ZÁÉÍÓÚÜÑ\s]+$/.test(raw) && raw.split(/\s+/).length > 1) continue;
    if (/^https?$/i.test(raw)) continue;
    if (/^\d/.test(raw)) continue;
    candidates.set(key, raw);
  }
  return [...candidates.values()];
}

function cleanEntityName(value) {
  let cleaned = cleanText(value)
    .replace(/^[^\p{L}]+|[^\p{L}'’.-]+$/gu, "")
    .replace(/[.-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  cleaned = cleaned.replace(/\s+(de|del|la|las|los|el|y|e|d'|D')$/u, "").trim();
  return cleaned;
}

function shortExcerpt(text, keywords) {
  const compact = cleanText(text).replace(/\n+/g, " ");
  const normalized = normalizeKey(compact);
  const keyword = keywords.find((item) => normalized.includes(normalizeKey(item)));
  if (!keyword) return compact.slice(0, 400);
  const index = Math.max(0, normalized.indexOf(normalizeKey(keyword)) - 180);
  return compact.slice(index, index + 520).trim();
}

function sortedObjectEntries(obj) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([nombre, frecuencia]) => ({ nombre, frecuencia }));
}

function finalizeEntity(entity) {
  return {
    ...entity,
    localizaciones: sortedObjectEntries(entity.localizaciones),
    autores: sortedObjectEntries(entity.autores),
    personajesRelacionados: sortedObjectEntries(entity.personajesRelacionados),
    faccionesRelacionadas: sortedObjectEntries(entity.faccionesRelacionadas),
    eventosRelacionados: entity.eventosRelacionados.slice(0, 100)
  };
}

function buildAnalysis(posts) {
  const factionNames = new Set(FACTION_SEEDS);
  const localizacionNames = new Set(posts.map((post) => post.localizacion));
  const authorNames = new Set(
    posts
      .flatMap((post) => [post.autor, post.personaje])
    .filter(Boolean)
      .filter((name) => !["SISTEMA", "Director", "No indicado", "Desconocido"].includes(name))
  );

  for (const post of posts) {
    for (const name of detectProperNames(post.texto)) {
      const key = normalizeKey(name);
      if (
        !GENERIC_FACTION_KEYS.has(key) &&
        /\b(gremio|reino|alianza|orden|fortaleza|nacion|nación|ciudad|imperio)\b/i.test(name)
      ) {
        factionNames.add(name);
      }
    }
  }

  const npcs = new Map();
  const factions = new Map();
  const locations = new Map();
  const importantEvents = [];

  for (const post of posts) {
    const location = bump(locations, post.slug, (slug) => ({
      slug: normalizeKey(slug).replace(/[^a-z0-9]+/g, "-"),
      nombre: post.localizacion,
      frecuencia: 0,
      mensajes: 0,
      primeraAparicion: post.fechaIso,
      ultimaAparicion: post.fechaIso,
      autores: {},
      personajes: {},
      facciones: {},
      eventosImportantes: []
    }));

    location.mensajes += 1;
    if (post.fechaIso && (!location.primeraAparicion || post.fechaIso < location.primeraAparicion)) {
      location.primeraAparicion = post.fechaIso;
    }
    if (post.fechaIso && (!location.ultimaAparicion || post.fechaIso > location.ultimaAparicion)) {
      location.ultimaAparicion = post.fechaIso;
    }
    addSetCount(location.autores, post.autor);
    addSetCount(location.personajes, post.personaje);

    const mentionedFactions = detectFactions(post.texto, [...factionNames]);
    const properNames = new Set([...detectProperNames(post.texto), ...[post.autor, post.personaje].filter(Boolean)]);
    const mentionedPeople = [...properNames].filter((name) => {
      const key = normalizeKey(name);
      if (!key || COMMON_ENTITY_STOPWORDS.has(key)) return false;
      if (normalizeKey(post.localizacion) === key) return false;
      if ([...localizacionNames].some((loc) => normalizeKey(loc) === key)) return false;
      if (mentionedFactions.some((faction) => normalizeKey(faction) === key)) return false;
      if (mentionedFactions.some((faction) => key.includes(normalizeKey(faction)))) return false;
      if (/\b(gremio|reino|alianza|fortaleza|ciudad|nacion|nación|imperio)\b/i.test(name)) return false;
      return authorNames.has(name) || name.split(/\s+/).length <= 4;
    });

    for (const faction of mentionedFactions) {
      const item = bump(factions, faction, (nombre) => ({
        nombre,
        frecuencia: 0,
        primeraAparicion: post.fechaIso,
        ultimaAparicion: post.fechaIso,
        localizaciones: {},
        autores: {},
        personajesRelacionados: {},
        faccionesRelacionadas: {},
        eventosRelacionados: []
      }));
      if (post.fechaIso && (!item.primeraAparicion || post.fechaIso < item.primeraAparicion)) item.primeraAparicion = post.fechaIso;
      if (post.fechaIso && (!item.ultimaAparicion || post.fechaIso > item.ultimaAparicion)) item.ultimaAparicion = post.fechaIso;
      addSetCount(item.localizaciones, post.localizacion);
      addSetCount(item.autores, post.autor);
      addSetCount(location.facciones, item.nombre);
    }

    for (const person of mentionedPeople) {
      const item = bump(npcs, person, (nombre) => ({
        nombre,
        frecuencia: 0,
        primeraAparicion: post.fechaIso,
        ultimaAparicion: post.fechaIso,
        esAutorOPersonaje: authorNames.has(nombre),
        localizaciones: {},
        autores: {},
        personajesRelacionados: {},
        faccionesRelacionadas: {},
        eventosRelacionados: []
      }));
      if (post.fechaIso && (!item.primeraAparicion || post.fechaIso < item.primeraAparicion)) item.primeraAparicion = post.fechaIso;
      if (post.fechaIso && (!item.ultimaAparicion || post.fechaIso > item.ultimaAparicion)) item.ultimaAparicion = post.fechaIso;
      if (authorNames.has(person)) item.esAutorOPersonaje = true;
      addSetCount(item.localizaciones, post.localizacion);
      addSetCount(item.autores, post.autor);

      for (const other of mentionedPeople) {
        if (normalizeKey(other) !== normalizeKey(person)) addSetCount(item.personajesRelacionados, other);
      }
      for (const faction of mentionedFactions) addSetCount(item.faccionesRelacionadas, faction);
    }

    for (const faction of mentionedFactions) {
      const item = factions.get(normalizeKey(faction));
      if (!item) continue;
      for (const person of mentionedPeople) addSetCount(item.personajesRelacionados, person);
      for (const other of mentionedFactions) {
        if (normalizeKey(other) !== normalizeKey(faction)) addSetCount(item.faccionesRelacionadas, other);
      }
    }

    const keywords = detectKeywords(post.texto);
    if (keywords.length) {
      const event = {
        id: `evt-${String(importantEvents.length + 1).padStart(5, "0")}`,
        fecha: post.fecha,
        fechaIso: post.fechaIso,
        localizacion: post.localizacion,
        slug: post.slug,
        autor: post.autor,
        personaje: post.personaje,
        url: post.url,
        palabrasClave: keywords,
        personajesMencionados: mentionedPeople,
        faccionesMencionadas: mentionedFactions,
        importancia: Math.min(10, keywords.length + Math.ceil(mentionedPeople.length / 4) + Math.ceil(mentionedFactions.length / 2)),
        resumenAutomatico: shortExcerpt(post.texto, keywords)
      };
      importantEvents.push(event);
      location.eventosImportantes.push(event.id);
      for (const person of mentionedPeople) {
        const item = npcs.get(normalizeKey(person));
        if (item) item.eventosRelacionados.push(event.id);
      }
      for (const faction of mentionedFactions) {
        const item = factions.get(normalizeKey(faction));
        if (item) item.eventosRelacionados.push(event.id);
      }
    }
  }

  const npcList = [...npcs.values()]
    .filter((item) => item.esAutorOPersonaje || item.frecuencia >= 2)
    .map(finalizeEntity)
    .sort((a, b) => b.frecuencia - a.frecuencia || a.nombre.localeCompare(b.nombre));

  const factionList = [...factions.values()]
    .filter((item) => item.frecuencia >= 1)
    .map(finalizeEntity)
    .sort((a, b) => b.frecuencia - a.frecuencia || a.nombre.localeCompare(b.nombre));

  const locationList = [...locations.values()]
    .map((item) => ({
      ...item,
      autores: sortedObjectEntries(item.autores),
      personajes: sortedObjectEntries(item.personajes),
      facciones: sortedObjectEntries(item.facciones)
    }))
    .sort((a, b) => b.mensajes - a.mensajes || a.nombre.localeCompare(b.nombre));

  importantEvents.sort((a, b) => (a.fechaIso || "").localeCompare(b.fechaIso || "") || a.id.localeCompare(b.id));

  return {
    npcs: npcList,
    factions: factionList,
    locations: locationList,
    importantEvents
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const markdown = await fs.readFile(INPUT, "utf8");
  const posts = parseChronology(markdown);
  const analysis = buildAnalysis(posts);

  await writeJson(path.join(ENTITIES_DIR, "npcs.json"), analysis.npcs);
  await writeJson(path.join(ENTITIES_DIR, "facciones.json"), analysis.factions);
  await writeJson(path.join(ENTITIES_DIR, "localizaciones.json"), analysis.locations);
  await writeJson(path.join(EVENTS_DIR, "eventos_importantes.json"), analysis.importantEvents);

  console.log(`Mensajes analizados: ${posts.length}`);
  console.log(`NPCs/personajes detectados: ${analysis.npcs.length}`);
  console.log(`Facciones detectadas: ${analysis.factions.length}`);
  console.log(`Localizaciones detectadas: ${analysis.locations.length}`);
  console.log(`Eventos importantes detectados: ${analysis.importantEvents.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildAnalysis,
  detectKeywords,
  detectProperNames,
  parseChronology
};

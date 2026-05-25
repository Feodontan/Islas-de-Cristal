const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "exports", "02_Estado_Actual.md");
const LOCATIONS_WHITELIST_FILE = path.join(ROOT, "data", "entidades", "localizaciones_whitelist.json");

const EM_DASH = "\u2014";

const FORBIDDEN_TERMS = [
  "Añadió",
  "Añadio",
  "Exclama",
  "Murmura",
  "Dijo",
  "Gritó",
  "Grito",
  "Comentó",
  "Comento",
  "Perfecto",
  "Ahora",
  "Clase de Armadura",
  "Armor Class",
  "Hit Points",
  "Languages",
  "Attack",
  "Medium Humanoid"
];

const HTML_RE = /<\/?[a-z][\s\S]*?>/i;
const SECTION_RE = new RegExp(`^##\\s+(\\d{4})\\s+${EM_DASH}\\s+(.+)$`);
const NPC_HEADER_RE = /^###\s+NPCs presentes o relevantes$/;
const NEXT_SECTION_RE = /^(##|###)\s+/;
const COMPACT_SECTION_RE = /^##\s+\d{4}\s+.+\s+###\s+.+\s+-\s+/;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isSuspiciousNpc(value) {
  const npc = value.replace(/^\s*-\s*/, "").trim();
  if (!npc || npc === "Desconocido") return false;
  if (npc.includes(".")) return true;
  if (npc.split(/\s+/).length > 4) return true;
  const normalized = normalize(npc);
  return FORBIDDEN_TERMS.some((term) => normalized.includes(normalize(term)));
}

function locationKey(codigo, nombre) {
  return `${codigo}|${normalize(nombre).replace(/\s+/g, " ").trim()}`;
}

function loadLocationWhitelist() {
  if (!fs.existsSync(LOCATIONS_WHITELIST_FILE)) return { sections: new Set(), names: new Set() };
  const locations = JSON.parse(fs.readFileSync(LOCATIONS_WHITELIST_FILE, "utf8"));
  return {
    sections: new Set(locations.map((item) => locationKey(item.codigo, item.nombre))),
    names: new Set(
      locations.flatMap((item) => [
        normalize(item.nombre).replace(/\s+/g, " ").trim(),
        normalize(String(item.slug || "").replace(/-/g, " ")).replace(/\s+/g, " ").trim()
      ])
    )
  };
}

function main() {
  const text = fs.readFileSync(FILE, "utf8");
  const lines = text.split(/\r?\n/);
  const warnings = [];
  const locationWhitelist = loadLocationWhitelist();
  let inNpcBlock = false;

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (line.length > 300) warnings.push(`${lineNo}: linea de mas de 300 caracteres (${line.length})`);
    for (const term of FORBIDDEN_TERMS) {
      if (normalize(line).includes(normalize(term))) warnings.push(`${lineNo}: termino prohibido: ${term}`);
    }
    if (HTML_RE.test(line)) warnings.push(`${lineNo}: posible HTML residual`);
    if (/^## .+- /.test(line) && line.includes("- Estado actual:")) {
      warnings.push(`${lineNo}: posible seccion apelmazada sin salto de linea`);
    }
    if (COMPACT_SECTION_RE.test(line) || (/^##\s+\d{4}/.test(line) && line.includes("###"))) {
      warnings.push(`${lineNo}: localizacion compactada en una sola linea`);
    }
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch && !locationWhitelist.sections.has(locationKey(sectionMatch[1], sectionMatch[2]))) {
      warnings.push(`${lineNo}: seccion no corresponde a localizacion real: ${line}`);
    }
    if (NPC_HEADER_RE.test(line.trim())) {
      inNpcBlock = true;
      return;
    }
    if (inNpcBlock && NEXT_SECTION_RE.test(line)) inNpcBlock = false;
    if (inNpcBlock && /^\s+-\s+/.test(line) && isSuspiciousNpc(line)) {
      warnings.push(`${lineNo}: NPC sospechoso: ${line.trim().replace(/^- /, "")}`);
    }
    if (inNpcBlock && /^\s+-\s+/.test(line)) {
      const npc = line.replace(/^\s*-\s*/, "").trim();
      const npcKey = normalize(npc).replace(/\s+/g, " ").trim();
      if (npc !== "Desconocido" && locationWhitelist.names.has(npcKey)) {
        warnings.push(`${lineNo}: NPC coincide con una localizacion: ${npc}`);
      }
    }
  });

  const sectionCount = lines.filter((line) => SECTION_RE.test(line)).length;
  if (!sectionCount) warnings.push("No se detectaron secciones de localizacion con formato ## 0000 Nombre");
  if (sectionCount && lines.length < sectionCount * 10) {
    warnings.push(`El archivo parece compactado: ${lines.length} lineas para ${sectionCount} secciones`);
  }

  if (warnings.length) {
    console.warn(`Validacion con avisos (${warnings.length}):`);
    for (const warning of warnings.slice(0, 200)) console.warn(`- ${warning}`);
    if (warnings.length > 200) console.warn(`- ... ${warnings.length - 200} avisos mas`);
    process.exitCode = 1;
    return;
  }

  console.log(`Estado actual validado sin avisos. Secciones: ${sectionCount}`);
}

main();

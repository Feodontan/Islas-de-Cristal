const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILE = path.join(ROOT, "exports", "02_Estado_Actual.md");

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
const SECTION_RE = /^##\s+\d{4}\s+/;
const NPC_HEADER = "- NPCs presentes o relevantes:";
const NEXT_TOP_LEVEL = /^- (Jugadores|Eventos|Ultimo|Amenazas|Misiones|Cambios|Dudas|URL)/;

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

function main() {
  const text = fs.readFileSync(FILE, "utf8");
  const lines = text.split(/\r?\n/);
  const warnings = [];
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
    if (line.trim() === NPC_HEADER) {
      inNpcBlock = true;
      return;
    }
    if (inNpcBlock && NEXT_TOP_LEVEL.test(line)) inNpcBlock = false;
    if (inNpcBlock && /^\s+-\s+/.test(line) && isSuspiciousNpc(line)) {
      warnings.push(`${lineNo}: NPC sospechoso: ${line.trim().replace(/^- /, "")}`);
    }
  });

  const sectionCount = lines.filter((line) => SECTION_RE.test(line)).length;
  if (!sectionCount) warnings.push("No se detectaron secciones de localizacion con formato ## 0000 Nombre");

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

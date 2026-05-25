const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "data", "entidades", "personajes_whitelist.json");
const TREE_URL = "https://api.github.com/repos/Feodontan/Islas-de-Cristal/git/trees/Perfiles-personajes?recursive=1";

const EXCLUDED_NAMES = [
  "Inicio",
  "Introduccion",
  "Introducción",
  "Mis tareas",
  "Islas de Cristal",
  "Dragon's Rest",
  "Fortaleza de Farar",
  "Fortaleza de Shin-ra",
  "Cueva Goblin",
  "Cueva Kobold",
  "Bosque de Smel",
  "El gran paramo",
  "El gran páramo",
  "La aldea",
  "La torre del mago",
  "Federacion de Bahamut",
  "Federación de Bahamut",
  "Filgaia"
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}' ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanNameFromFile(filePath) {
  const fileName = path.basename(filePath, ".md");
  return fileName.replace(/\s+[0-9a-f]{16,40}$/i, "").replace(/\s+/g, " ").trim();
}

async function fetchTree() {
  const response = await fetch(TREE_URL, {
    headers: {
      "User-Agent": "islas-cristalinas-scraper",
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub respondio ${response.status} al leer Perfiles-personajes`);
  }

  return response.json();
}

async function main() {
  const excluded = new Set(EXCLUDED_NAMES.map(normalize));
  const tree = await fetchTree();
  const namesByKey = new Map();

  for (const item of tree.tree || []) {
    if (item.type !== "blob" || !item.path.endsWith(".md")) continue;

    const nombre = cleanNameFromFile(item.path);
    const key = normalize(nombre);
    if (!nombre || excluded.has(key)) continue;
    if (namesByKey.has(key)) continue;

    namesByKey.set(key, {
      nombre,
      archivo: path.basename(item.path),
      path: item.path
    });
  }

  const whitelist = [...namesByKey.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(whitelist, null, 2)}\n`, "utf8");

  console.log(`Whitelist generada: ${path.relative(ROOT, OUTPUT)}`);
  console.log(`Personajes incluidos: ${whitelist.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

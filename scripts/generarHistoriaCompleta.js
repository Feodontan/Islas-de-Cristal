const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOCATIONS_DIR = path.join(ROOT, "data", "localizaciones");
const EXPORTS_DIR = path.join(ROOT, "exports");
const OUTPUT = path.join(EXPORTS_DIR, "05_Historia_Completa.md");
const INDEX_OUTPUT = path.join(EXPORTS_DIR, "05_Historia_Completa_INDEX.json");
const EM_DASH = "\u2014";

function clean(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleFromFile(file) {
  const match = String(file || "").match(/^(\d{4})-(.+)\.json$/);
  if (!match) return { codigo: "????", nombre: file.replace(/\.json$/, ""), slug: file.replace(/\.json$/, "") };

  const [, codigo, slug] = match;
  const nombre = slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");

  return { codigo, nombre, slug };
}

function locationLabel(post, fileInfo) {
  const title = clean(post.localizacion?.titulo || "");
  if (title) return title.replace(/^\d{4}\s*:?\s*/, `${fileInfo.codigo} ${EM_DASH} `);
  return `${fileInfo.codigo} ${EM_DASH} ${fileInfo.nombre}`;
}

function sortKey(post) {
  if (post.fechaIso) return post.fechaIso;
  return "9999-12-31T23:59:59";
}

async function readLocationFile(file) {
  const filePath = path.join(LOCATIONS_DIR, file);
  const posts = JSON.parse(await fs.readFile(filePath, "utf8"));
  const fileInfo = titleFromFile(file);

  return posts.map((post, index) => ({
    ...post,
    _ordenEnArchivo: index,
    _archivo: file,
    _codigo: fileInfo.codigo,
    _slugArchivo: fileInfo.slug,
    _localizacionNombre: fileInfo.nombre,
    _localizacionLabel: locationLabel(post, fileInfo)
  }));
}

function pushPost(lines, post, index) {
  const autor = clean(post.autor) || "Desconocido";
  const personaje = clean(post.personaje);
  const texto = clean(post.texto);

  lines.push(`## ${String(index + 1).padStart(5, "0")} ${EM_DASH} ${post.fecha || "Sin fecha"} ${EM_DASH} ${post._localizacionLabel}`);
  lines.push("");
  lines.push(`- Fecha ISO: ${post.fechaIso || "Sin fecha ISO"}`);
  lines.push(`- Localizacion: ${post._localizacionLabel}`);
  lines.push(`- Archivo origen: data/localizaciones/${post._archivo}`);
  lines.push(`- Pagina: ${post.pagina || "Desconocida"}`);
  lines.push(`- Autor: ${autor}`);
  lines.push(`- Personaje: ${personaje || "No indicado"}`);
  lines.push(`- URL: ${post.url || "Sin URL"}`);
  if (post.messageId) lines.push(`- Mensaje ID: ${post.messageId}`);
  lines.push("");
  lines.push(texto || "_Mensaje sin texto parseado._");
  lines.push("");
  lines.push("---");
  lines.push("");
}

async function main() {
  const files = (await fs.readdir(LOCATIONS_DIR)).filter((file) => file.endsWith(".json")).sort();
  const allPosts = [];

  for (const file of files) {
    const posts = await readLocationFile(file);
    allPosts.push(...posts);
  }

  allPosts.sort((a, b) => {
    const byDate = sortKey(a).localeCompare(sortKey(b));
    if (byDate) return byDate;
    const byMessage = Number(a.messageId || 0) - Number(b.messageId || 0);
    if (byMessage) return byMessage;
    return String(a._archivo).localeCompare(String(b._archivo)) || a._ordenEnArchivo - b._ordenEnArchivo;
  });

  const lines = [
    "# Historia Completa de Islas Cristalinas",
    "",
    "Documento unico generado directamente desde `data/localizaciones/*.json`.",
    "",
    "Orden: fecha de publicacion ascendente. Cada entrada conserva localizacion, autor, personaje, pagina, URL y archivo JSON original.",
    "",
    `Mensajes incluidos: ${allPosts.length}.`,
    `Localizaciones incluidas: ${files.length}.`,
    ""
  ];

  allPosts.forEach((post, index) => pushPost(lines, post, index));

  const index = {
    generadoDesde: "data/localizaciones/*.json",
    salida: "exports/05_Historia_Completa.md",
    mensajes: allPosts.length,
    localizaciones: files.length,
    primeraFecha: allPosts[0]?.fechaIso || null,
    ultimaFecha: allPosts.at(-1)?.fechaIso || null,
    archivos: files
  };

  await fs.mkdir(EXPORTS_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, `${lines.join("\n").trim()}\n`, "utf8");
  await fs.writeFile(INDEX_OUTPUT, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  console.log(`Historia completa generada: ${path.relative(ROOT, OUTPUT)}`);
  console.log(`Indice generado: ${path.relative(ROOT, INDEX_OUTPUT)}`);
  console.log(`Mensajes incluidos: ${allPosts.length}`);
  console.log(`Localizaciones incluidas: ${files.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

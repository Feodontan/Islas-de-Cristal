const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOCATIONS_DIR = path.join(ROOT, "data", "localizaciones");
const OUTPUT = path.join(ROOT, "data", "entidades", "localizaciones_whitelist.json");

function titleCaseFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

async function main() {
  const files = (await fs.readdir(LOCATIONS_DIR)).filter((file) => /^\d{4}-.+\.json$/.test(file));

  const locations = files
    .map((archivo) => {
      const [, codigo, rawSlug] = archivo.match(/^(\d{4})-(.+)\.json$/);
      return {
        codigo,
        nombre: titleCaseFromSlug(rawSlug),
        slug: rawSlug,
        archivo
      };
    })
    .sort((a, b) => Number(a.codigo) - Number(b.codigo) || a.nombre.localeCompare(b.nombre, "es"));

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(locations, null, 2)}\n`, "utf8");

  console.log(`Whitelist de localizaciones generada: ${path.relative(ROOT, OUTPUT)}`);
  console.log(`Localizaciones incluidas: ${locations.length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}

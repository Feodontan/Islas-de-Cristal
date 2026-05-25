require("dotenv").config();
const fs = require("fs/promises");

async function main() {
  const url =
    "https://www.comunidadumbria.com/partida/islas-cristalinas-18/0907-las-cuevas-de-pleamar?__Pg=1";

  console.log("Conectando...");

  const res = await fetch(url, {
    headers: {
      Cookie: process.env.UMBRIA_COOKIE,
      "User-Agent": "Mozilla/5.0"
    }
  });

  console.log("HTTP:", res.status);

  const html = await res.text();

  await fs.writeFile("debug-umbria.html", html, "utf8");

  console.log("HTML guardado en debug-umbria.html");
  console.log("Tamaño:", html.length);
  console.log("¿Detecta Mamoru?", html.includes("Mamoru"));
  console.log("¿Detecta Director?", html.includes("Director"));
  console.log("¿Detecta Cuevas de Pleamar?", html.includes("Cuevas de Pleamar"));
}

main().catch(console.error);
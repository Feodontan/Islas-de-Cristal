# Scraper de Islas Cristalinas

Scraper local para recuperar escenas de Comunidad Umbria usando una cookie de sesion guardada en `.env`.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Rellena `UMBRIA_COOKIE` con la cookie completa de una sesion valida.
3. Ajusta `UMBRIA_DELAY_MS` si quieres espaciar mas las peticiones.

`.env`, `debug-umbria.html`, `node_modules/` y `data/` quedan fuera de Git.

## Comandos

Probar el parser con el HTML local ya guardado:

```bash
npm run parse:debug
```

Descargar una localizacion concreta:

```bash
npm run scrape:location -- "https://www.comunidadumbria.com/partida/islas-cristalinas-18/0907-las-cuevas-de-pleamar"
```

Descubrir las localizaciones desde la portada de la partida y descargarlas todas:

```bash
npm run scrape
```

## Salidas

- `data/localizaciones/<slug>.json`
- `data/cronologia_global.json`
- `data/cronologia_global.md`

Cada mensaje incluye fecha, fecha ISO para ordenar, autor, personaje, texto plano, HTML original del mensaje, URL, pagina y localizacion.

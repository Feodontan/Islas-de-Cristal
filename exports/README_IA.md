# README IA - Islas Cristalinas

Esta carpeta esta pensada como fuente limpia de contexto para una IA. No contiene `.env`, cookies, credenciales, `node_modules`, herramientas auxiliares ni archivos raw de sesion.

## Orden recomendado de lectura

1. `00_Biblia_del_Mundo.md`: base del escenario, regiones, reinos, gremios, localizaciones y premisa sandbox. Usarlo para entender el mundo antes de responder preguntas.
2. `05_Historia_Completa.md`: fuente principal para reconstruir lo ocurrido. Contiene todos los mensajes de `data/localizaciones/*.json` ordenados por fecha de publicacion.
3. `05_Historia_Completa_INDEX.json`: resumen tecnico del export completo: numero de mensajes, fechas extremas y archivos de origen.
4. `01_Cronologia_Global.md`: cronologia generada desde `data/cronologia_global.md`. Usarla como apoyo si se necesita una vista ya agregada.
5. `02_Estado_Actual.md`: plantilla editable del estado vivo por region/localizacion. Debe tener prioridad sobre la cronologia cuando indique cambios recientes confirmados.
6. `03_Personajes_Facciones.md`: plantilla editable de jugadores, NPCs, reinos, gremios y relaciones.
7. `04_Pendientes_Retcons.md`: dudas, contradicciones y decisiones pendientes. Consultarlo cuando haya conflicto entre fuentes.

## Como consultar historia

Cada entrada de `05_Historia_Completa.md` tiene este formato:

```md
## 00001 - fecha - localizacion

- Fecha ISO:
- Localizacion:
- Archivo origen:
- Pagina:
- Autor:
- Personaje:
- URL:
- Mensaje ID:

Texto del mensaje.
```

Reglas de busqueda:

1. Si la pregunta trata sobre un lugar, buscar primero por `Localizacion`.
2. Si la pregunta trata sobre alguien, buscar primero por `Personaje` y tambien por apariciones del nombre en el texto.
3. Incluir mensajes cercanos del `Director` en la misma localizacion, porque suelen contener descripcion objetiva, consecuencias y estado del entorno.
4. Ordenar siempre los hallazgos por `Fecha ISO`, de mas antiguo a mas reciente.
5. Si hay dudas, volver al `Archivo origen` indicado y revisar los mensajes cercanos en `data/localizaciones/*.json`.
6. No inventar hechos, motivaciones, cierres de trama ni estados actuales si no hay evidencia textual.

## Reglas para una IA

- Tratar `05_Historia_Completa.md` como fuente primaria de hechos ocurridos en partida.
- Tratar `01_Cronologia_Global.md` como historial derivado, no como estado actual garantizado.
- Tratar `02_Estado_Actual.md` y `03_Personajes_Facciones.md` como documentos vivos.
- Si hay contradicciones, mencionarlas y no cerrar canon sin confirmacion.
- No inventar cierres de tramas si no aparecen en las fuentes.
- No consultar `.env`, cookies, `node_modules`, `tools`, `npm-cache` ni `data/raw`.

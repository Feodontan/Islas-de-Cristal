# README IA - Islas Cristalinas

Esta carpeta esta pensada como fuente limpia de contexto para una IA. No contiene `.env`, cookies, credenciales, `node_modules`, herramientas auxiliares ni archivos raw de sesion.

## Orden recomendado de lectura

1. `00_Biblia_del_Mundo.md`: base del escenario, regiones, reinos, gremios, localizaciones y premisa sandbox. Usarlo para entender el mundo antes de responder preguntas.
2. `01_Cronologia_Global.md`: cronologia completa generada desde `data/cronologia_global.md`. Usarla como fuente primaria de hechos ocurridos en partida.
3. `02_Estado_Actual.md`: plantilla editable del estado vivo por region/localizacion. Debe tener prioridad sobre la cronologia cuando indique cambios recientes confirmados.
4. `03_Personajes_Facciones.md`: plantilla editable de jugadores, NPCs, reinos, gremios y relaciones.
5. `04_Pendientes_Retcons.md`: dudas, contradicciones y decisiones pendientes. Consultarlo cuando haya conflicto entre fuentes.

## Reglas para una IA

- Tratar `01_Cronologia_Global.md` como historial, no como estado actual garantizado.
- Tratar `02_Estado_Actual.md` y `03_Personajes_Facciones.md` como documentos vivos.
- Si hay contradicciones, mencionarlas y no cerrar canon sin confirmacion.
- No inventar cierres de tramas si no aparecen en las fuentes.
- No consultar `.env`, cookies, `node_modules`, `tools`, `npm-cache` ni `data/raw`.

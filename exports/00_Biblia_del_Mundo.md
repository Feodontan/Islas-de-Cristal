# Biblia del Mundo - Islas Cristalinas

## Premisa sandbox

Islas Cristalinas es una partida sandbox de rol por web ambientada en un territorio de multiples reinos, ciudades, ruinas, gremios, facciones y heroes reencarnados. La partida se organiza por escenas/localizaciones, muchas de ellas marcadas con codigos de cuatro digitos que funcionan como coordenadas de mapa.

La estructura del mundo permite tramas simultaneas: cada region puede tener control politico propio, amenazas locales, NPCs activos, rumores, consecuencias y cambios de estado.

## Como leer el mapa

Las localizaciones principales usan prefijos como `0907`, `1312` o `1710`. Deben interpretarse como casillas o coordenadas del mapa sandbox. Las escenas sin prefijo numerico suelen ser escenas personales, documentos de referencia, comunicacion entre personajes, dudas o wiki.

## Localizaciones principales recuperadas

- `0607`: Pecio Maldito.
- `0608`: Nueva Vector.
- `0706`: Dragon's Rest.
- `0707`: Planicie.
- `0711`: Strixhaven.
- `0813`: El valle de huesos.
- `0907`: Las cuevas de Pleamar.
- `0913`: La Torre Negra.
- `1012`: La Aldea.
- `1013`: Fortaleza Gnoll.
- `1110`: Pantano de las grandes bestias.
- `1111`: Nueva Roclenia.
- `1112`: Fortaleza de Farar.
- `1114`: Nubelon.
- `1210`: Fortaleza de Roland.
- `1211`: Nueva Lyrule.
- `1212`: Cueva Goblin.
- `1213`: Lipwick / Bosque de Smel.
- `1214`: Poblado orco.
- `1310`: Tybra.
- `1312`: Nueva Delhyde.
- `1313`: Cueva Kobold.
- `1315`: El gran Paramo.
- `1316`: Valleoscuro.
- `1410`: La torre de Granath.
- `1411`: Cienaga Negra.
- `1412`: La torre del mago.
- `1413`: Tumba de Shraevyn.
- `1512`: Paso Duvik.
- `1611`: Fortaleza de Shin-ra.
- `1612`: Morsten.
- `1709`: La villa de Barduk.
- `1710`: Villa Batlet / Fuerte Desastre.
- `1712`: Fuerte Belvor.

## Reinos y marco politico

La escena `LAS DIEZ NACIONES` contiene la base recuperada para los reinos. Entre los nombres detectados en el scrape aparecen Talsyrc, Filgaia y los Triarcas, vinculados a la Alianza del Cristal. Nueva Roclenia aparece como capital de Talsyrc y Tybra como ciudad secundaria. Cecil aparece asociado a Talsyrc como guardian o figura protectora.

Este bloque debe completarse tras revisar `data/localizaciones/las-diez-naciones.json` y consolidar los reinos en `03_Personajes_Facciones.md`.

## Gremios

La escena `GREMIOS` contiene entradas de organizaciones. Una entrada recuperada relevante es el Gremio de Inventores, con sedes en la torre de Granath y Nueva Delhyde, liderado por Euclid / Ingeniero Tom. Sus intereses incluyen materiales raros, informacion sobre ruinas y esquemas antiguos.

Completar el resto de gremios desde `data/localizaciones/gremios.json`.

## Personas de interes

La escena `PERSONAS DE INTERES` lista nombres como Cid, Robbie, Emma y Cecil, vinculados a reinos como Talsyrc, Triarcas y Filgaia. Completar detalles de cada NPC en `03_Personajes_Facciones.md`.

## Comunicacion entre heroes

La escena `COMUNICACION` funciona como canal comun de mensajes entre reencarnados/heroes. Debe tratarse como fuente para relaciones, objetivos compartidos, rumores y coordinacion entre personajes.

## Escenas personales recuperadas

Entre las escenas personales o de personaje figuran Beatrix L'back, Carol Copper, Dicebolic, Chica misteriosa, Fang, Horus Icarus, Jacklin, Kirara, Mamoru Ai Yastis, Nadia Stormstride, Rebecca, Frugal Templanza, Gustaff el inmortal y Hajime Nagumo.

## Uso canonico

- Para hechos ocurridos: consultar `01_Cronologia_Global.md`.
- Para estado vigente: completar y consultar `02_Estado_Actual.md`.
- Para personajes, facciones y relaciones: completar y consultar `03_Personajes_Facciones.md`.
- Para contradicciones o decisiones no cerradas: consultar `04_Pendientes_Retcons.md`.

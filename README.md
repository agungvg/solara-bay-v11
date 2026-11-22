# Solara Bay — Open-World Crime

[![make.fun](https://make.fun/badge.svg)](https://make.fun)
[![gta6-01](https://make.fun/badge-gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![Solara Bay](https://make.fun/badge-solara-bay.svg)](https://make.fun/competitions/gta6-01)

An open-world crime game in the spirit of GTA 6, built from zero for the
make.fun gta6-01 bounty. A sun-soaked coastal city — Kumala Strand, the
Lantern Market, the Marina, Downtown — with a noon-blue-sky daytime base and
a golden-hour sunset chase, built in Three.js from procedural geometry and
canvas textures. Nothing is fetched at runtime: the game plays offline from
static files.

## Play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts   # http://localhost:8080
```

- **W A S D** drive / walk · **E** enter & exit car · **F** shoot · **1–6** weapons
- **M** map & stats · **Space** handbrake · **Shift** sprint · **R** retry mission

## What is in the game

- **8 story missions** with staged objectives, win/lose and payouts — from
  FIRST LIGHT (steal the Rukan Pelo GT) to ORU'S FALL (wreck the Regent
  before the pier) and the SOLARA HEIST finale.
- **Wanted / police** (0–5 stars) with named KPD units, roles and live
  distances, pursuit → search → escape, roadblocks and the AIR-1 helicopter.
- **Vehicles**: hero sports car (dented), traffic, black-and-white police
  sedans with POLICE door lettering and light bars, a scooter, a tank
  roadblock and the police heli with its searchlight cone.
- **On foot**: third-person player, a varied market crowd, armed guards,
  six weapon slots with tracers and ammo.
- **World**: palm-lined Strand Boulevard, beach with umbrellas, the ocean and
  a big yacht with a tall sail, the pier, a Ferris wheel, the lantern market
  with neon signs — plus noon / golden-hour / night / rain light presets.
- **HUD + circular minimap**, district standing, crew cards, radio, dialogue.
- **MAP / STATS meta screen**: 66.1% completion ring, progress tracks,
  mission ratings, career stats, a real city map (8 districts), workshop
  upgrades, weapons & gear, 3 save slots.
- **Audio**: synthesised engine, sirens, gunshots and a radio jingle —
  no audio files. **Saves** live in localStorage.

## Build

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-game.ts` library:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/v11-out node main.ts
```

Three.js r160 is vendored as `game/vendor/three.module.min.js` (MIT).

## License

MIT — see `LICENSE`.

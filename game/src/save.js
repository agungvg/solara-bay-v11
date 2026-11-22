// Saves: three slots in localStorage, with a schema version and migration for
// old saves. A save holds cash, RP, mission progress, owned upgrades and the
// player's last district — everything Continue needs.
const KEY = 'solara-bay-v11-saves';
const SCHEMA = 1;

export function emptySave() {
  return {
    schema: SCHEMA, cash: 2450, rp: 0, rank: 1, missionsDone: 0,
    upgrades: [], weaponsOwned: ['FISTS', '.38', 'SMG'],
    district: 'KUMALA STRAND', savedAt: Date.now(),
  };
}

export function readSaves() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [null, null, null];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [null, null, null];
    return [0, 1, 2].map((i) => migrate(arr[i] ?? null));
  } catch {
    return [null, null, null];
  }
}

function migrate(save) {
  if (!save || typeof save !== 'object') return null;
  if (save.schema !== SCHEMA) {
    // Old saves map through explicitly: cash and missions carry over, the rest resets.
    return { ...emptySave(), cash: save.cash ?? 2450, missionsDone: save.missionsDone ?? 0, savedAt: save.savedAt ?? Date.now() };
  }
  return save;
}

export function writeSave(slot, save) {
  const saves = readSaves();
  saves[slot] = { ...save, schema: SCHEMA, savedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false;
  }
}

export function saveSlotLabel(save) {
  if (!save) return 'EMPTY SLOT';
  const d = new Date(save.savedAt);
  return `$${save.cash.toLocaleString('en-US')} · ${save.missionsDone}/8 missions · ${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

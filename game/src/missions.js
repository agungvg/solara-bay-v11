// Story missions: 8 jobs with staged objectives, win/lose conditions, rewards
// and dialogue. Each stage names its objective, its target and what completes
// it; the mission runner advances stages and pays out on completion.
export const MISSIONS = [
  {
    id: 1, name: 'FIRST LIGHT', kind: 'TUTORIAL', cash: 2450,
    briefing: 'Mira: the Rukan Pelo GT is parked on Strand Blvd. Take it and bring it to the safehouse.',
    stages: [
      { label: 'STEAL THE RUKAN PELO GT', objective: 'reachCar', target: 'heroCar' },
      { label: 'DRIVE TO THE SAFEHOUSE', objective: 'reachMarker', target: 'safehouse' },
      { label: 'LOSE THE TAIL', objective: 'loseWanted', target: 'wanted0' },
    ],
    fail: 'Busted by the KPD or the car is wrecked.',
  },
  {
    id: 2, name: 'LANTERN MARKET RUN', kind: 'ON FOOT', cash: 7270,
    briefing: 'Kiki: the courier is moving through the market. Drop his guards, take the package, walk out clean.',
    stages: [
      { label: 'FIND THE COURIER IN THE MARKET', objective: 'reachMarker', target: 'courier' },
      { label: 'TAKE DOWN THE GUARDS', objective: 'downEnemies', target: 'guards', count: 2 },
      { label: 'GRAB THE PACKAGE', objective: 'reachMarker', target: 'package' },
      { label: 'SLIP OUT OF THE MARKET', objective: 'reachMarker', target: 'exit' },
    ],
    fail: 'The courier escapes or you go down in the aisle.',
  },
  {
    id: 3, name: 'GOLDEN HOUR', kind: 'CHASE', cash: 12860,
    briefing: 'Marco: the boat sails in two minutes. Shake the manhunt and get to the pier!',
    stages: [
      { label: 'BREAK LINE OF SIGHT', objective: 'breakSight', target: 'heli' },
      { label: 'OUTRUN THE ROADBLOCK', objective: 'reachMarker', target: 'bridge' },
      { label: 'REACH THE BOAT AT THE PIER', objective: 'reachMarker', target: 'pier' },
    ],
    fail: 'The boat sails without you — or the KPD boxes you in.',
  },
  {
    id: 4, name: 'MARINA LIGHTS', kind: 'HEIST', cash: 9400,
    briefing: 'Lio: the yacht owner keeps the safe key on the pier. Lift it after dark and be gone before the patrol turns.',
    stages: [
      { label: 'REACH THE PIER UNSEEN', objective: 'reachMarker', target: 'pier' },
      { label: 'LIFT THE SAFE KEY', objective: 'reachMarker', target: 'yacht' },
      { label: 'VANISH INTO THE MARINA', objective: 'loseWanted', target: 'wanted0' },
    ],
    fail: 'Spotted by the marina patrol.',
  },
  {
    id: 5, name: 'SWAP PLATES', kind: 'EVASION', cash: 6100,
    briefing: 'Mira: three stars and a hot plate. Lose the tail, swap the plates at Lio\'s garage, drive out clean.',
    stages: [
      { label: 'LOSE THE TAIL', objective: 'loseWanted', target: 'wanted0' },
      { label: 'SWAP PLATES AT LIO\'S', objective: 'reachMarker', target: 'garage' },
      { label: 'DRIVE OUT CLEAN', objective: 'reachMarker', target: 'safehouse' },
    ],
    fail: 'Busted with the hot plates still on.',
  },
  {
    id: 6, name: "ORU'S FALL", kind: 'WRECK THE REGENT', cash: 18450,
    briefing: 'Mira: Oru\'s Regent is making for Kumala Pier. Ram it before it reaches the water!',
    stages: [
      { label: 'TAIL THE REGENT', objective: 'reachCar', target: 'regent' },
      { label: 'CATCH THE REGENT', objective: 'reachMarker', target: 'pier' },
      { label: 'WRECK THE REGENT', objective: 'ramTarget', target: 'regent', count: 3 },
      { label: 'VANISH', objective: 'loseWanted', target: 'wanted0' },
    ],
    fail: 'The Regent reaches the pier and Oru slips away.',
  },
  {
    id: 7, name: 'NEON RAIN', kind: 'NIGHT CHASE', cash: 11200,
    briefing: 'Kiki: the rain is our cover. Run the shipment across the bridge while the KPD is blind in the downpour.',
    stages: [
      { label: 'PICK UP THE SHIPMENT', objective: 'reachMarker', target: 'docks' },
      { label: 'CROSS THE BRIDGE IN THE RAIN', objective: 'reachMarker', target: 'bridge' },
      { label: 'DELIVER TO THE ROOFTOP', objective: 'reachMarker', target: 'rooftop' },
    ],
    fail: 'The shipment is seized at the bridge checkpoint.',
  },
  {
    id: 8, name: 'SOLARA HEIST', kind: 'FINALE', cash: 52000,
    briefing: 'Mira: the vault under the Solara tower. One crew, one night, one way out — the beach.',
    stages: [
      { label: 'BREACH THE VAULT', objective: 'reachMarker', target: 'vault' },
      { label: 'GRAB THE SCORE', objective: 'downEnemies', target: 'vaultGuards', count: 3 },
      { label: 'ESCAPE TO THE BEACH', objective: 'reachMarker', target: 'beach' },
      { label: 'SAIL OUT ON THE YACHT', objective: 'reachMarker', target: 'yacht' },
    ],
    fail: 'The vault seals with the crew inside.',
  },
];

export const MISSION_RATINGS = ['G', 'S', 'G', 'B', 'S', '—', '—', '—'];

export class MissionRunner {
  constructor(state) {
    this.state = state;
    this.missionIndex = 0;
    this.stageIndex = 0;
    this.stageProgress = 0;
    this.status = 'idle'; // idle | active | complete | failed
    this.timer = 0;
  }

  get mission() { return MISSIONS[this.missionIndex]; }
  get stage() { return this.mission.stages[this.stageIndex]; }

  start(index = 0) {
    this.missionIndex = index;
    this.stageIndex = 0;
    this.stageProgress = 0;
    this.status = 'active';
    this.timer = 0;
    return this.mission;
  }

  // Advance a stage when its objective is met; returns the event name or null.
  completeStage() {
    this.stageIndex += 1;
    this.stageProgress = 0;
    if (this.stageIndex >= this.mission.stages.length) {
      this.status = 'complete';
      this.state.cash += this.mission.cash;
      this.state.rp += 400;
      return 'missionComplete';
    }
    return 'stageComplete';
  }

  fail(reason) {
    this.status = 'failed';
    this.state.failReason = reason;
    return 'missionFailed';
  }

  update(dt) {
    if (this.status === 'active') this.timer += dt;
  }
}

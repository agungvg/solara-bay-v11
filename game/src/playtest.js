// Playtest: mission 1 end-to-end by autopilot, run at a fixed 60 Hz step with
// no rendering in between. The pilot steers the hero car toward the current
// stage's waypoint, rams nothing it should not, and reports every stage
// transition, so a pass means the mission is really completable.
export function runPlaytest(game) {
  const log = [];
  const errors = [];
  const push = (line) => log.push(line);
  try {
    game.startLive(true); // skip the start screen, mission 1, already driving
    const sim = game.sim;
    const dt = 1 / 60;
    let steps = 0;
    const maxSteps = 60 * 120;
    let lastStage = -1;
    while (steps < maxSteps) {
      const stage = game.missions.stage;
      if (!stage) break;
      // Autopilot: steer toward the active waypoint, full throttle, brake near it.
      // On a lose-the-tail stage, flee: aim 80 m away from the nearest police
      // unit, re-aimed every step so the car keeps opening the gap.
      let wp = game.markerPosition();
      if (stage.objective === 'loseWanted') {
        const px = game.state.player.x, pz = game.state.player.z;
        let nx = px, nz = pz, best = Infinity;
        for (const b of game.state.policeBlips ?? []) {
          const d = Math.hypot(px - b.x, pz - b.z);
          if (d < best) { best = d; nx = b.x; nz = b.z; }
        }
        const dx = px - nx, dz = pz - nz, len = Math.hypot(dx, dz) || 1;
        wp = { x: px + (dx / len) * 80, z: pz + (dz / len) * 80 };
      }
      const dx = wp.x - sim.car.x;
      const dz = wp.z - sim.car.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(-dx, -dz); // forward is -Z at heading 0
      let dh = wantHeading - sim.car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, dh * 1.6));
      const throttle = dist > 6 ? 1 : 0.35;
      game.stepSim(dt, { throttle, steer, brake: false, sprint: false });
      if (game.missions.stageIndex !== lastStage) {
        lastStage = game.missions.stageIndex;
        push(`stage ${lastStage} reached at t=${(steps * dt).toFixed(1)}s`);
      }
      // A completed mission auto-starts the next one, so the pass signal is
      // the mission index advancing past 0, not a status that stays 'complete'.
      if (game.missions.missionIndex > 0) {
        push(`MISSION COMPLETE at t=${(steps * dt).toFixed(1)}s, cash $${game.state.cash.toLocaleString('en-US')}`);
        break;
      }
      if (game.missions.status === 'failed') {
        errors.push(`mission failed: ${game.state.failReason}`);
        break;
      }
      steps += 1;
    }
    if (game.missions.missionIndex === 0) errors.push('mission did not complete within 120s');
    if (steps >= maxSteps) errors.push('step budget exhausted');
  } catch (err) {
    errors.push(`exception: ${err.message}`);
  }
  const passed = errors.length === 0 && game.missions.missionIndex > 0;
  return {
    passed,
    mission: game.missions.mission.name,
    stages: game.missions.stageIndex,
    totalStages: game.missions.mission.stages.length,
    cash: game.state.cash,
    errors,
    log,
  };
}

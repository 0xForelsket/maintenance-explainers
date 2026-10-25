const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Hot Runner',
  sub: 'Heated sprue, manifold, nozzles and gates',
  fov: 36, t0: 21.2, t1: 205.0, loopFrom: 21.2, startT: 30.0, startView: 'manifold', cutRange: [2.2, 0],
  text: {
    overview: ['Overview', 'A hot runner keeps the plastic molten all the way to the part, so there is no runner to cut off or regrind.', 'How it works'],
    manifold: ['Sprue & manifold', 'The machine nozzle feeds a heated sprue and then the manifold: a heated steel block with drilled channels that split the melt evenly to every cavity.', 'How it works'],
    zones: ['Zones & control', 'Every heater has its own thermocouple. Each pair is a zone, and the controller holds every zone at its set point.', 'How it works'],
    gates: ['Nozzle tips & gates', 'The nozzle keeps the melt hot while the steel around the gate is cooled. Thermal gates freeze off between shots; valve gates close with a pin driven by air or oil.', 'How it works'],
    seal: ['The thermal seal', 'The manifold floats in an air gap. As it heats it grows and presses on the nozzles: cold there is a gap, hot it seals. Nozzles need about 15 minutes beyond temperature to grow fully; a manifold about half an hour plus soak.', 'How it works'],
    leak: ['Leaks', 'Inject before the system has soaked and melt is forced out between manifold and nozzle. It wraps the wiring and the mould comes out for a strip-down.', 'What goes wrong'],
    heaters: ['Heaters & thermocouples', 'Damp heaters short at full power. A thermocouple out of its pocket reads low and the zone overheats. Swapped zone wiring heats the wrong nozzle.', 'What goes wrong'],
    gatefaults: ['Gate faults', 'Too hot: drool and strings. Too cold: a frozen gate and a short cavity. Worn valve pins collect deposits and stop shutting cleanly.', 'What goes wrong'],
    fix: ['The fix', 'Manifold first, then nozzles, and a full soak. Soft start damp heaters. Keep plates within a few degrees. Log heater resistance and thermocouple readings, label every zone, and inspect gates and valve pins on a cycle count.', 'The fix'],
  },
  views: {
    overview: [[0.5, 1.0, 12.8], [0, 0.1, 0]],
    manifold: [[0.7, 2.3, 6.4], [-0.6, 1.7, 0]],
    zones: [[1.5, 1.6, 9.4], [0.5, 1.2, 0]],
    gates: [[3.6, 1.6, 5.4], [2.2, 1.2, 0]],
    seal: [[-1.2, 1.6, 2.6], [-2.15, 1.4, 0]],
    leak: [[-1.0, 1.9, 3.1], [-2.15, 1.25, -0.2]],
    heaters: [[-1.1, 0.9, 2.8], [-2.2, 0.7, 0]],
    gatefaults: [[3.2, 0.45, 3.1], [2.2, -0.15, 0]],
    fix: [[0.4, 1.6, 11.0], [0, 1.1, 0]],
  },
  sceneOpts: (t) => ({ thermal: (t > 52.5 && t < 61) || (t > 71 && t < 101) || (t > 173 && t < 180) ? 1 : 0 }),
  readouts: (st) => ({
    items: [
      { k: 'Manifold', v: Math.round(30 + 205 * st.manHeat), unit: '°C', color: col(1 - st.manHeat, 0.1, 0.5) },
      { k: 'Nozzles', v: Math.round(30 + 205 * st.nozHeat), unit: '°C', color: col(1 - st.nozHeat, 0.1, 0.5) },
      { k: 'Seal', v: st.expand > 0.95 ? 'sealed' : 'gap open', unit: '', color: st.expand > 0.95 ? 'var(--ok)' : 'var(--warn)' },
    ],
    bar: { k: 'Thermal growth', v: st.expand, text: `${Math.round(st.expand * 100)}%`, color: col(1 - st.expand, 0.05, 0.5) },
  }),
  labels: [
    ['SPRUE', 'sprue'], ['MANIFOLD', 'manifold'], ['NOZZLE', 'nozzleL'], ['VALVE PIN', 'pin'], ['GATE', 'gateL'], ['AIR GAP', 'airGap'], ['THERMOCOUPLE', 'tcMan'], ['JUNCTION BOX', 'jbox'],
  ],
};

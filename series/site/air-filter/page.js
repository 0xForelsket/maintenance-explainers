const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Air Filter & Drain',
  sub: 'Compressed air · particulate filter · float drain',
  fov: 38, t0: 5.8, t1: 72.4, loopFrom: 8.4, startT: 22.6, startView: 'element', cutRange: [3.2, 0],
  text: {
    overview: ['Overview', 'Every machine on the compressed air line sits behind a filter like this one: a head with in and out ports, a clear bowl, a filter element and an automatic drain at the bottom.', 'How it works'],
    condense: ['Condensate', 'Squeezing air squeezes its moisture together. As the air cools in the pipes, water condenses out and travels along with oil and rust from the compressor and pipework.', 'How it works'],
    deflector: ['Deflector', 'Air enters the head and is turned by angled vanes so it spins down into the bowl. The swirl throws heavy droplets and particles out against the bowl wall.', 'How it works'],
    element: ['Element', 'The air then passes through the sintered element from outside to inside, which traps fine dirt, and leaves through the head as clean, dry air.', 'How it works'],
    drain: ['Baffle & float drain', 'Water runs down the wall and collects below the baffle, a quiet zone where the swirl cannot pick it back up. When the level rises, the float lifts and the drain opens to dump it.', 'How it works'],
    stuck: ['Stuck drain', 'Rust and sludge can jam the float. The water level climbs past the baffle and the max line, and the airflow picks it up and carries it downstream to the tools.', 'What goes wrong'],
    clog: ['Clogged element', 'Dirt builds up in the element until it blocks the flow. The pressure drop across the filter rises, so the tools downstream get less pressure than the compressor makes.', 'What goes wrong'],
    fix: ['The fix', 'Check the bowl every day and press the drain test button. Clean or replace a stuck drain. Change the element when the ΔP indicator says so, and always release pressure before opening the bowl.', 'The fix'],
  },
  views: {
    overview: [[6.0, 1.6, 12.5], [0.4, 0.6, 0]],
    condense: [[-3.6, 3.6, 6.0], [-3.2, 2.4, 0]],
    deflector: [[1.8, 3.0, 6.0], [0.0, 1.6, -0.3]],
    element: [[2.2, 0.9, 7.4], [0.2, 0.3, -0.4]],
    drain: [[1.6, -1.2, 5.2], [0.1, -2.1, -0.2]],
    stuck: [[1.4, -1.4, 4.6], [0.0, -2.2, -0.1]],
    clog: [[2.4, 2.8, 10.0], [0.0, 1.6, 0]],
    fix: [[3.0, 0.6, 9.5], [0.0, 0.2, 0]],
  },
  readouts: (st) => ({
    items: [
      { k: 'In', v: st.pIn.toFixed(1), unit: 'bar', color: 'var(--ok)' },
      { k: 'Out', v: st.pOut.toFixed(1), unit: 'bar', color: col(-st.pOut, -6.6, -6.3) },
      { k: 'ΔP', v: st.dp.toFixed(2), unit: 'bar', color: col(st.dp, 0.35, 0.6) },
    ],
    bar: { k: 'Water in bowl', v: st.level, text: st.level > 0.62 ? 'over max' : st.level > 0.45 ? 'high' : 'ok', color: col(st.level, 0.45, 0.62) },
  }),
  labels: [
    ['AIR IN', 'inlet'], ['CLEAN AIR OUT', 'outlet'], ['DEFLECTOR', 'deflector'], ['ELEMENT', 'element'], ['BAFFLE', 'baffle'], ['FLOAT DRAIN', 'float'],
    ['TEST BUTTON', 'testBtn'], ['ΔP INDICATOR', 'dpGauge'], ['PRESSURE', 'pGauge'], ['SHUT-OFF', 'valve'], ['CYLINDER', 'cylinder'],
  ],
};

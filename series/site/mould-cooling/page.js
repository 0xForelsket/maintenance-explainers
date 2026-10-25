const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Mould Cooling Circuits',
  sub: 'Channels, flow and scale in an injection mould',
  fov: 38, t0: 10.4, t1: 79.5, loopFrom: 10.4, startT: 20.0, startView: 'channels', cutRange: [3.4, 0],
  text: {
    overview: ['Overview', 'Most of every moulding cycle is spent waiting for the part to cool. Water from a manifold with flow meters runs through circuits in each half of the mould.', 'How it works'],
    channels: ['Channels', 'Water channels are drilled through the mould plates close to the cavity. Hot plastic heats the steel and the water carries the heat away. Toggle the thermal view to see it.', 'How it works'],
    cores: ['Baffles & bubblers', 'Cores are hard to reach. A bubbler is a tube inside a drilled hole; a baffle is a blade that splits the hole. Both carry water up to the tip and back.', 'How it works'],
    flow: ['Turbulent flow', 'Fast, turbulent water (Reynolds number well above 4,000, ideally over 10,000) strips heat from the wall. Slow, smooth laminar flow barely touches it.', 'How it works'],
    meters: ['Flow & ΔT', 'Each circuit needs enough flow, and the water should come back only a few degrees warmer than it went in.', 'How it works'],
    scale: ['Scale', 'Over time scale coats the channels. A thin layer insulates the steel and the flow gets smaller and smaller.', 'What goes wrong'],
    block: ['Blocked & leaking', 'Rust and dirt block baffles completely and O-rings start to leak. The mould runs hot in spots, parts warp, sink marks appear and cycle time creeps up.', 'What goes wrong'],
    fix: ['The fix', 'Treat the water at the source. Measure and log the flow on every circuit. Descale (flush, neutralise, rinse, blow dry), pressure test for leaks, replace O-rings and label every in and out.', 'The fix'],
  },
  views: {
    overview: [[-1.6, 2.4, 18.0], [-2.6, 0.4, 0]],
    channels: [[0.0, 0.8, 9.6], [-0.5, 0.0, 0]],
    cores: [[40.9, 1.4, 7.6], [40.0, 0.4, 0]],
    flow: [[60.4, 0.3, 6.4], [60.0, 0.0, 0]],
    meters: [[-4.4, 1.7, 3.8], [-5.8, 1.35, -0.8]],
    scale: [[-0.4, 1.3, 6.0], [-0.5, 0.6, 0]],
    block: [[0.6, 0.4, 8.6], [-0.2, 0.0, 0]],
    fix: [[0.8, 0.6, 10.5], [-0.4, 0.0, 0]],
  },
  sceneOpts: (t) => ({ thermal: (t > 18.3 && t < 22.5) || (t > 48 && t < 50.5) ? 1 : 0 }),
  readouts: (st) => ({
    items: [
      { k: 'Circuit A', v: st.flowA.toFixed(1), unit: 'L/min', color: col(12 - st.flowA, 2, 5) },
      { k: 'Circuit B', v: st.flowB.toFixed(1), unit: 'L/min', color: col(12 - st.flowB, 2, 5) },
      { k: 'B ΔT', v: (st.outB - st.tin).toFixed(1), unit: '°C', color: col(st.outB - st.tin, 3.5, 5) },
    ],
    bar: { k: 'Cycle time', v: (st.cycleTime - 26) / 8, text: `${st.cycleTime.toFixed(1)} s`, color: col(st.cycleTime, 28.6, 30.5) },
  }),
  labels: [
    ['CHANNELS', 'A1'], ['CAVITY', 'cavity'], ['FLOW METERS', 'manifold'], ['BUBBLER', 'bubbler'], ['BAFFLE', 'baffle'], ['TURBULENT', 'turb'], ['LAMINAR', 'lam'], ['O-RING', 'oring'],
  ],
};

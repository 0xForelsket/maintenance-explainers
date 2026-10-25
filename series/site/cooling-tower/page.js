const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Cooling Tower',
  sub: 'Open · induced draft · counterflow',
  fov: 38, t0: 4.8, t1: 68.0, loopFrom: 9.0, startT: 10.6, startView: 'spray', cutRange: [3.5, 0],
  text: {
    overview: ['Overview', 'Hot water from the moulds is cooled here and sent back. The fan on top pulls air in through the louvres at the bottom and out through the stack.', 'How it works'],
    spray: ['Spray & fill', 'Hot water is pumped to the top and sprayed over the fill: stacks of thin corrugated PVC sheets that spread it into a thin film with a huge surface.', 'How it works'],
    air: ['Airflow', 'The fan pulls air in through the louvres and up through the fill, against the falling water. Drift eliminators stop droplets escaping with the air.', 'How it works'],
    evap: ['Evaporation', 'A small part of the water evaporates into the air. Evaporation carries most of the heat away, so the water reaching the basin is several degrees cooler.', 'How it works'],
    minerals: ['Minerals build up', 'Evaporation only removes pure water. The dissolved minerals stay behind, so with every pass the water gets more concentrated. Conductivity tracks how far.', 'What goes wrong'],
    dirt: ['Dust & algae', 'An open tower scrubs dust out of the air like a washer, and warm water in sunlight grows algae on the louvres, fill and basin.', 'What goes wrong'],
    scale: ['Scale in the moulds', 'Minerals come out as scale on the hottest surfaces: the mould cooling channels. Scale insulates, so the mould runs hotter and cycle time creeps up.', 'What goes wrong'],
    fix: ['The fix', 'Bleed off a little water and top up with fresh to hold conductivity down. Treat for scale, corrosion and algae. Filter and clean on schedule, and descale the mould channels.', 'The fix'],
  },
  views: {
    overview: [[12, -4, 22], [0, 0, 0]],
    spray: [[1.6, 1.0, 6.0], [-0.3, 0.0, -0.6]],
    air: [[-0.8, -1.0, 17], [-0.3, -0.6, 0]],
    evap: [[0.9, -0.4, 4.2], [0.0, -0.9, -0.2]],
    minerals: [[0.8, -4.2, 4.0], [0.3, -5.3, -0.8]],
    dirt: [[-6.2, -3.4, 6.4], [-2.8, -4.5, -0.7]],
    scale: [[-12.4, -3.4, 9.6], [-13.5, -4.4, 0]],
    fix: [[-1.0, -3.2, 15], [-1.5, -4.6, -0.8]],
  },
  readouts: (st) => ({
    items: [
      { k: 'Conductivity', v: Math.round(st.cond), unit: 'µS/cm', color: col(st.cond, 1300, 1800) },
      { k: 'Mould', v: st.mouldTemp.toFixed(0), unit: '°C', color: col(st.mouldTemp, 49, 55) },
      { k: 'Cycle time', v: st.cycleTime.toFixed(1), unit: 's', color: col(st.cycleTime, 18.8, 20.4) },
    ],
    bar: { k: 'Cycles of concentration', v: st.cycles / 10, text: `${st.cycles.toFixed(1)}×`, color: col(st.cycles, 5.2, 7.2) },
  }),
  labels: [
    ['HOT WATER IN', 'riser'], ['SPRAY NOZZLES', 'nozzle'], ['FILL', 'fill'], ['DRIFT ELIMINATORS', 'elim'], ['FAN', 'fan'], ['AIR IN', 'louver'],
    ['BASIN', 'basin'], ['PUMP', 'pump'], ['MOULD', 'part'], ['BLEED-OFF', 'bleed'], ['MAKE-UP', 'makeup'], ['DOSING', 'dosing'],
    ['SIDE-STREAM FILTER', 'filter'], ['CONDUCTIVITY', 'controller'],
  ],
};

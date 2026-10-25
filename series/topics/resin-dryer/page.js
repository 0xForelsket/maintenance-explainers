const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Desiccant Resin Dryer',
  sub: 'Drying hopper, dry-air loop and twin desiccant beds',
  fov: 38, t0: 10.4, t1: 79.5, loopFrom: 10.4, startT: 29.0, startView: 'towers', cutRange: [3.0, 0],
  text: {
    overview: ['Overview', 'Plastics like PC, nylon and PET soak up water from the air. Wet pellets make bad parts, so a dryer blows hot, very dry air through them before they reach the machine.', 'How it works'],
    hopper: ['Drying hopper', 'Pellets sit in an insulated hopper on the feed throat. Hot dry air comes down the centre tube, spreads out under the diffuser cone and rises through the pellets, pulling the moisture out over a few hours.', 'How it works'],
    loop: ['Return air', 'The wet air leaves the top of the hopper and goes back to the dryer: through a filter, a cooler and the blower, then into a desiccant bed.', 'How it works'],
    towers: ['Desiccant towers', 'Two beds take turns. One adsorbs the water and dries the air; the other is heated by the regeneration heater to drive its water out. The result is air with a dew point around −40 °C.', 'How it works'],
    filters: ['Clogged filters', 'Dust clogs the return filter. Airflow drops, the pellets get less air and drying slows down.', 'What goes wrong'],
    saturated: ['Saturated desiccant', 'If a heater or a valve fails, the bed never regenerates. The desiccant stays saturated and the dew point climbs.', 'What goes wrong'],
    leaks: ['Leaks & low level', 'A leaky hose or joint on the return side sucks in wet room air. A low hopper means the pellets pass through too fast to dry. Wet resin gives splay, bubbles and brittle parts.', 'What goes wrong'],
    fix: ['The fix', 'Clean the filters every week. Watch the dew point. Set the temperature and drying time from the resin datasheet. Keep the hopper full and the hoses tight, and replace the desiccant on schedule.', 'The fix'],
  },
  views: {
    overview: [[-1.2, 2.6, 20.0], [-2.5, 1.2, 0]],
    hopper: [[1.8, 2.8, 8.0], [-0.1, 2.3, 0]],
    loop: [[-1.4, 2.0, 12.0], [-2.6, 1.0, 0]],
    towers: [[-4.0, 0.1, 6.8], [-5.15, -0.6, 0]],
    filters: [[-3.0, 0.9, 3.4], [-3.8, 0.1, 0]],
    saturated: [[-4.2, -0.5, 6.0], [-5.2, -0.9, 0]],
    leaks: [[1.2, 3.2, 12.5], [-1.6, 2.2, 0]],
    fix: [[0.0, 2.8, 17.5], [-2.6, 1.0, 0]],
  },
  sceneOpts: () => ({}),
  readouts: (st) => ({
    items: [
      { k: 'Dew point', v: Math.round(st.dew), unit: '°C', color: col(st.dew, -34, -25) },
      { k: 'Airflow', v: Math.round(st.airflow * 100), unit: '%', color: col(1 - st.airflow, 0.15, 0.35) },
      { k: 'Return air', v: Math.round(st.returnAir), unit: '°C', color: col(Math.abs(st.returnAir - 58), 5, 15) },
    ],
    bar: { k: 'Desiccant saturation', v: st.saturation, text: `${Math.round(st.saturation * 100)}%`, color: col(st.saturation, 0.3, 0.7) },
  }),
  labels: [
    ['HOPPER', 'hopper'], ['PELLETS', 'pellets'], ['DIFFUSER', 'diffuser'], ['FILTER', 'filter'], ['COOLER', 'cooler'], ['BLOWER', 'blower'],
    ['TOWER A', 'towerA'], ['TOWER B', 'towerB'], ['PROCESS HEATER', 'heater'], ['REGEN HEATER', 'regenHeater'], ['DEW POINT', 'display'], ['SUPPLY', 'supplyHose'], ['RETURN', 'returnHose'],
  ],
};

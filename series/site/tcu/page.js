const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Mould Temperature Controller',
  sub: 'TCU · water unit with direct cooling',
  fov: 38, t0: 10.2, t1: 84.5, loopFrom: 10.2, startT: 27.0, startView: 'control', cutRange: [3.4, 0],
  text: {
    overview: ['Overview', 'The mould temperature controller sits beside the machine and pumps water around a closed loop through the mould, holding the steel at a set temperature.', 'How it works'],
    inside: ['Inside the unit', 'A pump, a heater and a cooling valve in one box. Supply and return hoses connect it to the mould; a second pair connects it to cooling water from the tower.', 'How it works'],
    loop: ['Water loop', 'The pump drives water out to the mould and through its channels. It picks up heat from the hot plastic and carries it back to the unit.', 'How it works'],
    control: ['Heat & cool', 'A sensor measures the water temperature. Too cold, the heater switches on. Too hot, the cooling valve opens and tower water carries the heat away. The controller balances the two.', 'How it works'],
    scale: ['Scale & burn-out', 'Hard water leaves scale on the heater element. Scale insulates it, so the element runs hotter and burns out.', 'What goes wrong'],
    valve: ['Stuck valve', 'Dirt jams the cooling valve. Stuck shut, the mould overheats. Stuck open, the unit cannot hold temperature.', 'What goes wrong'],
    leaks: ['Leaks', 'Pump seals wear and leak, and hoses and couplings crack from heat. Water under the unit is a warning sign.', 'What goes wrong'],
    fix: ['The fix', 'Use treated water and descale the unit and the mould circuits on a schedule. Clean the strainer, test the cooling valve, inspect hoses, test the over-temperature cut-out, and always cool down and depressurise before opening.', 'The fix'],
  },
  views: {
    overview: [[-2.6, 2.0, 20.0], [-3.8, -0.8, 0]],
    inside: [[-6.2, -1.8, 7.8], [-7.1, -2.9, 0]],
    loop: [[-1.5, 1.2, 12.0], [-1.8, 0.0, 0]],
    control: [[-6.4, -1.8, 5.2], [-7.4, -2.6, 0]],
    scale: [[-6.5, -2.3, 3.0], [-7.2, -2.7, 0]],
    valve: [[-0.4, 0.6, 9.5], [-0.5, 0.0, 0]],
    leaks: [[-5.0, -2.6, 7.0], [-6.9, -3.9, 0.8]],
    fix: [[-3.0, 1.5, 15.0], [-3.6, -1.0, 0]],
  },
  sceneOpts: (t) => ({ thermal: (t > 46.3 && t < 53.2) || (t > 16.3 && t < 24) ? 1 : 0 }),
  readouts: (st) => ({
    items: [
      { k: 'Water out', v: st.water.toFixed(1), unit: '°C', color: col(Math.abs(st.water - 60), 1.5, 4) },
      { k: 'Heater', v: st.burnt > 0.5 ? 'burnt out' : st.heater ? 'on' : 'off', unit: '', color: st.burnt > 0.5 ? 'var(--bad)' : 'var(--ok)' },
      { k: 'Cooling', v: st.valve ? 'open' : 'shut', unit: '', color: st.stuckShut + st.stuckOpen > 0.5 ? 'var(--bad)' : 'var(--ok)' },
    ],
    bar: { k: 'Scale', v: Math.max(st.heaterScale, st.mouldScale), text: `${Math.round(Math.max(st.heaterScale, st.mouldScale) * 100)}%`, color: col(Math.max(st.heaterScale, st.mouldScale), 0.3, 0.7) },
  }),
  labels: [
    ['PUMP', 'pump'], ['HEATER', 'heater'], ['COOLING VALVE', 'valve'], ['SENSOR', 'sensor'], ['STRAINER', 'strainer'], ['DISPLAY', 'display'],
    ['SUPPLY', 'supplyHose'], ['RETURN', 'returnHose'], ['TOWER WATER IN', 'towerIn'], ['MOULD PART', 'part'], ['COOLING CHANNELS', 'A1'],
  ],
};

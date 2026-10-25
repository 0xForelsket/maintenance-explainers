const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Heater Bands & Thermocouples',
  sub: 'Barrel temperature control on a moulding machine',
  fov: 38, t0: 9.3, t1: 73.0, loopFrom: 9.3, startT: 25.0, startView: 'control', cutRange: [3.2, 0],
  text: {
    overview: ['Overview', 'The barrel has to hold its temperature within a few degrees all shift long. Heater bands supply the heat and thermocouples measure it, zone by zone.', 'How it works'],
    zones: ['Zones', 'The barrel is split into heating zones from the feed throat to the nozzle, each with its own setpoint. Temperatures usually rise towards the nozzle.', 'How it works'],
    band: ['Heater band', 'A band is a resistance coil packed in mica insulation inside a steel sheath, clamped tight around the barrel so its heat flows straight into the steel.', 'How it works'],
    tc: ['Thermocouple', 'Two different metals joined at the tip. Heat the junction and it makes a tiny voltage that rises with temperature, a few hundredths of a millivolt per degree.', 'How it works'],
    control: ['Controller', 'The controller compares the thermocouple reading with the setpoint and switches the heaters on and off to hold it.', 'How it works'],
    shear: ['Screw heat', 'Most of the melting comes from the screw itself, shearing the plastic as it turns. The heaters keep each zone on target.', 'How it works'],
    burnout: ['Burn-out', 'Bands burn out. A loose band cannot pass its heat to the barrel, so it overheats and fails. Terminals work loose, arc, and cook the wiring.', 'What goes wrong'],
    tcout: ['Thermocouple backed out', 'If a thermocouple backs out of its well, it reads low. The controller keeps heating at 100% and the zone runs far too hot.', 'What goes wrong'],
    fix: ['The fix', 'Lock out and isolate the power first. Check each band’s resistance, or its current with a clamp meter. Keep bands tight and terminals clean, and make sure every thermocouple is fully seated.', 'The fix'],
  },
  views: {
    overview: [[6.5, 4.0, 15.0], [-1.5, 1.0, 0]],
    zones: [[0.0, 3.2, 13.5], [-1.0, 0.6, 0]],
    band: [[2.4, 1.0, 6.4], [0.65, 0.2, 0]],
    tc: [[2.0, 1.8, 3.6], [0.9, 1.1, 0]],
    control: [[2.6, 3.2, 8.6], [0.7, 2.4, -1.0]],
    shear: [[-1.6, 1.6, 7.0], [-1.6, 0.0, 0]],
    burnout: [[1.8, 2.6, 7.2], [-0.6, 0.8, 0]],
    tcout: [[5.0, 2.0, 4.6], [3.5, 1.0, 0]],
    fix: [[3.0, 3.0, 8.0], [-0.6, 0.8, -0.6]],
  },
  sceneOpts: (t) => ({ shear: t > 29.4 && t < 35.5 ? 1 : 0.4 }),
  readouts: (st) => ({
    items: [
      { k: 'Zone 4 reads', v: st.read4.toFixed(0), unit: '°C', color: Math.abs(st.read4 - 230) < 6 ? 'var(--ok)' : 'var(--bad)' },
      { k: 'Zone 4 actual', v: st.act4.toFixed(0), unit: '°C', color: col(st.act4, 240, 260) },
      { k: 'Output', v: Math.round(st.out[3] * 100), unit: '%', color: st.out[3] >= 0.99 ? 'var(--bad)' : 'var(--ok)' },
    ],
    bar: { k: 'Thermocouple junction', v: st.mv / 13, text: `${st.mv.toFixed(2)} mV`, color: 'var(--ok)' },
  }),
  labels: [
    ['FEED THROAT', 'feed'], ['NOZZLE', 'nozzle'], ['HEATER BAND', 'band3'], ['CLAMP', 'clamp3'], ['THERMOCOUPLE', 'tc3cap'], ['JUNCTION', 'tc3bead'],
    ['CONTROLLER', 'controller'], ['TERMINALS', 'terminal3'],
  ],
};

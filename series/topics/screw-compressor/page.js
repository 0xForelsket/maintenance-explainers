const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Screw Compressor',
  sub: 'Oil-injected rotary screw: air end, oil, separator, coolers',
  fov: 36, t0: 15.8, t1: 191.0, loopFrom: 15.8, startT: 33.0, startView: 'airend', cutRange: [2.0, 0], maxDist: 30,
  text: {
    airend: ['Air end & rotors', 'Two helical rotors mesh inside the air end: a male rotor with four lobes and a female rotor with six flutes. The motor drives the male rotor, which turns the female on a thin film of oil, with no metal contact.', 'How it works'],
    compression: ['Compression', 'Air comes in through the intake filter and inlet valve and is trapped in the pockets between the lobes. As the rotors turn, each pocket moves along and shrinks until it opens to the outlet at full pressure, typically 7 to 10 bar.', 'How it works'],
    oil: ['Oil injection', 'Squeezing air makes it hot; dry, it would leave at over 200 °C. Oil injected into the compression chamber seals the gaps between the rotors, lubricates the bearings and soaks up the heat, so air and oil leave at around 80 to 90 °C.', 'How it works'],
    separator: ['Separator tank', 'In the tank the mixture spins and most of the oil drops out. A fine coalescing element catches the remaining mist. The minimum pressure valve holds pressure in the tank so the oil keeps circulating, and the air moves on.', 'How it works'],
    oilcircuit: ['Oil circuit', 'The oil flows back through a cooler, a thermostatic valve and a filter to the air end. The thermostat bypasses the cooler until the oil is warm enough that water never condenses in it.', 'How it works'],
    aftercooler: ['Aftercooler & drains', 'The aftercooler cools the air, and the water that condenses out is caught in a moisture separator and drained away before the dryer and filters downstream.', 'How it works'],
    energy: ['Where the power goes', 'About 94 % of the input comes out as heat, most of it in the oil cooler. Every extra bar of pressure costs roughly 7 % more energy.', 'How it works'],
    wear: ['Filters, coolers & oil', 'A clogged intake filter starves the air end. Dirty coolers push the discharge temperature up until the machine trips. Old oil leaves varnish, and a tired separator lets oil carry over while its pressure drop rises.', 'What goes wrong'],
    leaks: ['Thermostat & leaks', 'A stuck thermostat lets the oil run cold and fill with water, or run hot and cook. Leaks in the air network, often a fifth or more of the output, keep the compressor running for air nobody uses.', 'What goes wrong'],
    fix: ['The fix', 'Check temperatures, pressures and drains every day. Change intake and oil filters on hours or pressure drop, oil and separator on schedule with oil analysis. Clean the coolers, ventilate the room, check the inlet valve and couplings, hunt leaks and set the pressure no higher than needed.', 'The fix'],
  },
  views: {
    airend: [[-0.6, -0.4, 4.6], [-1.45, -1.2, 0]],
    compression: [[-1.0, 0.6, 5.4], [-1.8, -0.4, 0]],
    oil: [[-0.4, -0.3, 4.4], [-1.25, -1.0, 0]],
    separator: [[2.2, 0.0, 5.0], [1.35, -0.4, 0]],
    oilcircuit: [[1.5, 0.4, 9.2], [1.45, -0.25, 0]],
    aftercooler: [[4.5, 0.4, 5.0], [4.0, -0.1, 0]],
    energy: [[0.6, 1.6, 15.0], [0.4, 0.1, 0]],
    wear: [[1.0, 0.8, 9.6], [0.8, -0.1, 0]],
    leaks: [[2.6, -0.7, 4.2], [1.9, -1.5, 0]],
    fix: [[0.5, 0.9, 14.0], [0.3, -0.1, 0]],
  },
  readouts: (st) => ({
    items: [
      { k: 'Pressure', v: st.running ? st.pressure.toFixed(1) : '—', unit: 'bar', color: 'var(--ok)' },
      { k: 'Discharge', v: Math.round(st.dischargeT), unit: '°C', color: st.dischargeT < 75 ? 'var(--warn)' : col(st.dischargeT, 92, 102) },
      { k: 'Separator ΔP', v: st.sepDP.toFixed(2), unit: 'bar', color: col(st.sepDP, 0.4, 0.65) },
    ],
    bar: { k: st.running ? (st.load > 0.5 ? 'Loaded · air delivered' : 'Unloaded') : 'Tripped', v: st.output, text: `${Math.round(st.output * 100)}%`, color: col(1 - st.output, 0.1, 0.5) },
  }),
  labels: [
    ['MOTOR', 'motor'], ['AIR END', 'airEnd'], ['INTAKE FILTER', 'intakeFilter'], ['INLET VALVE', 'inletValve'], ['SEPARATOR TANK', 'tank'], ['ELEMENT', 'element'],
    ['MIN. PRESSURE VALVE', 'mpv'], ['THERMOSTATIC VALVE', 'thermoValve'], ['OIL COOLER', 'oilCooler'], ['AFTERCOOLER', 'afterCooler'], ['OIL FILTER', 'oilFilter'], ['DRAIN', 'drain'],
  ],
};

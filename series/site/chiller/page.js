const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Water Chiller',
  sub: 'Air-cooled chiller: evaporator, compressor, condenser, expansion valve',
  fov: 36, t0: 15.4, t1: 195.5, loopFrom: 15.4, startT: 22.0, startView: 'overview', cutRange: [2.0, 0], maxDist: 30,
  text: {
    overview: ['Overview', 'A chiller does not make cold. It moves heat out of the process water and into the outside air, using a refrigerant that boils at a low temperature and runs round a closed loop with four main parts.', 'How it works'],
    evaporator: ['Evaporator', 'Warm water from the moulds flows on one side of a plate heat exchanger, cold low-pressure refrigerant on the other. The refrigerant boils, soaking up the heat. A common set point is 7 °C out, 12 °C back.', 'How it works'],
    compressor: ['Compressor', 'The scroll compressor draws in the refrigerant vapour and squeezes it, so it leaves much hotter than the outside air. That is what lets the heat flow out at the condenser.', 'How it works'],
    condenser: ['Condenser', 'Fans pull outside air through a finned coil. The hot vapour gives up its heat and condenses back into a liquid.', 'How it works'],
    expansion: ['Expansion valve', 'The valve drops the pressure of the liquid so it cools sharply, and meters just enough into the evaporator. Its sensing bulb on the suction line holds a few degrees of superheat, so only vapour returns to the compressor.', 'How it works'],
    gauges: ['Gauges', 'The low side shows the boiling temperature, the high side the condensing temperature. The gap between them is the work the compressor does, and every degree of condensing temperature adds a few percent to the power bill.', 'How it works'],
    fouling: ['Fouled coils & exchanger', 'Dust, fluff and plastic fines clog the condenser fins: less air, higher condensing temperature, more power, and in the end a high-pressure trip on the hottest afternoon. On the water side, scale opens up the approach.', 'What goes wrong'],
    leaks: ['Leaks & low flow', 'A slow refrigerant leak starves the evaporator: superheat rises, capacity falls and the compressor runs hot. Low water flow from a blocked strainer or a failing pump can freeze the evaporator and split it.', 'What goes wrong'],
    fix: ['The fix', 'Log pressures, temperatures and approach every shift. Clean the condenser coils on a schedule. Treat and filter the water and clean the strainers. Check fans, connections and oil. Leak test before any top-up, and test the flow switch and freeze protection.', 'The fix'],
  },
  views: {
    overview: [[0.8, 1.0, 12.6], [0, -0.1, 0]],
    evaporator: [[0.6, -0.8, 4.2], [-0.1, -1.25, 0]],
    compressor: [[-1.2, -0.8, 4.0], [-1.9, -1.35, 0]],
    condenser: [[1.9, 2.8, 6.8], [1.7, 1.1, 0]],
    expansion: [[1.6, -0.6, 3.4], [0.85, -1.05, 0]],
    gauges: [[-2.2, 1.2, 4.0], [-2.75, 0.8, 0.3]],
    fouling: [[1.9, 2.6, 6.8], [1.7, 1.2, 0]],
    leaks: [[2.6, -0.4, 4.4], [2.2, -1.0, 0]],
    fix: [[0.6, 0.9, 11.6], [0, -0.1, 0]],
  },
  readouts: (st) => ({
    items: [
      { k: 'Water out', v: st.waterOut.toFixed(1), unit: '°C', color: col(st.waterOut, 7.6, 9) },
      { k: 'Low side', v: st.evap.toFixed(0), unit: '°C', color: st.evap < 0 ? 'var(--bad)' : st.evap < 1.5 ? 'var(--warn)' : 'var(--ok)' },
      { k: 'High side', v: st.cond.toFixed(0), unit: '°C', color: col(st.cond, 48, 54) },
      { k: 'Superheat', v: st.superheat.toFixed(0), unit: 'K', color: col(st.superheat, 9, 13) },
    ],
    bar: { k: 'Capacity', v: st.capacity, text: `${Math.round(st.capacity * 100)}%`, color: col(1 - st.capacity, 0.15, 0.4) },
  }),
  labels: [
    ['COMPRESSOR', 'compressor'], ['CONDENSER COIL', 'coil'], ['FANS', 'fans'], ['EVAPORATOR', 'evaporator'], ['EXPANSION VALVE', 'txv'], ['SIGHT GLASS', 'sightGlass'],
    ['GAUGES', 'gLow'], ['STRAINER', 'strainer'], ['FLOW SWITCH', 'flowSwitch'], ['HP SWITCH', 'hpSwitch'],
  ],
};

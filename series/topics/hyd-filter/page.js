const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Hydraulic Oil Filter',
  sub: 'Return-line filter on a power unit',
  fov: 38, t0: 6.5, t1: 66.9, loopFrom: 12.6, startT: 21.2, startView: 'flow', cutRange: [3.0, 0],
  text: {
    overview: ['Overview', 'The clamp, injection unit and ejectors of a moulding machine are all driven by oil under pressure. A pump on the tank feeds the valves, and the oil comes back to the tank through the return line.', 'How it works'],
    return: ['Return line', 'Everything that comes back to the tank passes through the return filter first, so dirt picked up in the machine is caught before the pump can draw it in again.', 'How it works'],
    element: ['Pleated element', 'The element is fine filter media folded into deep pleats. Folding packs a huge area of media into a small cylinder, so it can hold a lot of dirt with little resistance.', 'How it works'],
    flow: ['Outside in', 'Oil flows from the outside of the element to the perforated core in the middle. Particles are trapped on the outer surface of the pleats, and clean oil drops out of the bottom into the tank.', 'How it works'],
    bypass: ['Bypass & indicator', 'On top sits a bypass valve held shut by a spring. An indicator on the cover shows the pressure drop across the element: how hard the oil has to push to get through.', 'How it works'],
    loading: ['Loading up', 'As the element fills with dirt, the pressure drop climbs week by week. The indicator moves from green towards red.', 'What goes wrong'],
    bypassing: ['In bypass', 'At the bypass setting the valve opens and dirty oil flows straight past the element into the tank. Those particles wear the pump and jam the close-fitting valve spools.', 'What goes wrong'],
    fix: ['The fix', 'Change the element when the indicator says so, not just by the calendar, and never keep running in the red. Use the right element, check the seals, and sample the oil to confirm it is clean.', 'The fix'],
  },
  views: {
    overview: [[2.0, 5.0, 20.0], [-1.6, 2.4, 0]],
    return: [[2.4, 2.2, 9.5], [-0.6, 0.2, 0]],
    element: [[1.6, 1.9, 4.6], [0.0, -1.5, 0.1]],
    flow: [[2.6, -0.4, 5.0], [0.2, -1.6, 0]],
    bypass: [[1.4, 0.9, 3.4], [0.0, -0.2, 0]],
    loading: [[2.8, 1.4, 8.2], [0.2, -0.3, 0]],
    bypassing: [[1.8, 0.2, 6.2], [-0.4, -1.4, 0]],
    fix: [[4.2, 3.6, 11.0], [0.4, 1.6, 0]],
  },
  readouts: (st) => ({
    items: [
      { k: 'ΔP', v: st.dp.toFixed(1), unit: 'bar', color: col(st.dp, 1.6, 2.5) },
      { k: 'Bypass', v: st.bypass > 0.5 ? 'open' : 'shut', unit: '', color: st.bypass > 0.5 ? 'var(--bad)' : 'var(--ok)' },
      { k: 'ISO 4406', v: st.bypass > 0.5 ? '21/19/16' : '16/14/11', unit: '', color: st.bypass > 0.5 ? 'var(--bad)' : 'var(--ok)' },
    ],
    bar: { k: 'Element load', v: st.load, text: `${Math.round(st.load * 100)}%`, color: col(st.load, 0.5, 0.8) },
  }),
  labels: [
    ['CLAMP', 'clamp'], ['INJECTION', 'injection'], ['EJECTORS', 'ejectors'], ['VALVES', 'manifold'], ['PUMP', 'pump'], ['TANK', 'tank'],
    ['RETURN LINE', 'returnLine'], ['ΔP INDICATOR', 'gauge'], ['PLEATED MEDIA', 'pleats'], ['CORE', 'core'], ['BYPASS VALVE', 'bypass'], ['SPRING', 'spring'],
  ],
};

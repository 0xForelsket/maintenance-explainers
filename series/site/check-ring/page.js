const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
export const PAGE = {
  name: 'Check Ring',
  sub: 'Non-return valve on an injection screw',
  fov: 36, t0: 6.9, t1: 66.9, loopFrom: 6.9, startT: 16.0, startView: 'open', cutRange: [3.2, 0], minDist: 1.2,
  text: {
    overview: ['Overview', 'The injection unit: a heated barrel with a screw inside. Pellets drop in from the hopper at the back, and melted plastic is pushed out of the nozzle into the mould.', 'How it works'],
    recovery: ['Recovery', 'The turning screw carries pellets forward and melts them. Melt builds up in front of the screw and pushes it back. This is recovery.', 'How it works'],
    open: ['Ring open', 'During recovery the check ring slides forward, off its seat. Melt flows through the gap between the ring and the seat, then out past the fluted tip.', 'How it works'],
    inject: ['Injection', 'To inject, the screw drives forward like a plunger. Melt pressure slams the ring back against its seat and seals it, so all the melt goes forward into the mould.', 'How it works'],
    cushion: ['Cushion', 'The melt left in front of the screw at the end of injection is the cushion. A steady cushion means every shot has the same amount of plastic.', 'How it works'],
    wear: ['Wear', 'Every shot the ring and seat rub and hammer against each other. They wear faster with glass-filled and abrasive materials.', 'What goes wrong'],
    leak: ['Backflow', 'A worn ring cannot seal. During injection melt leaks backwards past it, the screw travels further, the cushion drifts or bottoms out, and shots come out short or vary in weight.', 'What goes wrong'],
    test: ['Creep test', 'Log the cushion every shift. To test the ring, hold injection pressure on a full mould and watch the screw position. If the screw creeps forward, the ring is leaking.', 'The fix'],
    replace: ['Replace', 'Pull the screw, measure the ring and seat, and replace them as a set so the new ring seals on a matching face.', 'The fix'],
  },
  views: {
    overview: [[2.0, 5.5, 20.0], [-1.0, 0.4, 0]],
    recovery: [[-1.6, 2.6, 10.5], [-2.0, 0.0, 0]],
    open: [[2.4, 1.9, 5.0], [1.9, -0.1, -0.2]],
    inject: [[3.0, 2.6, 13.5], [3.4, 0.0, 0]],
    cushion: [[5.0, 1.2, 5.2], [4.6, 0.0, -0.2]],
    wear: [[2.8, 2.0, 5.8], [2.4, -0.1, -0.2]],
    leak: [[2.8, 2.3, 6.6], [2.4, -0.1, -0.2]],
    test: [[4.4, 3.0, 11.5], [4.6, 1.2, 0]],
    replace: [[6.0, 2.8, 12.5], [6.0, 0.4, 0]],
  },
  readouts: (st) => ({
    items: [
      { k: 'Screw', v: st.recovering ? 'turning' : st.injecting ? 'injecting' : 'still', unit: '', color: 'var(--ok)' },
      { k: 'Screw position', v: st.screwMm.toFixed(1), unit: 'mm', color: st.screwMm < 1.5 ? 'var(--bad)' : 'var(--ok)' },
      { k: 'Ring', v: st.ringOpen > 0.9 ? 'open' : st.ringOpen > 0.1 ? 'leaking' : 'sealed', unit: '', color: st.ringOpen > 0.9 ? 'var(--ok)' : st.ringOpen > 0.1 ? 'var(--bad)' : 'var(--ok)' },
    ],
    bar: { k: 'Ring + seat wear', v: st.wear, text: st.wear > 0.6 ? 'worn' : st.wear > 0.2 ? 'wearing' : 'good', color: col(st.wear, 0.2, 0.6) },
  }),
  labels: [
    ['CHECK RING', 'ring'], ['SEAT', 'seat'], ['TIP', 'tip'], ['SCREW', 'screw'], ['CUSHION', 'cushion'], ['NOZZLE', 'nozzle'], ['MOULD', 'mould'], ['HOPPER', 'hopper'],
  ],
};

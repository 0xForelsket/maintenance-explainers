const col = (v, a, b) => (v < a ? 'var(--ok)' : v < b ? 'var(--warn)' : 'var(--bad)');
const problem = (st) => (st.holes > 0.5 ? 'holes' : st.fade > 0.3 ? 'faded' : st.blur > 0.5 ? 'blurred' : st.haze > 0.5 ? 'haze + streaks' : st.fish > 0.5 ? "won't stick" : st.peelBad > 0.5 ? 'peels off' : st.print > 0.5 ? 'sharp' : '—');
export const PAGE = {
  name: 'Tampo Printing',
  sub: 'Pad printing: cliché, sealed ink cup and silicone pad',
  fov: 38, t0: 10.4, t1: 78.0, loopFrom: 10.4, startT: 24.3, startView: 'pickup', cutRange: [2.0, 0],
  text: {
    overview: ['Overview', 'Pad printing puts a layer of ink thinner than a hair onto curved or textured parts. The pad picks the image up from a flat plate and lays it onto the part.', 'How it works'],
    cliche: ['The cliché', 'The image is etched about 20–25 µm deep into a steel plate called the cliché. It reads the right way round, because the pad flips it twice.', 'How it works'],
    cup: ['Sealed ink cup', 'A sealed cup slides over the cliché. Its ceramic ring fills the etch with ink and wipes the rest of the plate clean. The solvent in the ink starts to evaporate and the ink turns tacky.', 'How it works'],
    pickup: ['Pick-up', 'The soft silicone pad presses onto the cliché and the tacky ink sticks to it, lifting the image out of the etch.', 'How it works'],
    print: ['Print', 'The pad moves over the part and presses again, wrapping the image around curves. The ink sticks to the part better than to the pad, so it lets go cleanly.', 'How it works'],
    defects: ['What goes wrong', 'Dust and lint on the pad leave holes. Ink too thick will not release; too thin, it blurs. A worn cup ring or cliché leaves streaks and haze, and oil or release agent on the part stops the ink from sticking.', 'What goes wrong'],
    warning: ['Warning signs', 'Faded or broken prints, blurry edges, smudges, and ink that peels off in a tape test.', 'Warning signs'],
    fix: ['The fix', 'Clean the pad with tape and replace it when worn or cut. Check ink viscosity every shift and keep the cup sealed. Inspect the cliché and cup ring, keep the fixture tight, keep parts clean and tape-test every batch.', 'The fix'],
  },
  views: {
    overview: [[0.2, 1.6, 23.0], [-0.9, 0.4, 0]],
    cliche: [[-1.5, 2.0, 3.6], [-2.3, -0.95, 0]],
    cup: [[-1.6, 1.0, 5.6], [-2.6, -0.95, 0]],
    pickup: [[-0.4, 0.4, 6.8], [-2.0, -0.4, 0]],
    print: [[1.2, 0.8, 9.0], [1.6, -0.4, 0]],
    defects: [[3.2, 0.75, 3.2], [2.4, -0.7, 0]],
    warning: [[3.2, 0.75, 3.2], [2.4, -0.7, 0]],
    fix: [[0.0, 1.4, 18.0], [-0.9, 0.2, 0]],
  },
  sceneOpts: () => ({ cut: 0 }),
  readouts: (st) => ({
    items: [
      { k: 'Pad', v: st.padY < -0.5 ? 'pressing' : st.padInk > 0.5 ? 'inked' : 'clean', unit: '', color: st.lint > 0.5 ? 'var(--bad)' : 'var(--ok)' },
      { k: 'Etch', v: st.etchInk > 0.5 ? (st.tacky > 0.5 ? 'tacky' : 'filled') : 'empty', unit: '', color: 'var(--ok)' },
      { k: 'Print', v: problem(st), unit: '', color: problem(st) === 'sharp' ? 'var(--ok)' : problem(st) === '—' ? 'var(--warn)' : 'var(--bad)' },
    ],
    bar: { k: 'Ink on pad', v: st.padInk, text: `${Math.round(st.padInk * 100)}%`, color: 'var(--ok)' },
  }),
  labels: [
    ['CLICHÉ', 'cliche'], ['INK CUP', 'cupNow'], ['SILICONE PAD', 'pad'], ['PART', 'part'], ['FIXTURE', 'fixture'], ['TAPE STATION', 'tapeStation'], ['VISCOSITY CUP', 'visc'],
  ],
};

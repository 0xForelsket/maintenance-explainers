# Maintenance explainers

Cinematic, vertical (1080×1920) 3D cutaway videos that explain how a piece of plant equipment works, and then what goes wrong with it, the warning signs, and the fix. Each topic also has an interactive 3D page that uses the same scene, so you can orbit the cutaway and step through the chapters.

Everything is procedural: geometry, materials, particles, narration timing, sound design and music are all generated from code. Nothing is hand-animated in a DCC tool.

| Topic | Length | Video structure |
|---|---|---|
| Y-strainer | 50 s | How it works |
| Cooling tower (open, induced draft) | 72 s | How it works → minerals, dust & algae, scale in mould channels → warning signs → the fix |
| Compressed air filter & float drain | 74 s | How it works → stuck drain, clogged element → warning signs → the fix |
| Injection screw check ring | 71 s | Recovery, sealing, cushion → wear & backflow → warning signs → creep test & replacement |
| Hydraulic return-line oil filter | 71 s | Pleated element, bypass & ΔP indicator → loading & bypass → warning signs → the fix |
| Heater bands & thermocouples | 77 s | Zones, bands, thermocouples, control → burn-out, loose bands, backed-out TC → warning signs → lockout-first fix |
| Hydraulic hose | 68 s | Layers, crimped fittings, flex & pulses → fatigue, rubbing, bends → weep/spray/burst → warning signs → safe replacement |

The rendered MP4s are attached to the [Releases](../../releases) page (they are too big for git).

> On-screen figures such as 210 bar, 44 Ω, 5.2 A and the ISO 4406 codes are typical example values for illustration. They are not specifications for any particular machine. Always follow the manufacturer's manual and your site's lockout/tagout procedure.

## How it works

```
script.json ──► voice.py ──► voice.wav + timeline.json (word timings)
                                   │
story.js  (pure function of t: what every part is doing)
scene.js  (three.js scene: geometry, materials, particles; update(t))
director.js (shots, camera keys, labels, HUD, checklist cards)
                                   │
shell/video.html ── headless Chromium (SwiftShader) ──► JPEG frames
sfx.py  (numpy/scipy synth: hits, ambience, music) ──► mix.wav
ffmpeg  frames + mix.wav ──► out/<topic>.mp4
shell/page.html + page.js ──► interactive page (site/<topic>/)
```

- **Rendering:** three.js r170 runs in Playwright Chromium with SwiftShader, with no GPU needed. The 3D renders at 0.75× internal resolution while the DOM overlay (captions, labels, HUD, cards) stays crisp at 1080×1920. There's a post chain of bloom, SMAA and a custom grade pass (vignette, grain, chromatic aberration, warning tint).
- **Section cuts:** a single clip plane plus back-face "cut caps" draw hatched section faces on any closed solid. The hydraulic filter element uses a stepped (quarter) cut through intersecting clip planes.
- **Geometry:** CSG via `three-bvh-csg` gives real internal passages (filter heads, valve bodies, thermocouple wells). The Y-strainer uses marching-cubes SDF meshes simplified with meshoptimizer.
- **Determinism:** every frame is a pure function of time, so the video and the interactive page share the same `story.js` and `scene.js`.
- **Narration:** [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) TTS (voice `am_michael`), robotised with ring modulation, a comb-filter resonance and light bit/sample-rate reduction. Word timings come from gap-aligned syllable weighting and drive the captions.
- **Audio:** sound design and music are synthesised in numpy/scipy, sidechain-ducked under the voice, and normalised to about −14 LUFS.

## Layout

```
web/, build/, audio/, site/   Y-strainer (first video, standalone pipeline)
series/
  shell/        video.html (render shell), page.html (interactive page), look.js (shared toolkit), injection.js (shared injection unit)
  topics/<t>/   script.json, timeline.json, story.js, scene.js, director.js, page.js, sfx.py
  audio/        voice.py (TTS + timings), synth.py (sound design library)
  build/        render.mjs (frames), queue.sh (render + encode queue), site.sh (assemble a page), sheet.sh (storyboard stills)
  site/<t>/     assembled interactive pages (static, load three.js from jsDelivr)
```

## Running it

Requirements: Node 20+, Python 3.11+, ffmpeg, and Playwright with Chromium.

```bash
npm install
npm install --no-save playwright && npx playwright install chromium
pip install -r requirements.txt

# Kokoro TTS model files -> models/
mkdir -p models && cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..

# serve the repo root (the shells load /series/... and /node_modules/...)
npm run serve &   # http://localhost:8765

cd series
python3 audio/voice.py topics/hyd-hose          # voice.wav + timeline.json
python3 topics/hyd-hose/sfx.py                  # mix.wav
build/sheet.sh hyd-hose test/hh 2,15,30,45,60   # quick storyboard stills
build/queue.sh 999999 hyd-hose:67.56            # render all frames + encode out/hyd-hose.mp4
build/site.sh hyd-hose "Hydraulic Hose Cutaway" # interactive page in site/hyd-hose/
```

To preview a topic live, open `http://localhost:8765/series/shell/video.html?topic=hyd-hose&scale=0.5`. You can call `renderFrame(t)` from the console.

## Credits

- [three.js](https://threejs.org), [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg), [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh), [meshoptimizer](https://github.com/zeux/meshoptimizer)
- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)
- Fonts: Inter, Space Grotesk, JetBrains Mono (via Fontsource); Archivo, Barlow, IBM Plex Mono (Google Fonts) on the interactive pages

## License

[MIT](LICENSE). Third-party libraries and the Kokoro model keep their own licenses.

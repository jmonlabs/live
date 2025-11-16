# JMON Live

**Real-time algorithmic music exploration for the JMON format**

A minimal web-based music playground that allows you to tweak musical parameters live while patterns loop continuously. Think of it as a hybrid between algorithmic composition and live electronic performance — like having Ableton macros for generative music.

---

## Philosophy

JMON Live embodies:

- **Simplicity** — No build tools, no frameworks. Just open `index.html` in a browser.
- **Immediacy** — Instant audio feedback as you adjust parameters.
- **Playfulness** — Designed for exploration and pleasure, not performance anxiety.
- **Human + Algorithm** — Your gestures (sliders) shape algorithmic structures (JMON patterns).
- **Openness** — All code is transparent, hackable, and extensible.

Inspired by ambient/experimental musicianship (Fripp, Jónsi), this tool is an instrument for discovery.

---

## Quick Start

### Option 1: Open Locally

1. Clone this repository
2. Open `index.html` in any modern web browser
3. Click **Start** and begin tweaking

### Option 2: Host Anywhere

Upload the files to any static web host (GitHub Pages, Netlify, Vercel, etc.)

**Requirements:** A modern browser with Web Audio API support (Chrome, Firefox, Safari, Edge)

---

## Features

### 🎹 Pattern Types

Choose from multiple algorithmic pattern generators:

- **Arpeggio** — Classic ascending/descending note sequences
- **Random Walk** — Stochastic melody generation with controllable drift
- **Euclidean** — Rhythmically distributed patterns using Bjorklund's algorithm
- **Pentatonic Flow** — Melodic patterns using pentatonic scales
- **Ambient Drift** — Sparse, sustained tones for atmospheric soundscapes

### 🎚️ Live Parameters

All parameters update in real-time while playing:

- **Density** (0–1) — How many steps trigger notes vs. rests
- **Pitch Shift** (±24 semitones) — Transpose the entire pattern
- **Duration Scale** (0.25–4×) — Speed up or slow down note lengths
- **Randomness** (0–1) — Add controlled chaos to pattern generation
- **Tempo** (40–200 BPM) — Overall playback speed
- **Pattern Length** (2–32 steps) — Number of steps per loop

### 🔊 Sound Design

- **Synth Types** — Simple, AM, FM, Pluck, Membrane
- **Reverb** — Adjustable ambience (0–100%)
- **Volume** — Master output level (-40 to 0 dB)

### 🎛️ Transport Controls

- **Start/Stop** — Begin/end playback
- **Mute** — Silence audio while keeping the loop running
- **Reroll** — Generate a completely new pattern with a new random seed

---

## Architecture

### Files

```
/index.html       — UI structure
/style.css        — Minimalistic dark theme
/script.js        — Main application logic
```

### How It Works

1. **Pattern Generation**
   `jmon-algo` generates musical patterns (pitch, duration, velocity) based on current parameters.

2. **Real-time Scheduling**
   `Tone.js` provides precise audio scheduling via `Tone.Transport` and `Tone.Loop`.

3. **Reactive UI**
   Slider changes immediately trigger pattern regeneration and parameter updates.

4. **Looping Behavior**
   The pattern loops continuously. When parameters change, the pattern updates at the next regeneration point.

### Dependencies

- **[Tone.js](https://tonejs.github.io/)** (v14.7) — Web Audio synthesis and scheduling
  Loaded via CDN: `https://cdn.skypack.dev/tone@14.7.77`

- **[jmon-algo](https://github.com/jmonlabs/jmon-algo)** — JMON pattern generation library
  Loaded via CDN: `https://esm.sh/jmon-algo@latest`

No build step required — ES modules are loaded directly in the browser.

---

## Usage Tips

### For Exploration

- Start with **Pentatonic** or **Ambient** patterns
- Set **Randomness** to 0.3–0.5 for controlled variation
- Experiment with **Duration Scale** to create polyrhythms
- Try **Euclidean** patterns with varying density for rhythmic interest

### For Performance

- Use **Reroll** to jump to completely different material
- Combine **Pitch Shift** changes with **Tempo** adjustments for dramatic shifts
- Switch **Synth Type** mid-performance for textural variation
- Use **Mute** to create tension/release moments

### For Composition

- Find interesting parameter combinations
- Export patterns (future feature) for use in your DAW
- Use as a sketching tool for larger JMON compositions

---

## Extending JMON Live

This is designed to be hackable. Ideas for expansion:

### Short-term
- [ ] Preset system (save/load parameter combinations)
- [ ] Export current pattern as JMON JSON
- [ ] Additional pattern types (fractals, cellular automata)
- [ ] MIDI output support
- [ ] Multiple simultaneous voices

### Long-term
- [ ] Scene system (cue multiple patterns)
- [ ] Parameter automation/LFOs
- [ ] Visual feedback (waveforms, pattern visualization)
- [ ] Collaborative multiplayer tweaking
- [ ] Integration with other JMON ecosystem tools

---

## JMON Ecosystem

**JMON Live** is part of the JMON Labs ecosystem:

- **[jmon-algo](https://github.com/jmonlabs/jmon-algo)** — Core algorithmic composition library
- **JMON Format** — JSON Music Object Notation specification
- **Future renderers** — Tools for converting JMON to various formats (MIDI, ABC, SuperCollider, etc.)

---

## Development

### Running Locally

No build process needed. Simply open `index.html` in a browser.

For development with live reload, you can use any static server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

### Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ Mobile browsers (works, but UI may be cramped)

---

## License

GPL-3.0 — See [LICENSE](LICENSE) file for details

---

## Credits

Created with ♥ by [JMON Labs](https://github.com/jmonlabs)

Built on:
- [Tone.js](https://tonejs.github.io/) by Yotam Mann
- [jmon-algo](https://github.com/jmonlabs/jmon-algo) — Algorithmic composition tools

---

## Contributing

Contributions welcome! This is a playground — feel free to:

- Add new pattern generators
- Improve the UI/UX
- Add features from the roadmap
- Fix bugs or improve performance
- Share your musical discoveries

---

**🎵 Happy exploring! 🎵**

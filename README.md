# JMON Live Player

A minimal, standalone web-based audio player for JMON patterns that runs continuously in an iframe and receives live pattern updates via `postMessage` without interrupting playback.

## 🎯 Overview

The JMON Live Player is designed to be embedded in Observable notebooks (or any web application) as an iframe. It uses Tone.js to create a persistent audio scheduler that plays JMON musical patterns continuously while seamlessly accepting pattern updates from the parent window.

**Key Features:**
- ✨ Persistent audio playback (no restarts on updates)
- 🔄 Live pattern updates via `postMessage`
- 🎵 Powered by Tone.js for precise audio scheduling
- 📦 Standalone HTML/JS (no build step required)
- 🎛 Minimal UI with real-time status display
- 🌐 Observable-ready iframe integration

## 📁 Project Structure

```
/
├── index.html      # Main HTML entry point
├── player.js       # Audio engine and postMessage handler
├── session.js      # Pattern session management
├── style.css       # Minimal UI styling
└── README.md       # This file
```

## 🚀 Quick Start

### 1. Serve the Files

Host these files on any static web server:
- GitHub Pages
- Netlify
- Vercel
- Local server (`python -m http.server 8000`)

### 2. Embed in Observable

```javascript
// Create the iframe player
viewof player = html`
  <iframe
    id="jmonPlayer"
    src="https://your-username.github.io/jmon-live-player/index.html"
    width="600"
    height="200"
    style="border: 2px solid #00ff00; border-radius: 8px;"
  ></iframe>
`
```

### 3. Send Pattern Updates

```javascript
// Define a JMON pattern
pattern = {
  tempo: 120,
  subdivision: 16,
  events: [
    { pitch: "C4", duration: 0.2, velocity: 0.7 },
    { pitch: "E4", duration: 0.2, velocity: 0.8 },
    { pitch: "G4", duration: 0.2, velocity: 0.6 },
    { pitch: "C5", duration: 0.4, velocity: 0.9 }
  ]
}

// Send pattern to player
function updatePattern(newPattern) {
  player.contentWindow.postMessage({
    type: "update",
    pattern: newPattern
  }, "*");
}

// Update the player
updatePattern(pattern);
```

## 📡 API Reference

### PostMessage Commands

The player listens for `postMessage` events with the following commands:

#### `update` - Update Pattern
```javascript
player.contentWindow.postMessage({
  type: "update",
  pattern: {
    tempo: 120,        // BPM (optional, default: 120)
    subdivision: 16,   // Subdivision (optional, default: 16)
    events: [          // Array of events (required)
      {
        pitch: "C4",       // Note name, MIDI number, or array for chords
        duration: 0.2,     // Duration in seconds
        velocity: 0.7      // Velocity (0-1)
      },
      // ... more events
    ]
  }
}, "*");
```

#### `start` - Start Playback
```javascript
player.contentWindow.postMessage({ type: "start" }, "*");
```

#### `stop` - Stop Playback
```javascript
player.contentWindow.postMessage({ type: "stop" }, "*");
```

#### `resume` - Resume Playback
```javascript
player.contentWindow.postMessage({ type: "resume" }, "*");
```

#### `reset` - Reset Position
```javascript
player.contentWindow.postMessage({ type: "reset" }, "*");
```

#### `setTempo` - Change Tempo
```javascript
player.contentWindow.postMessage({
  type: "setTempo",
  tempo: 140  // New BPM
}, "*");
```

## 🎵 Pattern Format

JMON patterns are simple JavaScript objects:

```javascript
{
  tempo: 120,           // Beats per minute (optional)
  subdivision: 16,      // Note subdivision (optional)
  events: [             // Array of musical events
    {
      pitch: "C4",      // Note (string, number, or array)
      duration: 0.2,    // Duration in seconds
      velocity: 0.7     // Velocity (0-1, optional)
    }
  ]
}
```

### Pitch Formats

The player supports multiple pitch formats:

```javascript
// Note names
{ pitch: "C4" }
{ pitch: "A#3" }

// MIDI numbers
{ pitch: 60 }  // C4
{ pitch: 69 }  // A4

// Chords (arrays)
{ pitch: ["C4", "E4", "G4"] }
{ pitch: [60, 64, 67] }
```

## 🔧 Architecture

### Persistent Audio Engine

The player creates a **persistent** Tone.js audio context and scheduler:

```javascript
// Initialize once
synth = new Tone.PolySynth().toDestination();
loop = new Tone.Loop((time) => {
  const event = session.next(time);
  playEvent(event, time);
}, "16n");

Tone.Transport.start();
loop.start(0);
```

### Session Management

The `Session` class manages pattern state without interrupting playback:

```javascript
class Session {
  setPattern(newPattern) {
    this.pattern = newPattern;  // Update pattern
    // Position can be preserved or reset
  }

  next(time) {
    // Return next event from pattern
    // Loop automatically when reaching the end
  }
}
```

### No Reloads, No Resets

When a new pattern arrives:
- ✅ Pattern is updated in memory
- ✅ Scheduler continues running
- ✅ Audio context stays alive
- ❌ No page reload
- ❌ No audio interruption

## 📝 Observable Example

Complete Observable notebook example:

```javascript
// Cell 1: Create the iframe
viewof player = html`
  <iframe
    id="jmonPlayer"
    src="https://your-username.github.io/jmon-live-player/index.html"
    width="600"
    height="200"
  ></iframe>
`

// Cell 2: Helper function
function updatePattern(pattern) {
  player.contentWindow.postMessage({
    type: "update",
    pattern
  }, "*");
}

// Cell 3: Define a pattern
pattern1 = ({
  tempo: 120,
  events: [
    { pitch: "C4", duration: 0.2, velocity: 0.7 },
    { pitch: "E4", duration: 0.2, velocity: 0.8 },
    { pitch: "G4", duration: 0.2, velocity: 0.6 },
    { pitch: "C5", duration: 0.4, velocity: 0.9 }
  ]
})

// Cell 4: Another pattern
pattern2 = ({
  tempo: 140,
  events: [
    { pitch: ["C4", "E4", "G4"], duration: 0.5, velocity: 0.8 },
    { pitch: ["D4", "F4", "A4"], duration: 0.5, velocity: 0.7 }
  ]
})

// Cell 5: Update buttons
viewof currentPattern = Inputs.radio(
  ["pattern1", "pattern2"],
  { label: "Select pattern:", value: "pattern1" }
)

// Cell 6: Auto-update on selection
{
  const selectedPattern = currentPattern === "pattern1" ? pattern1 : pattern2;
  updatePattern(selectedPattern);
}
```

## 🧪 Testing Locally

1. Start a local server:
   ```bash
   python -m http.server 8000
   ```

2. Open in browser:
   ```
   http://localhost:8000/index.html
   ```

3. Test with console:
   ```javascript
   // In browser console
   const testPattern = {
     events: [
       { pitch: "C4", duration: 0.2, velocity: 0.7 },
       { pitch: "E4", duration: 0.2, velocity: 0.8 }
     ]
   };

   window.postMessage({
     type: "update",
     pattern: testPattern
   }, "*");
   ```

## 🎨 Customization

### Change Synth Sound

Edit `player.js`:

```javascript
synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: 'sine'  // Try: sine, square, triangle, sawtooth
  },
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.4,
    release: 0.3
  }
}).toDestination();
```

### Modify UI

Edit `style.css` to change colors, fonts, layout, etc.

### Add Effects

```javascript
// Add reverb
const reverb = new Tone.Reverb({ decay: 2 }).toDestination();
synth.connect(reverb);

// Add delay
const delay = new Tone.FeedbackDelay("8n", 0.3).toDestination();
synth.connect(delay);
```

## 🐛 Troubleshooting

**No sound?**
- Click anywhere on the page to enable audio (browser autoplay policy)
- Check browser console for errors
- Verify Tone.js loaded correctly

**Pattern not updating?**
- Check console logs
- Verify pattern format
- Ensure iframe is fully loaded

**Audio stuttering?**
- Check CPU usage
- Reduce pattern complexity
- Increase buffer size in Tone.js

## 📚 Resources

- [Tone.js Documentation](https://tonejs.github.io/)
- [Observable Documentation](https://observablehq.com/@observablehq/documentation)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

## 📄 License

MIT License - Feel free to use and modify!

## 🙏 Credits

Built with:
- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [Observable](https://observablehq.com/) - Reactive notebooks
- JMON - Musical notation system

---

**Built for continuous, uninterrupted musical exploration** 🎵

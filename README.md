# JMON Live Player

A minimal, standalone web-based audio player for JMON patterns that runs continuously in an iframe and receives live pattern updates via `postMessage` without interrupting playback.

## 🎯 Overview

The JMON Live Player is designed to be embedded in interactive notebooks (Observable, Jupyter) or any web application as an iframe. It uses Tone.js to create a persistent audio scheduler that plays JMON musical patterns continuously while seamlessly accepting pattern updates from the parent window.

**Key Features:**
- ✨ Persistent audio playback (no restarts on updates)
- 🔄 Live pattern updates via `postMessage`
- 🎵 Powered by Tone.js for precise audio scheduling
- 📦 Standalone HTML/JS (no build step required)
- 🎛 Minimal UI with real-time status display
- 🌐 Ready for Observable and Jupyter notebook integration

## 📁 Project Structure

```
/
├── index.html      # Main HTML entry point
├── player.js       # Audio engine and postMessage handler
├── session.js      # Pattern session management
├── style.css       # Minimal UI styling
├── examples/       # JMON pattern examples
│   ├── simple-pattern.json
│   ├── chord-progression.json
│   └── multi-track.json
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
// Cell 1: Create the iframe player
viewof player = html`
  <iframe
    id="jmonPlayer"
    src="https://jmonlabs.github.io/live/index.html"
    width="600"
    height="200"
    style="border: 2px solid #00ff00; border-radius: 8px;"
  ></iframe>
`
```

```javascript
// Cell 2: Wait for player to be ready (IMPORTANT!)
ready = new Promise(resolve => {
  window.addEventListener("message", (event) => {
    if (event.data.type === "ready" && event.data.source === "jmon-player") {
      resolve("Player ready");
    }
  });
});

await ready;
```

### 3. Send Pattern Updates

```javascript
// Cell 3: Define a JMON pattern (proper JMON format)
testPattern = {
  format: "jmon",
  version: "1.0",
  tempo: 120,
  tracks: [
    {
      label: "melody",
      notes: [
        { pitch: 60, time: 0, duration: "4n", velocity: 0.7 },
        { pitch: 64, time: 1, duration: "4n", velocity: 0.8 },
        { pitch: 67, time: 2, duration: "4n", velocity: 0.6 },
        { pitch: 72, time: 3, duration: "2n", velocity: 0.9 }
      ]
    }
  ]
}
```

```javascript
// Cell 4: Send pattern to player
{
  player.contentWindow.postMessage({
    type: "update",
    pattern: testPattern
  }, "*");

  return "Pattern sent! Check player UI and browser console.";
}
```

## 📡 API Reference

### PostMessage Commands

The player listens for `postMessage` events with the following commands:

#### `update` - Update Pattern
```javascript
player.contentWindow.postMessage({
  type: "update",
  pattern: {
    format: "jmon",    // JMON format identifier
    version: "1.0",    // Schema version
    tempo: 120,        // BPM (required)
    tracks: [          // Array of tracks (required)
      {
        label: "melody",  // Track name
        notes: [          // Array of notes
          {
            pitch: "C4",      // Note name, MIDI number, or array for chords
            time: 0,          // Time in quarter notes
            duration: "4n",   // Duration in note values ("4n", "8n", "2n", etc.)
            velocity: 0.7     // Velocity (0-1, optional)
          },
          // ... more notes
        ]
      }
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

JMON follows the official [JMON format specification](https://github.com/jmonlabs/jmon-format):

```javascript
{
  format: "jmon",       // Format identifier (required)
  version: "1.0",       // Schema version (required)
  tempo: 120,           // Beats per minute (required)
  timeSignature: "4/4", // Time signature (optional, default: "4/4")
  tracks: [             // Array of tracks (required)
    {
      label: "melody",  // Track name (required)
      notes: [          // Array of note events (required)
        {
          pitch: "C4",      // Note name, MIDI number, or chord array (required)
          time: 0,          // Time in quarter notes (required)
          duration: "4n",   // Duration in note values (required)
          velocity: 0.7     // Velocity 0-1 (optional, default: 0.7)
        }
      ]
    }
  ]
}
```

**Note:** The player also supports a simplified legacy format with `events` array for backward compatibility.

### Time and Duration Formats

**Time** (when a note plays):
```javascript
time: 0        // Quarter notes (0 = start, 4 = bar 2 in 4/4)
time: 2.5      // Fractional quarter notes allowed
time: "1:2:0"  // Bars:beats:ticks (optional display format)
```

**Duration** (how long a note plays):
```javascript
duration: "4n"    // Quarter note
duration: "8n"    // Eighth note
duration: "2n"    // Half note
duration: "16n"   // Sixteenth note
duration: "8t"    // Eighth note triplet
duration: "1:0:0" // One bar (in bars:beats:ticks)
```

### Pitch Formats

The player supports multiple pitch formats:

```javascript
// Note names
pitch: "C4"
pitch: "A#3"
pitch: "Gb5"

// MIDI numbers
pitch: 60   // C4
pitch: 69   // A4

// Chords (arrays of note names or MIDI numbers)
pitch: ["C4", "E4", "G4"]      // C major chord
pitch: [60, 64, 67]            // C major chord (MIDI)
pitch: ["C4", 64, "G4"]        // Mixed format also works
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
  format: "jmon",
  version: "1.0",
  tempo: 120,
  tracks: [
    {
      label: "melody",
      notes: [
        { pitch: "C4", time: 0, duration: "8n", velocity: 0.7 },
        { pitch: "E4", time: 0.5, duration: "8n", velocity: 0.8 },
        { pitch: "G4", time: 1, duration: "8n", velocity: 0.6 },
        { pitch: "C5", time: 1.5, duration: "4n", velocity: 0.9 }
      ]
    }
  ]
})

// Cell 4: Another pattern with chords
pattern2 = ({
  format: "jmon",
  version: "1.0",
  tempo: 140,
  tracks: [
    {
      label: "chords",
      notes: [
        { pitch: ["C4", "E4", "G4"], time: 0, duration: "2n", velocity: 0.8 },
        { pitch: ["D4", "F4", "A4"], time: 2, duration: "2n", velocity: 0.7 }
      ]
    }
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

## 📓 Jupyter Notebook Example

The JMON Live Player works perfectly in Jupyter notebooks using IPython.display.

### Basic Setup

```python
from IPython.display import IFrame, display, Javascript
import json

# Display the player iframe
player_url = "https://your-username.github.io/jmon-live-player/index.html"
display(IFrame(player_url, width=600, height=200))
```

### Helper Class for Pattern Updates

```python
class JMONPlayer:
    """Helper class to send pattern updates to the JMON Live Player iframe"""

    def __init__(self):
        self.iframe_id = "jmonPlayer"

    def update_pattern(self, pattern):
        """Send a pattern update to the player"""
        js_code = f"""
        var iframe = document.querySelector('iframe[src*="jmon-live-player"]');
        if (iframe && iframe.contentWindow) {{
            iframe.contentWindow.postMessage({{
                type: "update",
                pattern: {json.dumps(pattern)}
            }}, "*");
            console.log("Pattern updated");
        }} else {{
            console.error("Player iframe not found");
        }}
        """
        display(Javascript(js_code))

    def start(self):
        """Start playback"""
        self._send_command("start")

    def stop(self):
        """Stop playback"""
        self._send_command("stop")

    def resume(self):
        """Resume playback"""
        self._send_command("resume")

    def reset(self):
        """Reset position"""
        self._send_command("reset")

    def set_tempo(self, tempo):
        """Change tempo"""
        js_code = f"""
        var iframe = document.querySelector('iframe[src*="jmon-live-player"]');
        if (iframe && iframe.contentWindow) {{
            iframe.contentWindow.postMessage({{
                type: "setTempo",
                tempo: {tempo}
            }}, "*");
        }}
        """
        display(Javascript(js_code))

    def _send_command(self, command_type):
        """Send a simple command to the player"""
        js_code = f"""
        var iframe = document.querySelector('iframe[src*="jmon-live-player"]');
        if (iframe && iframe.contentWindow) {{
            iframe.contentWindow.postMessage({{
                type: "{command_type}"
            }}, "*");
        }}
        """
        display(Javascript(js_code))

# Initialize player
player = JMONPlayer()
```

### Example Usage

```python
# Define patterns (proper JMON format)
pattern1 = {
    "format": "jmon",
    "version": "1.0",
    "tempo": 120,
    "tracks": [
        {
            "label": "melody",
            "notes": [
                {"pitch": "C4", "time": 0, "duration": "8n", "velocity": 0.7},
                {"pitch": "E4", "time": 0.5, "duration": "8n", "velocity": 0.8},
                {"pitch": "G4", "time": 1, "duration": "8n", "velocity": 0.6},
                {"pitch": "C5", "time": 1.5, "duration": "4n", "velocity": 0.9}
            ]
        }
    ]
}

pattern2 = {
    "format": "jmon",
    "version": "1.0",
    "tempo": 140,
    "tracks": [
        {
            "label": "chords",
            "notes": [
                {"pitch": ["C4", "E4", "G4"], "time": 0, "duration": "2n", "velocity": 0.8},
                {"pitch": ["D4", "F4", "A4"], "time": 2, "duration": "2n", "velocity": 0.7}
            ]
        }
    ]
}

# Update to pattern 1
player.update_pattern(pattern1)

# Wait a bit, then switch to pattern 2
import time
time.sleep(5)
player.update_pattern(pattern2)
```

### Interactive Example with ipywidgets

```python
import ipywidgets as widgets
from IPython.display import display

# Create interactive controls
pattern_selector = widgets.Dropdown(
    options=['Pattern 1', 'Pattern 2'],
    value='Pattern 1',
    description='Pattern:'
)

tempo_slider = widgets.IntSlider(
    value=120,
    min=60,
    max=200,
    step=10,
    description='Tempo (BPM):',
    style={'description_width': 'initial'}
)

def on_pattern_change(change):
    if change['new'] == 'Pattern 1':
        player.update_pattern(pattern1)
    else:
        player.update_pattern(pattern2)

def on_tempo_change(change):
    player.set_tempo(change['new'])

pattern_selector.observe(on_pattern_change, names='value')
tempo_slider.observe(on_tempo_change, names='value')

# Display controls
display(widgets.VBox([pattern_selector, tempo_slider]))
```

### Generative Pattern Example

```python
import random

def generate_random_pattern(num_notes=8, tempo=120):
    """Generate a random JMON pattern"""
    notes_pool = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]
    durations = ["16n", "8n", "4n"]

    notes = []
    current_time = 0

    for _ in range(num_notes):
        duration = random.choice(durations)
        notes.append({
            "pitch": random.choice(notes_pool),
            "time": current_time,
            "duration": duration,
            "velocity": random.uniform(0.5, 1.0)
        })

        # Advance time based on duration
        duration_map = {"16n": 0.25, "8n": 0.5, "4n": 1.0}
        current_time += duration_map.get(duration, 0.5)

    return {
        "format": "jmon",
        "version": "1.0",
        "tempo": tempo,
        "tracks": [
            {
                "label": "random",
                "notes": notes
            }
        ]
    }

# Generate and play random patterns
for i in range(5):
    print(f"Playing random pattern {i+1}")
    random_pattern = generate_random_pattern()
    player.update_pattern(random_pattern)
    time.sleep(4)  # Wait 4 seconds before next pattern
```

### Algorithmic Composition Example

```python
def create_arpeggio(root_note="C4", pattern_type="major", tempo=120):
    """Create an arpeggio pattern"""

    # Define intervals for different chord types
    intervals = {
        "major": [0, 4, 7, 12],      # Root, major 3rd, 5th, octave
        "minor": [0, 3, 7, 12],      # Root, minor 3rd, 5th, octave
        "seventh": [0, 4, 7, 10],    # Root, major 3rd, 5th, minor 7th
        "diminished": [0, 3, 6, 9]   # Root, minor 3rd, diminished 5th, dim 7th
    }

    # Convert root note to MIDI number
    note_to_midi = {"C": 60, "D": 62, "E": 64, "F": 65, "G": 67, "A": 69, "B": 71}
    octave = int(root_note[-1])
    base_note = note_to_midi[root_note[0]]
    root_midi = base_note + (octave - 4) * 12

    # Create arpeggio notes
    notes = []
    current_time = 0

    for interval in intervals.get(pattern_type, intervals["major"]):
        notes.append({
            "pitch": root_midi + interval,
            "time": current_time,
            "duration": "8n",
            "velocity": 0.8
        })
        current_time += 0.5  # Advance by eighth note (0.5 quarter notes)

    return {
        "format": "jmon",
        "version": "1.0",
        "tempo": tempo,
        "tracks": [
            {
                "label": "arpeggio",
                "notes": notes
            }
        ]
    }

# Try different arpeggios
player.update_pattern(create_arpeggio("C4", "major", 120))
time.sleep(3)
player.update_pattern(create_arpeggio("A3", "minor", 140))
time.sleep(3)
player.update_pattern(create_arpeggio("G4", "seventh", 100))
```

### Complete Jupyter Notebook Cell Layout

```python
# Cell 1: Imports
from IPython.display import IFrame, display, Javascript
import ipywidgets as widgets
import json
import time
import random

# Cell 2: Display Player
player_url = "https://your-username.github.io/jmon-live-player/index.html"
display(IFrame(player_url, width=600, height=200))

# Cell 3: Helper Class (JMONPlayer code from above)
class JMONPlayer:
    # ... (full class definition)
    pass

player = JMONPlayer()

# Cell 4: Define Patterns
pattern1 = {...}
pattern2 = {...}

# Cell 5: Interactive Controls
pattern_selector = widgets.Dropdown(...)
tempo_slider = widgets.IntSlider(...)
# ... (widget setup)

display(widgets.VBox([pattern_selector, tempo_slider]))

# Cell 6: Experiment!
player.update_pattern(pattern1)
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
     format: "jmon",
     version: "1.0",
     tempo: 120,
     tracks: [
       {
         label: "test",
         notes: [
           { pitch: "C4", time: 0, duration: "4n", velocity: 0.7 },
           { pitch: "E4", time: 1, duration: "4n", velocity: 0.8 },
           { pitch: "G4", time: 2, duration: "4n", velocity: 0.6 }
         ]
       }
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

### Debug Mode

The player includes verbose logging to help diagnose issues. Open the browser console to see detailed logs:

```
[JMON Player] Message #1 received from origin: https://observablehq.com
[JMON Player] Message data: {type: "update", pattern: {...}}
[JMON Player] Processing message type: update
[JMON Player] UPDATE: Pattern updated successfully
```

### Built-in Test Function

Test the player directly from the browser console:

```javascript
// In the player iframe's console:
window.testJMONPlayer()

// Or from the parent window:
document.querySelector('iframe').contentWindow.testJMONPlayer()
```

This will send a test pattern and log diagnostic information including:
- Initialization status
- Session state
- Message count
- Pattern processing

### Common Issues

**No sound?**
- Click anywhere on the page to enable audio (browser autoplay policy)
- Check browser console for errors
- Verify Tone.js loaded correctly
- Run `window.testJMONPlayer()` to test audio

**Pattern not updating (Observable)?**
- Open browser console and check for `[JMON Player]` logs
- Verify messages are being received (check message count)
- Ensure `postMessage` uses the iframe's `contentWindow`
- Check that the pattern object has correct JMON format
- Try calling `player.contentWindow.testJMONPlayer()` from Observable

**Pattern not updating (Jupyter)?**
- Ensure the iframe has loaded completely before sending messages
- Use `time.sleep(2)` after displaying the iframe
- Check browser console for errors
- Verify the pattern JSON is valid

**Audio stuttering?**
- Check CPU usage
- Reduce pattern complexity
- Increase buffer size in Tone.js

**postMessage not working?**
- Verify iframe origin matches expected domain
- Check browser console for CORS or CSP errors
- Ensure iframe is fully loaded before sending messages
- Use the wildcard origin `"*"` for testing: `postMessage(data, "*")`

## 📚 Resources

- [JMON Format Specification](https://github.com/jmonlabs/jmon-format) - Official JMON schema and documentation
- [Tone.js Documentation](https://tonejs.github.io/) - Web Audio framework
- [Observable Documentation](https://observablehq.com/@observablehq/documentation) - Reactive notebooks
- [Jupyter Documentation](https://jupyter.org/documentation) - Interactive computing
- [IPython Display](https://ipython.readthedocs.io/en/stable/api/generated/IPython.display.html) - Display utilities
- [ipywidgets](https://ipywidgets.readthedocs.io/) - Interactive widgets for Jupyter
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Browser audio
- [PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) - Cross-frame communication

## 📄 License

MIT License - Feel free to use and modify!

## 🙏 Credits

Built with:
- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [Observable](https://observablehq.com/) - Reactive notebooks
- [Jupyter](https://jupyter.org/) - Interactive computing notebooks
- JMON - Musical notation system

---

**Built for continuous, uninterrupted musical exploration** 🎵

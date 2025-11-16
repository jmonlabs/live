// player.js — JMON Live Player

// --- DOM references ---
const statusEl = document.getElementById("status");
const patternLenEl = document.getElementById("pattern-length");
const playedEl = document.getElementById("events-played");
const positionEl = document.getElementById("position");

// --- Session class to track pattern + playback state ---
class Session {
  constructor() {
    this.pattern = null;
    this.events = [];
    this.position = 0;
    this.eventsPlayed = 0;
  }

  setPattern(pattern) {
    console.log("🔄 Received new pattern:", pattern);

    // Flatten pattern to an event array
    this.pattern = pattern;
    this.events = this.extractEvents(pattern);
    this.position = 0;
    this.eventsPlayed = 0;

    patternLenEl.textContent = this.events.length;
  }

  extractEvents(jmon) {
    if (!jmon || !jmon.tracks) return [];

    return jmon.tracks.flatMap(track => {
      return track.notes.map(n => ({
        pitch: n.pitch,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity ?? 0.8
      }));
    });
  }

  nextEvent() {
    if (this.events.length === 0) return null;
    const evt = this.events[this.position];

    this.position = (this.position + 1) % this.events.length;
    this.eventsPlayed++;
    return evt;
  }
}

const session = new Session();

// --- Create Tone synth ---
let synth;

// --- Initialize audio + scheduler ---
async function initAudio() {
  await Tone.start();
  synth = new Tone.Synth().toDestination();

  Tone.Transport.scheduleRepeat((time) => {
    const evt = session.nextEvent();
    if (!evt) return;

    synth.triggerAttackRelease(
      Tone.Frequency(evt.pitch, "midi"),
      evt.duration,
      time,
      evt.velocity
    );

    playedEl.textContent = session.eventsPlayed;
    positionEl.textContent = session.position;

  }, "8n");

  Tone.Transport.start();

  console.log("🚀 Transport started");
  statusEl.textContent = "ready";

  // 🔥 VERY IMPORTANT: tell Observable the player is ready
  window.parent.postMessage({ type: "ready" }, "*");
}

// Call at startup
initAudio();

// --- Listen for pattern updates ---
window.addEventListener("message", (event) => {
  if (event.data.type === "update") {
    session.setPattern(event.data.pattern);
  }
});

// player.js — JMON Live Player

// --- DOM references ---
const statusEl = document.getElementById("status");
const patternLenEl = document.getElementById("pattern-length");
const playedEl = document.getElementById("events-played");
const positionEl = document.getElementById("position");

// --- Session + audio state ---
const session = new Session();
let synth;
let part;

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function disposePart() {
  if (part) {
    part.dispose();
    part = null;
  }
}

function updateCounters(nextPosition) {
  if (playedEl) {
    playedEl.textContent = session.eventsPlayed;
  }
  if (positionEl && typeof nextPosition === "number") {
    positionEl.textContent = nextPosition;
  }
}

function buildLoop() {
  disposePart();

  const patternLength = session.getPatternLength();
  if (patternLenEl) {
    patternLenEl.textContent = patternLength;
  }

  if (patternLength === 0) {
    return;
  }

  const loopEndQuarterNotes = session.getPatternDuration() || patternLength;
  const loopEndSeconds = session.quarterNotesToSeconds(loopEndQuarterNotes);

  part = new Tone.Part((time, event) => {
    const duration = event.duration || "8n";
    const velocity = event.velocity ?? 0.8;
    const nextPosition = (session.position + 1) % patternLength;

    synth.triggerAttackRelease(event.pitch, duration, time, velocity);

    session.position = nextPosition;
    session.eventsPlayed += 1;
    updateCounters(nextPosition);
  }, session.flattenedNotes.map((evt) => [
    session.quarterNotesToSeconds(evt.time),
    evt,
  ]));

  part.loop = true;
  part.loopEnd = loopEndSeconds;
  part.start(0);
}

async function initAudio() {
  await Tone.start();
  synth = new Tone.Synth().toDestination();
  Tone.Transport.start();

  setStatus("ready");
  window.parent.postMessage({ type: "ready" }, "*");
}

function applyTempo(newTempo) {
  session.tempo = newTempo;
  Tone.Transport.bpm.value = newTempo;
}

function handleUpdate(pattern) {
  session.setPattern(pattern);
  applyTempo(session.tempo);
  buildLoop();
  setStatus("ready");
  window.parent.postMessage({ type: "ready" }, "*");
}

function handleReset() {
  session.reset();
  if (part) {
    part.stop(0);
    part.start(0);
  }
}

async function handleMessage(event) {
  const { type } = event.data || {};

  switch (type) {
    case "update":
      handleUpdate(event.data.pattern);
      break;
    case "start":
    case "resume":
      Tone.Transport.start();
      setStatus("running");
      break;
    case "stop":
      Tone.Transport.stop();
      setStatus("stopped");
      break;
    case "reset":
      handleReset();
      setStatus("ready");
      break;
    case "setTempo":
      if (typeof event.data.tempo === "number") {
        applyTempo(event.data.tempo);
        buildLoop();
      }
      break;
    default:
      break;
  }
}

initAudio();
window.addEventListener("message", handleMessage);

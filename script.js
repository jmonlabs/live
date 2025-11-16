// JMON Live - Real-time Music Playground
// Integrates Tone.js + jmon-algo for live algorithmic music exploration

import * as Tone from 'https://cdn.skypack.dev/tone@14.7.77';
import * as jm from 'https://esm.sh/jmon-algo@latest';

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════

const state = {
    // Live parameters (tweakable via UI)
    density: 0.5,
    pitchShift: 0,
    durationScale: 1.0,
    randomness: 0.2,
    tempo: 120,
    length: 8,
    pattern: 'arpeggio',
    synthType: 'synth',
    reverbAmount: 0.3,
    volume: -12,

    // Runtime state
    isPlaying: false,
    isMuted: false,
    stepIndex: 0,
    seed: Math.random(),

    // Current pattern data
    currentPattern: null
};

// ═══════════════════════════════════════════════════════════════════
// AUDIO SETUP
// ═══════════════════════════════════════════════════════════════════

let synth;
let reverb;
let loop;

function createSynth(type) {
    // Clean up existing synth
    if (synth) {
        synth.dispose();
    }

    // Create new synth based on type
    switch (type) {
        case 'amsynth':
            synth = new Tone.AMSynth({
                harmonicity: 3,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.8 }
            });
            break;
        case 'fmsynth':
            synth = new Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 10,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 1.0 }
            });
            break;
        case 'pluck':
            synth = new Tone.PluckSynth({
                attackNoise: 1,
                dampening: 4000,
                resonance: 0.9
            });
            break;
        case 'membrane':
            synth = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 4,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
            });
            break;
        default: // 'synth'
            synth = new Tone.Synth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1.0 }
            });
    }

    // Connect to effects chain
    synth.chain(reverb, Tone.Destination);
    synth.volume.value = state.volume;
}

function initAudio() {
    // Create reverb effect
    reverb = new Tone.Reverb({
        decay: 4,
        wet: state.reverbAmount
    });
    reverb.generate();

    // Create initial synth
    createSynth(state.synthType);

    // Set initial tempo
    Tone.Transport.bpm.value = state.tempo;
}

// ═══════════════════════════════════════════════════════════════════
// PATTERN GENERATORS
// ═══════════════════════════════════════════════════════════════════

function generatePattern(type, params) {
    const { length, density, randomness, pitchShift, seed } = params;

    // Use seed for reproducibility
    const rng = seededRandom(seed);

    switch (type) {
        case 'arpeggio':
            return generateArpeggio(length, density, pitchShift, rng);

        case 'random':
            return generateRandomWalk(length, density, pitchShift, randomness, rng);

        case 'euclidean':
            return generateEuclidean(length, density, pitchShift, rng);

        case 'pentatonic':
            return generatePentatonic(length, density, pitchShift, randomness, rng);

        case 'ambient':
            return generateAmbient(length, density, pitchShift, randomness, rng);

        default:
            return generateArpeggio(length, density, pitchShift, rng);
    }
}

// Simple seeded random number generator
function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

function generateArpeggio(length, density, pitchShift, rng) {
    const scale = jm.Scale.major('C4');
    const pattern = [];

    for (let i = 0; i < length; i++) {
        if (rng() < density) {
            const degree = i % scale.notes.length;
            const pitch = jm.Note.transpose(scale.notes[degree], pitchShift);
            pattern.push({
                note: pitch,
                duration: '8n',
                velocity: 0.5 + rng() * 0.3
            });
        } else {
            pattern.push({ rest: true });
        }
    }

    return pattern;
}

function generateRandomWalk(length, density, pitchShift, randomness, rng) {
    const scale = jm.Scale.major('C4');
    const pattern = [];
    let currentDegree = 0;

    for (let i = 0; i < length; i++) {
        if (rng() < density) {
            // Random walk with controlled randomness
            const step = Math.floor((rng() - 0.5) * randomness * 6);
            currentDegree = (currentDegree + step) % scale.notes.length;
            if (currentDegree < 0) currentDegree += scale.notes.length;

            const pitch = jm.Note.transpose(scale.notes[currentDegree], pitchShift);
            pattern.push({
                note: pitch,
                duration: '8n',
                velocity: 0.4 + rng() * 0.4
            });
        } else {
            pattern.push({ rest: true });
        }
    }

    return pattern;
}

function generateEuclidean(length, density, pitchShift, rng) {
    const scale = jm.Scale.minor('C4');
    const hits = Math.floor(length * density);
    const pattern = [];

    // Euclidean rhythm algorithm
    const rhythm = euclideanRhythm(hits, length);

    for (let i = 0; i < length; i++) {
        if (rhythm[i]) {
            const degree = Math.floor(rng() * scale.notes.length);
            const pitch = jm.Note.transpose(scale.notes[degree], pitchShift);
            pattern.push({
                note: pitch,
                duration: '8n',
                velocity: 0.5 + rng() * 0.3
            });
        } else {
            pattern.push({ rest: true });
        }
    }

    return pattern;
}

function generatePentatonic(length, density, pitchShift, randomness, rng) {
    const scale = jm.Scale.pentatonic('C4');
    const pattern = [];

    for (let i = 0; i < length; i++) {
        if (rng() < density) {
            const degree = Math.floor(rng() * scale.notes.length * (1 + randomness));
            const safeDegree = degree % scale.notes.length;
            const pitch = jm.Note.transpose(scale.notes[safeDegree], pitchShift);
            pattern.push({
                note: pitch,
                duration: rng() < 0.3 ? '4n' : '8n',
                velocity: 0.3 + rng() * 0.5
            });
        } else {
            pattern.push({ rest: true });
        }
    }

    return pattern;
}

function generateAmbient(length, density, pitchShift, randomness, rng) {
    const scale = jm.Scale.minor('C3');
    const pattern = [];

    for (let i = 0; i < length; i++) {
        if (rng() < density * 0.5) { // Sparser density for ambient
            const degree = Math.floor(rng() * scale.notes.length);
            const pitch = jm.Note.transpose(scale.notes[degree], pitchShift);

            // Longer, more sustained notes
            const durations = ['4n', '2n', '2n.'];
            const duration = durations[Math.floor(rng() * durations.length)];

            pattern.push({
                note: pitch,
                duration: duration,
                velocity: 0.2 + rng() * 0.3
            });
        } else {
            pattern.push({ rest: true });
        }
    }

    return pattern;
}

// Euclidean rhythm algorithm (Bjorklund's algorithm)
function euclideanRhythm(hits, total) {
    if (hits >= total) return new Array(total).fill(true);
    if (hits === 0) return new Array(total).fill(false);

    const pattern = [];
    const counts = [];
    const remainders = [];
    let divisor = total - hits;
    remainders.push(hits);

    let level = 0;
    while (remainders[level] > 1) {
        counts.push(Math.floor(divisor / remainders[level]));
        remainders.push(divisor % remainders[level]);
        divisor = remainders[level];
        level++;
    }
    counts.push(divisor);

    const build = (level) => {
        if (level === -1) {
            pattern.push(false);
        } else if (level === -2) {
            pattern.push(true);
        } else {
            for (let i = 0; i < counts[level]; i++) {
                build(level - 1);
            }
            if (remainders[level] !== 0) {
                build(level - 2);
            }
        }
    };

    build(level);
    return pattern.slice(0, total);
}

// ═══════════════════════════════════════════════════════════════════
// PLAYBACK ENGINE
// ═══════════════════════════════════════════════════════════════════

function refreshPattern() {
    state.currentPattern = generatePattern(state.pattern, {
        length: state.length,
        density: state.density,
        pitchShift: state.pitchShift,
        randomness: state.randomness,
        seed: state.seed
    });
}

function startPlayback() {
    if (state.isPlaying) return;

    // Ensure audio context is started
    Tone.start();

    // Generate initial pattern
    refreshPattern();

    // Create a Tone.js loop
    state.stepIndex = 0;

    loop = new Tone.Loop((time) => {
        if (state.isMuted) {
            state.stepIndex = (state.stepIndex + 1) % state.currentPattern.length;
            return;
        }

        const event = state.currentPattern[state.stepIndex];

        if (event && !event.rest) {
            const duration = Tone.Time(event.duration).toSeconds() * state.durationScale;
            synth.triggerAttackRelease(
                event.note,
                duration,
                time,
                event.velocity
            );

            // Update UI
            Tone.Draw.schedule(() => {
                updateStatus(event.note, state.stepIndex);
            }, time);
        }

        state.stepIndex = (state.stepIndex + 1) % state.currentPattern.length;

        // Regenerate pattern at loop boundary (optional variation)
        if (state.stepIndex === 0 && state.randomness > 0.7) {
            refreshPattern();
        }
    }, '8n');

    loop.start(0);
    Tone.Transport.start();
    state.isPlaying = true;

    updateTransportUI();
}

function stopPlayback() {
    if (!state.isPlaying) return;

    if (loop) {
        loop.stop();
        loop.dispose();
    }

    Tone.Transport.stop();
    state.isPlaying = false;
    state.stepIndex = 0;

    updateTransportUI();
    updateStatus('—', 0);
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    document.getElementById('muteBtn').textContent = state.isMuted ? 'Unmute' : 'Mute';
}

function reroll() {
    state.seed = Math.random();
    refreshPattern();
}

// ═══════════════════════════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════════════════════════

function updateTransportUI() {
    document.getElementById('startBtn').disabled = state.isPlaying;
    document.getElementById('stopBtn').disabled = !state.isPlaying;
}

function updateStatus(note, step) {
    document.getElementById('currentNote').textContent = note;
    document.getElementById('stepCounter').textContent = step + 1;
}

// ═══════════════════════════════════════════════════════════════════
// UI EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════

function initUI() {
    // Transport controls
    document.getElementById('startBtn').addEventListener('click', startPlayback);
    document.getElementById('stopBtn').addEventListener('click', stopPlayback);
    document.getElementById('muteBtn').addEventListener('click', toggleMute);
    document.getElementById('rerollBtn').addEventListener('click', reroll);

    // Pattern selection
    document.getElementById('patternSelect').addEventListener('change', (e) => {
        state.pattern = e.target.value;
        refreshPattern();
    });

    // Synth type selection
    document.getElementById('synthSelect').addEventListener('change', (e) => {
        state.synthType = e.target.value;
        createSynth(state.synthType);
    });

    // Parameter sliders
    setupSlider('density', (v) => {
        state.density = v;
        refreshPattern();
    }, 2);

    setupSlider('pitchShift', (v) => {
        state.pitchShift = Math.round(v);
        refreshPattern();
    }, 0);

    setupSlider('durationScale', (v) => {
        state.durationScale = v;
    }, 2);

    setupSlider('randomness', (v) => {
        state.randomness = v;
        refreshPattern();
    }, 2);

    setupSlider('tempo', (v) => {
        state.tempo = Math.round(v);
        Tone.Transport.bpm.value = state.tempo;
    }, 0);

    setupSlider('length', (v) => {
        state.length = Math.round(v);
        refreshPattern();
    }, 0);

    setupSlider('volume', (v) => {
        state.volume = v;
        synth.volume.value = v;
    }, 0, ' dB');

    setupSlider('reverb', (v) => {
        state.reverbAmount = v;
        reverb.wet.value = v;
    }, 2);
}

function setupSlider(name, callback, decimals = 0, suffix = '') {
    const slider = document.getElementById(`${name}Slider`);
    const valueDisplay = document.getElementById(`${name}Value`);

    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value);
        valueDisplay.textContent = displayValue + suffix;
        callback(value);
    });
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

async function init() {
    console.log('🎵 JMON Live - Initializing...');

    // Initialize audio engine
    initAudio();

    // Initialize UI
    initUI();

    console.log('✓ Ready to play');
    console.log('📖 Adjust parameters and press Start to begin');
}

// Start when page loads
init();

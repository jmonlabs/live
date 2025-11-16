/**
 * JMON Live Player - Persistent Audio Engine
 * Runs continuously and updates patterns via postMessage without interrupting playback
 */

// Global player state
let session = null;
let synth = null;
let loop = null;
let isInitialized = false;

/**
 * Initialize the audio engine
 * This runs once and persists throughout the session
 */
async function initializePlayer() {
    console.log('Initializing JMON Live Player...');

    // Create session
    session = new Session();

    // Create a persistent synth (polyphonic for chord support)
    synth = new Tone.PolySynth(Tone.Synth, {
        volume: -8,
        oscillator: {
            type: 'triangle'
        },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 0.1
        }
    }).toDestination();

    // Create persistent loop
    // This loop runs continuously and calls session.next() to get events
    loop = new Tone.Loop((time) => {
        const event = session.next(time);

        if (event) {
            playEvent(event, time);
        }
    }, "16n"); // Default to 16th note subdivision

    // Start Tone.Transport (persistent scheduler)
    await Tone.start();
    Tone.Transport.start();
    loop.start(0);

    isInitialized = true;
    updateStatus('ready');

    console.log('JMON Live Player initialized and running');
}

/**
 * Play a single JMON event
 * @param {Object} event - Event object with pitch, duration, velocity, etc.
 * @param {number} time - Tone.js scheduled time
 */
function playEvent(event, time) {
    if (!event || !synth) return;

    // Extract event properties
    // JMON events typically have: pitch, duration, velocity, etc.
    const pitch = event.pitch || event.note || 'C4';
    const duration = event.duration || 0.1;
    const velocity = event.velocity || 0.7;

    // Handle different pitch formats
    let notes = [];
    if (Array.isArray(pitch)) {
        // Array of pitches (chord)
        notes = pitch;
    } else if (typeof pitch === 'number') {
        // MIDI note number
        notes = [Tone.Frequency(pitch, "midi").toNote()];
    } else {
        // Note name (e.g., "C4")
        notes = [pitch];
    }

    // Trigger synth
    try {
        synth.triggerAttackRelease(notes, duration, time, velocity);
    } catch (error) {
        console.error('Error playing event:', error, event);
    }
}

/**
 * Update player status in UI
 * @param {string} status - Status message
 */
function updateStatus(status) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = status;
    }
}

/**
 * Handle postMessage from parent (Observable notebook)
 * This is the main interface for receiving pattern updates
 */
window.addEventListener('message', async (event) => {
    console.log('Received message:', event.data);

    if (!event.data || !event.data.type) {
        return;
    }

    switch (event.data.type) {
        case 'update':
            // Update pattern without stopping playback
            if (!isInitialized) {
                await initializePlayer();
            }

            if (session && event.data.pattern) {
                session.setPattern(event.data.pattern);
                updateStatus('running');
                console.log('Pattern updated');
            }
            break;

        case 'start':
            // Initialize and start player
            if (!isInitialized) {
                await initializePlayer();
            }
            updateStatus('running');
            break;

        case 'stop':
            // Stop playback (but don't destroy audio context)
            if (loop) {
                loop.stop();
            }
            updateStatus('stopped');
            break;

        case 'resume':
            // Resume playback
            if (loop) {
                loop.start();
            }
            updateStatus('running');
            break;

        case 'reset':
            // Reset position but keep playing
            if (session) {
                session.reset();
            }
            break;

        case 'setTempo':
            // Update tempo without restarting
            if (session && event.data.tempo) {
                session.tempo = event.data.tempo;
                Tone.Transport.bpm.value = event.data.tempo;
            }
            break;

        default:
            console.warn('Unknown message type:', event.data.type);
    }
});

/**
 * Auto-initialize on load
 * This ensures the player is ready to receive messages immediately
 */
window.addEventListener('load', async () => {
    console.log('JMON Live Player loaded');
    updateStatus('ready (waiting for pattern)');

    // Optionally auto-initialize (or wait for first message)
    // Uncomment the following line to auto-start:
    // await initializePlayer();
});

/**
 * Handle user interaction to enable audio
 * Some browsers require user interaction before playing audio
 */
document.addEventListener('click', async () => {
    if (!isInitialized) {
        await initializePlayer();
    }
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.jmonPlayer = {
        session,
        synth,
        loop,
        initializePlayer,
        playEvent,
        updateStatus
    };
}

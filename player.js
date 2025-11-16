/**
 * JMON Live Player - Persistent Audio Engine
 * Runs continuously and updates patterns via postMessage without interrupting playback
 */

// Global player state
let session = null;
let synth = null;
let part = null; // Tone.Part for scheduling looped events
let isInitialized = false;
let messageCount = 0; // Track all messages received for debugging
let pendingPattern = null; // Store pattern if received before audio is enabled

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

    // Start Tone.Transport (persistent scheduler)
    await Tone.start();
    Tone.Transport.start();

    isInitialized = true;
    updateStatus('ready');

    console.log('JMON Live Player initialized and running');
}

/**
 * Schedule all events from the current pattern
 * Uses Tone.Part for looping playback
 */
function schedulePattern() {
    if (!session || !session.flattenedNotes || session.flattenedNotes.length === 0) {
        console.log('[JMON Player] No pattern to schedule');
        return;
    }

    // Stop and dispose old part if it exists
    if (part) {
        part.stop();
        part.dispose();
    }

    const notes = session.flattenedNotes;
    const patternDuration = session.loopDuration || 4; // Default to 4 quarter notes if not set

    console.log('[JMON Player] Scheduling', notes.length, 'notes, loop duration:', patternDuration, 'quarter notes');

    // Create events array for Tone.Part
    const events = notes.map(note => ({
        time: note.time,
        note: note
    }));

    // Create a new Part with the events
    part = new Tone.Part((time, event) => {
        playEvent(event.note, time);
        session.eventsPlayed++;
        session.updateUI();
    }, events);

    // Set the part to loop
    part.loop = true;
    part.loopStart = 0;
    part.loopEnd = patternDuration;

    // Start the part
    part.start(0);

    console.log('[JMON Player] Pattern scheduled with Tone.Part, looping every', patternDuration, 'quarter notes');
}

/**
 * Play a single JMON event
 * @param {Object} event - Event object with pitch, duration, velocity, etc.
 * @param {number} time - Tone.js scheduled time
 */
function playEvent(event, time) {
    if (!event || !synth) return;

    // Extract event properties
    const pitch = event.pitch || event.note || 'C4';
    const velocity = event.velocity || 0.7;

    // Handle different pitch formats
    let notes = [];
    if (Array.isArray(pitch)) {
        // Array of pitches (chord) - handle both MIDI numbers and note names
        notes = pitch.map(p => {
            if (typeof p === 'number') {
                return Tone.Frequency(p, "midi").toNote();
            }
            return p;
        });
    } else if (typeof pitch === 'number') {
        // MIDI note number
        notes = [Tone.Frequency(pitch, "midi").toNote()];
    } else {
        // Note name (e.g., "C4")
        notes = [pitch];
    }

    // Parse duration - JMON uses note values like "4n", "8n", or quarter notes
    let durationValue;
    if (typeof event.duration === 'string') {
        // Tone.js notation ("4n", "8t", etc.) or bars:beats:ticks
        if (event.duration.match(/^\d+(n|t)$/)) {
            // Note value - Tone.js can handle this directly
            durationValue = event.duration;
        } else if (event.duration.includes(':')) {
            // Bars:beats:ticks - convert to seconds via session
            const durationQuarterNotes = session.parseDuration(event.duration);
            durationValue = session.quarterNotesToSeconds(durationQuarterNotes);
        } else {
            durationValue = 0.1; // Fallback
        }
    } else if (typeof event.duration === 'number') {
        // Could be quarter notes or seconds - let session decide
        const durationQuarterNotes = session.parseDuration(event.duration);
        durationValue = session.quarterNotesToSeconds(durationQuarterNotes);
    } else {
        durationValue = 0.1; // Default fallback
    }

    // Trigger synth
    try {
        synth.triggerAttackRelease(notes, durationValue, time, velocity);
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
    messageCount++;
    console.log(`[JMON Player] Message #${messageCount} received from origin:`, event.origin);
    console.log('[JMON Player] Message data:', event.data);
    console.log('[JMON Player] Message source:', event.source ? 'present' : 'null');

    if (!event.data || !event.data.type) {
        console.warn('[JMON Player] Message ignored - no data.type field');
        return;
    }

    console.log('[JMON Player] Processing message type:', event.data.type);

    switch (event.data.type) {
        case 'update':
            console.log('[JMON Player] UPDATE: Received pattern update');

            // If audio not initialized yet, store pattern for later
            if (!isInitialized) {
                console.log('[JMON Player] UPDATE: Audio not enabled yet - storing pattern');
                console.log('[JMON Player] UPDATE: Press Start button to begin playback');
                pendingPattern = event.data.pattern;
                updateStatus('ready (press Start)');
                break;
            }

            // Update pattern without stopping playback
            if (session && event.data.pattern) {
                console.log('[JMON Player] UPDATE: Setting pattern:', event.data.pattern);
                session.setPattern(event.data.pattern);

                // Update Tone.Transport tempo if pattern specifies it
                if (event.data.pattern.tempo) {
                    console.log('[JMON Player] UPDATE: Setting tempo to', event.data.pattern.tempo);
                    Tone.Transport.bpm.value = event.data.pattern.tempo;
                }

                // Schedule the new pattern
                schedulePattern();

                updateStatus('running');
                console.log('[JMON Player] UPDATE: Pattern updated successfully');
                console.log('[JMON Player] UPDATE: Pattern length:', session.flattenedNotes.length, 'events');
            } else {
                console.warn('[JMON Player] UPDATE: Cannot set pattern - session:', session ? 'exists' : 'null', 'pattern:', event.data.pattern ? 'exists' : 'missing');
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
 * Global test function - can be called from console or parent
 * Usage: window.testJMONPlayer()
 */
window.testJMONPlayer = async function() {
    console.log('[JMON Player] TEST: Running test function...');
    console.log('[JMON Player] TEST: Initialized?', isInitialized);
    console.log('[JMON Player] TEST: Session?', session ? 'exists' : 'null');
    console.log('[JMON Player] TEST: Messages received:', messageCount);

    // Test pattern
    const testPattern = {
        format: "jmon",
        version: "1.0",
        tempo: 120,
        tracks: [{
            label: "test",
            notes: [
                { pitch: 60, time: 0, duration: "4n", velocity: 0.9 },
                { pitch: 64, time: 1, duration: "4n", velocity: 0.9 },
                { pitch: 67, time: 2, duration: "4n", velocity: 0.9 }
            ]
        }]
    };

    // Trigger via message handler
    window.postMessage({ type: 'update', pattern: testPattern }, '*');
    console.log('[JMON Player] TEST: Posted test pattern via postMessage');

    return 'Test message sent - check console logs';
};

/**
 * Auto-initialize on load
 * This ensures the player is ready to receive messages immediately
 */
window.addEventListener('load', async () => {
    console.log('[JMON Player] ========================================');
    console.log('[JMON Player] JMON Live Player loaded');
    console.log('[JMON Player] URL:', window.location.href);
    console.log('[JMON Player] Parent origin:', document.referrer || 'no referrer');
    console.log('[JMON Player] Waiting for postMessage commands...');
    console.log('[JMON Player] Test function available: window.testJMONPlayer()');
    console.log('[JMON Player] ========================================');
    updateStatus('ready (waiting for pattern)');

    // Send ready signal to parent window (Observable/Jupyter)
    // This allows the parent to wait for the iframe to be ready before sending patterns
    if (window.parent && window.parent !== window) {
        console.log('[JMON Player] Sending ready signal to parent...');
        window.parent.postMessage({ type: 'ready', source: 'jmon-player' }, '*');
    }

    // Wire up start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            console.log('[JMON Player] Start button clicked');

            // Initialize audio if not yet initialized
            if (!isInitialized) {
                console.log('[JMON Player] Initializing audio...');
                await initializePlayer();
            }

            // Apply pending pattern if one exists
            if (pendingPattern) {
                console.log('[JMON Player] Applying pending pattern...');
                session.setPattern(pendingPattern);

                if (pendingPattern.tempo) {
                    Tone.Transport.bpm.value = pendingPattern.tempo;
                }

                schedulePattern();
                updateStatus('running');
                console.log('[JMON Player] Pending pattern applied, playback started');
                pendingPattern = null;
            } else if (session && session.flattenedNotes && session.flattenedNotes.length > 0) {
                // Restart current pattern
                console.log('[JMON Player] Restarting current pattern');
                Tone.Transport.position = 0;
                schedulePattern();
                updateStatus('running');
            } else {
                updateStatus('ready (waiting for pattern)');
                console.log('[JMON Player] No pattern to play');
            }
        });
    }

    // Wire up stop button
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            console.log('[JMON Player] Stop button clicked');

            // Stop the part
            if (part) {
                part.stop();
            }

            // Reset transport position but keep it running
            Tone.Transport.position = 0;

            if (session) {
                session.reset();
            }

            updateStatus('stopped');
            console.log('[JMON Player] Playback stopped');
        });
    }
});


// Export for debugging
if (typeof window !== 'undefined') {
    window.jmonPlayer = {
        session,
        synth,
        part,
        isInitialized,
        messageCount,
        initializePlayer,
        playEvent,
        schedulePattern,
        updateStatus,
        test: window.testJMONPlayer
    };
}

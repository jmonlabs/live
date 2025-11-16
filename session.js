/**
 * Session class manages JMON pattern state and playback position
 * Designed to update patterns without interrupting playback
 *
 * Supports the full JMON format specification:
 * https://github.com/jmonlabs/jmon-format
 */
class Session {
    constructor() {
        this.pattern = null;
        this.flattenedNotes = []; // All notes from all tracks, flattened and sorted by time
        this.position = 0;
        this.eventsPlayed = 0;
        this.tempo = 120; // default BPM
        this.startTime = 0; // Pattern start time in Tone.js time
        this.loopDuration = 0; // Total pattern duration in quarter notes
    }

    /**
     * Update the pattern without resetting playback
     * @param {Object} newPattern - JMON pattern object
     * @param {boolean} resetPosition - Whether to reset position (default: true)
     */
    setPattern(newPattern, resetPosition = true) {
        console.log('Setting new JMON pattern:', newPattern);

        // Validate JMON format
        if (!newPattern) {
            console.warn('No pattern provided');
            return;
        }

        // Support both full JMON format and simplified format
        if (newPattern.format === 'jmon' || newPattern.tracks) {
            // Full JMON format
            this.pattern = newPattern;
            this.tempo = newPattern.tempo || 120;
            this.flattenedNotes = this.flattenJMONTracks(newPattern.tracks || []);
        } else if (newPattern.events) {
            // Simplified format (legacy support)
            this.pattern = newPattern;
            this.tempo = newPattern.tempo || 120;
            this.flattenedNotes = newPattern.events.map((event, index) => ({
                ...event,
                time: event.time || index, // Use provided time or sequence position
                trackLabel: 'main'
            }));
        } else {
            console.error('Invalid pattern format. Expected JMON format with tracks or simplified format with events.');
            return;
        }

        // Calculate total loop duration
        if (this.flattenedNotes.length > 0) {
            const lastNote = this.flattenedNotes[this.flattenedNotes.length - 1];
            const lastNoteEnd = lastNote.time + this.parseDuration(lastNote.duration);
            this.loopDuration = lastNoteEnd;
        }

        if (resetPosition) {
            this.position = 0;
            this.eventsPlayed = 0;
        }

        // Notify UI
        this.updateUI();

        console.log(`Pattern loaded: ${this.flattenedNotes.length} notes, ${this.loopDuration} quarter notes duration`);
    }

    /**
     * Flatten JMON tracks into a single sorted array of notes
     * @param {Array} tracks - Array of JMON tracks
     * @returns {Array} Flattened and sorted notes
     */
    flattenJMONTracks(tracks) {
        if (!tracks || tracks.length === 0) {
            return [];
        }

        const allNotes = [];

        tracks.forEach(track => {
            if (!track.notes || track.notes.length === 0) {
                return;
            }

            track.notes.forEach(note => {
                allNotes.push({
                    ...note,
                    trackLabel: track.label,
                    trackSynth: track.synth,
                    trackSynthRef: track.synthRef
                });
            });
        });

        // Sort by time (convert all times to quarter notes first)
        allNotes.sort((a, b) => {
            const timeA = this.parseTime(a.time);
            const timeB = this.parseTime(b.time);
            return timeA - timeB;
        });

        // Convert times to quarter notes for easy scheduling
        return allNotes.map(note => ({
            ...note,
            time: this.parseTime(note.time) // Normalize to quarter notes
        }));
    }

    /**
     * Parse JMON time value to quarter notes
     * @param {*} time - Time value (number, Tone.js notation, or bars:beats:ticks)
     * @returns {number} Time in quarter notes
     */
    parseTime(time) {
        if (typeof time === 'number') {
            // Already in quarter notes
            return time;
        }

        if (typeof time === 'string') {
            // Bars:beats:ticks format (e.g., "2:1:0")
            if (time.includes(':')) {
                const parts = time.split(':');
                const bars = parseInt(parts[0]) || 0;
                const beats = parseFloat(parts[1]) || 0;
                // Assuming 4/4 time signature for now
                return bars * 4 + beats;
            }

            // Tone.js notation (e.g., "4n", "8t")
            // For now, return 0 and let Tone.js handle it
            // TODO: Convert Tone.js notation to quarter notes
            return 0;
        }

        return 0;
    }

    /**
     * Parse JMON duration value to quarter notes
     * @param {*} duration - Duration value (note value like "4n" or number)
     * @returns {number} Duration in quarter notes
     */
    parseDuration(duration) {
        if (!duration) {
            return 0.25; // Default to 16th note
        }

        if (typeof duration === 'number') {
            // If it's a number < 10, assume it's quarter notes
            // If it's > 10, it might be milliseconds (legacy), convert
            if (duration < 10) {
                return duration;
            } else {
                // Assume seconds, convert to quarter notes based on tempo
                const beatsPerSecond = this.tempo / 60;
                return duration * beatsPerSecond;
            }
        }

        if (typeof duration === 'string') {
            // Parse note values: "1n" = 4 quarter notes, "2n" = 2 quarter notes, "4n" = 1 quarter note, etc.
            const match = duration.match(/^(\d+)(n|t)$/);
            if (match) {
                const value = parseInt(match[1]);
                const type = match[2];

                if (type === 'n') {
                    // Normal note: "4n" = quarter note = 1
                    return 4 / value;
                } else if (type === 't') {
                    // Triplet: "8t" = eighth note triplet
                    return (4 / value) * (2/3);
                }
            }

            // Bars:beats:ticks format
            if (duration.includes(':')) {
                const parts = duration.split(':');
                const bars = parseInt(parts[0]) || 0;
                const beats = parseFloat(parts[1]) || 0;
                return bars * 4 + beats;
            }
        }

        return 0.25; // Default to 16th note
    }

    /**
     * Get the next event to play
     * @param {number} time - Current Tone.js time
     * @returns {Object|null} Event object with pitch, duration, velocity, etc.
     */
    next(time) {
        if (!this.flattenedNotes || this.flattenedNotes.length === 0) {
            return null;
        }

        // Get current event
        const event = this.flattenedNotes[this.position];

        // Increment position (loop back to start)
        this.position = (this.position + 1) % this.flattenedNotes.length;
        this.eventsPlayed++;

        // Update UI
        this.updateUI();

        // Return event with timing info
        return {
            ...event,
            scheduledTime: time,
            position: this.position
        };
    }

    /**
     * Get all notes that should play at a specific time
     * @param {number} currentTime - Current time in quarter notes (relative to pattern start)
     * @returns {Array} Array of notes to play
     */
    getNotesAtTime(currentTime) {
        if (!this.flattenedNotes || this.flattenedNotes.length === 0) {
            return [];
        }

        // Loop the time within the pattern duration
        const loopedTime = this.loopDuration > 0 ? currentTime % this.loopDuration : currentTime;

        // Find all notes that should play at this time (with small tolerance)
        const tolerance = 0.01; // Small tolerance for floating point comparison
        return this.flattenedNotes.filter(note => {
            return Math.abs(note.time - loopedTime) < tolerance;
        });
    }

    /**
     * Get pattern length (number of notes)
     * @returns {number}
     */
    getPatternLength() {
        return this.flattenedNotes ? this.flattenedNotes.length : 0;
    }

    /**
     * Get pattern duration in quarter notes
     * @returns {number}
     */
    getPatternDuration() {
        return this.loopDuration;
    }

    /**
     * Convert quarter notes to seconds based on current tempo
     * @param {number} quarterNotes - Duration in quarter notes
     * @returns {number} Duration in seconds
     */
    quarterNotesToSeconds(quarterNotes) {
        // BPM = beats per minute = quarter notes per minute
        // seconds = (quarter notes / BPM) * 60
        return (quarterNotes / this.tempo) * 60;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        if (typeof document !== 'undefined') {
            const patternLengthEl = document.getElementById('pattern-length');
            const eventsCountEl = document.getElementById('events-count');
            const positionEl = document.getElementById('position');

            if (patternLengthEl) {
                patternLengthEl.textContent = this.getPatternLength();
            }
            if (eventsCountEl) {
                eventsCountEl.textContent = this.eventsPlayed;
            }
            if (positionEl) {
                positionEl.textContent = this.position;
            }
        }
    }

    /**
     * Reset counters
     */
    reset() {
        this.position = 0;
        this.eventsPlayed = 0;
        this.startTime = 0;
        this.updateUI();
    }
}

// Make Session available globally
if (typeof window !== 'undefined') {
    window.Session = Session;
}

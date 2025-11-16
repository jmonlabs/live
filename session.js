/**
 * Session class manages JMON pattern state and playback position
 * Designed to update patterns without interrupting playback
 */
class Session {
    constructor() {
        this.pattern = null;
        this.position = 0;
        this.eventsPlayed = 0;
        this.tempo = 120; // default BPM
        this.subdivision = 16; // default subdivision (16th notes)
    }

    /**
     * Update the pattern without resetting playback
     * @param {Object} newPattern - JMON pattern object
     * @param {boolean} resetPosition - Whether to reset position (default: true)
     */
    setPattern(newPattern, resetPosition = true) {
        console.log('Setting new pattern:', newPattern);
        this.pattern = newPattern;

        if (resetPosition) {
            this.position = 0;
        }

        // Extract tempo if present in pattern
        if (newPattern && newPattern.tempo) {
            this.tempo = newPattern.tempo;
        }

        // Extract subdivision if present
        if (newPattern && newPattern.subdivision) {
            this.subdivision = newPattern.subdivision;
        }

        // Notify UI
        this.updateUI();
    }

    /**
     * Get the next event to play
     * @param {number} time - Current Tone.js time
     * @returns {Object|null} Event object with pitch, duration, velocity, etc.
     */
    next(time) {
        if (!this.pattern || !this.pattern.events || this.pattern.events.length === 0) {
            return null;
        }

        // Get current event
        const event = this.pattern.events[this.position];

        // Increment position (loop back to start)
        this.position = (this.position + 1) % this.pattern.events.length;
        this.eventsPlayed++;

        // Update UI
        this.updateUI();

        // Return event with timing info
        return {
            ...event,
            time: time,
            position: this.position
        };
    }

    /**
     * Get pattern length
     * @returns {number}
     */
    getPatternLength() {
        return this.pattern && this.pattern.events ? this.pattern.events.length : 0;
    }

    /**
     * Get subdivision duration in seconds
     * @returns {number}
     */
    getSubdivisionDuration() {
        // Convert BPM and subdivision to seconds
        // 60 seconds / BPM = seconds per beat
        // seconds per beat / (subdivision / 4) = seconds per subdivision
        const beatsPerSecond = this.tempo / 60;
        const subdivisionsPerBeat = this.subdivision / 4; // 16th notes = 4 subdivisions per beat
        return 1 / (beatsPerSecond * subdivisionsPerBeat);
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
        this.updateUI();
    }
}

// Make Session available globally
if (typeof window !== 'undefined') {
    window.Session = Session;
}

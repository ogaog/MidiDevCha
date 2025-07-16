// 押下中ノート(array of MIDI note numbers)からコード名を返す
const PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function detectChord(pressedNotes) {
    if (!pressedNotes.length) return '–';
    const pcs = pressedNotes
        .map(n => PITCHES[n % 12]);
    const names = Tonal.Chord.detect(pcs);
    return names[0] || 'Unknown';
}

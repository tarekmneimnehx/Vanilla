// Generates the two bundled notification sounds as 16-bit mono WAV files.
// Run: node scripts/generate-sounds.js
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function writeWav(file, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s * 32767))), 44 + i * 2));
  fs.writeFileSync(file, buffer);
}

function chime() {
  const seconds = 1.4;
  const n = Math.floor(SAMPLE_RATE * seconds);
  const out = new Float32Array(n);
  const notes = [
    { f: 659.25, start: 0, gain: 0.5 },
    { f: 987.77, start: 0.16, gain: 0.35 },
    { f: 1318.5, start: 0.32, gain: 0.22 },
  ];
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (const note of notes) {
      if (t < note.start) continue;
      const dt = t - note.start;
      const env = Math.min(1, dt / 0.012) * Math.exp(-dt * 3.2);
      v += Math.sin(2 * Math.PI * note.f * dt) * env * note.gain;
      v += Math.sin(2 * Math.PI * note.f * 2 * dt) * env * note.gain * 0.12;
    }
    out[i] = v * 0.8;
  }
  return out;
}

function drop() {
  const seconds = 0.55;
  const n = Math.floor(SAMPLE_RATE * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    const f = 1100 * Math.exp(-t * 9) + 380;
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 9);
    const phase = 2 * Math.PI * (380 * t + (1100 / 9) * (1 - Math.exp(-t * 9)));
    out[i] = Math.sin(phase) * env * 0.7 + Math.sin(2 * Math.PI * f * 0.5 * t) * env * 0.08;
  }
  return out;
}

const dir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });
writeWav(path.join(dir, 'chime.wav'), chime());
writeWav(path.join(dir, 'drop.wav'), drop());
console.log('Wrote', dir);

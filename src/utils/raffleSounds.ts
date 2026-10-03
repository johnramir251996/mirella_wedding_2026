/*
 * Raffle sounds, made in the browser (Web Audio) — no sound files to load.
 * Browsers only allow sound after a tap, so the context starts on the Spin press.
 */

type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
const MUTE_KEY = 'wedding-raffle-muted'
const VOLUME_KEY = 'wedding-raffle-volume'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* ignore */
  }
}

let muted = read(MUTE_KEY) === '1'
let volume = Math.min(1, Math.max(0, Number(read(VOLUME_KEY) ?? '0.7') || 0.7))

export const isMuted = () => muted
export const getVolume = () => volume
export function setMuted(v: boolean) {
  muted = v
  write(MUTE_KEY, v ? '1' : '0')
  if (master) master.gain.value = v ? 0 : volume
}
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v))
  write(VOLUME_KEY, String(volume))
  if (master && !muted) master.gain.value = volume
}

/** Call from a tap (the Spin button) so sound is allowed. */
export function unlockSound() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = muted ? 0 : volume
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number, endFreq?: number) {
  if (!ctx || !master || muted) return
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

let lastTick = 0
/** A short click as a name passes the pointer. */
export function playTick() {
  if (!ctx) return
  const now = performance.now()
  if (now - lastTick < 28) return // very fast spins: don't buzz
  lastTick = now
  tone(1900, 0, 0.035, 'square', 0.08)
}

/** Someone is out (not a prize). */
export function playOut() {
  tone(420, 0, 0.42, 'sine', 0.35, 150)
  tone(210, 0.05, 0.38, 'triangle', 0.15, 90)
}

/** A consolation prize. */
export function playChime() {
  tone(988, 0, 0.9, 'sine', 0.3)
  tone(1319, 0.12, 1.0, 'sine', 0.25)
  tone(1976, 0.24, 1.1, 'sine', 0.12)
}

/** The winner. */
export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone(f, i * 0.13, 0.32, 'triangle', 0.32))
  // final chord
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, 0.6, 1.6, 'triangle', 0.22))
  tone(1568, 0.62, 1.4, 'sine', 0.1)
}

// ---------------------------------------------------------------- bingo

let noiseBuf: AudioBuffer | null = null
function noise(): AudioBuffer | null {
  if (!ctx) return null
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 1.5)
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

/** One noisy hit (snare or cymbal), `start` seconds from now. */
function hit(start: number, peak: number, dur: number, freq: number, type: BiquadFilterType = 'bandpass') {
  if (!ctx || !master || muted) return
  const buf = noise()
  if (!buf) return
  const t0 = ctx.currentTime + start
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = 0.7
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(t0, Math.random() * 0.8, dur + 0.05)
}

/** A snare drumroll that speeds up and swells for `seconds`, ending on a cymbal and a low drum. */
export function playDrumroll(seconds = 3) {
  if (!ctx || !master || muted) return
  let t = 0
  let i = 0
  while (t < seconds) {
    const p = t / seconds
    hit(t, 0.06 + 0.3 * p * p, 0.07, 1700 + 600 * Math.random())
    if (i % 6 === 0) tone(95 + 20 * p, t, 0.18, 'sine', 0.12 + 0.2 * p, 60) // a soft tom underneath
    t += (0.085 - 0.05 * p) * (0.85 + Math.random() * 0.3)
    i++
  }
  hit(seconds, 0.45, 1.6, 5500, 'highpass')
  tone(120, seconds, 0.5, 'sine', 0.5, 50)
}

/** The ball pops out of the drum. */
export function playBallOut() {
  tone(520, 0, 0.16, 'sine', 0.3, 1100)
  tone(1320, 0.12, 0.7, 'sine', 0.18)
  tone(1760, 0.2, 0.8, 'sine', 0.1)
}

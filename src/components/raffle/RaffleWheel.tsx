import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '../ui/cn'

const FILLS = ['var(--color-paper)', 'var(--color-champagne-light)', 'var(--color-cream)', 'var(--color-linen)']
const SPIN_MS = 6500

function segmentPath(a0: number, a1: number, r: number): string {
  const rad = (d: number) => (d * Math.PI) / 180
  const x0 = Math.cos(rad(a0)) * r
  const y0 = Math.sin(rad(a0)) * r
  const x1 = Math.cos(rad(a1)) * r
  const y1 = Math.sin(rad(a1)) * r
  return `M0 0 L${x0.toFixed(3)} ${y0.toFixed(3)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`
}

/** A secure random whole number below n. */
function randomIndex(n: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % n
}

interface WheelProps {
  names: string[]
  rotation: number
  spinning: boolean
  /** Slow idle turn (public page). */
  idle?: boolean
  centre?: string
  className?: string
  onSpinEnd?: () => void
}

/** The raffle wheel (SVG): names around the edge, pointer at the top. */
export function RaffleWheel({ names, rotation, spinning, idle, centre, className, onSpinEnd }: WheelProps) {
  const n = Math.max(names.length, 1)
  const a = 360 / n
  const chord = (2 * Math.PI * 80 * a) / 360
  const font = Math.min(7, Math.max(2.3, chord * 0.6))
  const maxChars = font < 3.2 ? 26 : 20
  return (
    <svg viewBox="-106 -112 212 218" className={cn('block h-auto w-full', className)} role="img" aria-label={`Raffle wheel with ${names.length} names`}>
      <circle r="103" fill="var(--color-champagne)" opacity="0.35" />
      <g
        className={idle ? 'motion-safe:animate-[spin_90s_linear_infinite]' : undefined}
        style={idle ? undefined : { transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)` : 'none' }}
        onTransitionEnd={(e) => e.target === e.currentTarget && onSpinEnd?.()}
      >
        {names.length === 0 ? (
          <circle r="100" fill="var(--color-cream)" stroke="var(--color-line)" strokeWidth="0.6" />
        ) : (
          names.map((name, i) => {
            const a0 = -90 + i * a
            const mid = a0 + a / 2
            const label = name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name
            return (
              <g key={`${name}-${i}`}>
                {n === 1 ? (
                  <circle r="100" fill={FILLS[0]} stroke="var(--color-line)" strokeWidth="0.5" />
                ) : (
                  <path d={segmentPath(a0, a0 + a, 100)} fill={FILLS[i % (n % 4 === 1 ? 3 : 4)]} stroke="var(--color-line)" strokeWidth="0.35" />
                )}
                <text
                  transform={`rotate(${mid}) translate(94 0)`}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={font}
                  fill="var(--color-ink)"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {label}
                </text>
              </g>
            )
          })
        )}
      </g>
      <circle r="17" fill="var(--color-paper)" stroke="var(--color-champagne)" strokeWidth="1.2" />
      <text textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--color-gold)" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
        {centre ?? ''}
      </text>
      {/* pointer */}
      <path d="M0 -94 L-7 -110 L7 -110 Z" fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

interface StageProps {
  /** Names as shown (masked or full). */
  shown: string[]
  /** The real names, same order (what's saved as the winner). */
  real: string[]
  centre?: string
  disabled?: boolean
  large?: boolean
  onWinner: (realName: string, shownName: string) => void
}

/** Wheel + Spin button + the winner reveal. The host spins; the winner is saved by the caller. */
export function SpinStage({ shown, real, centre, disabled, large, onWinner }: StageProps) {
  const reduce = useReducedMotion()
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const target = useRef<number | null>(null)
  const done = useRef(onWinner)
  useEffect(() => {
    done.current = onWinner
  }, [onWinner])

  const finish = () => {
    const i = target.current
    target.current = null
    setSpinning(false)
    if (i == null || !real[i]) return
    setWinner(shown[i] ?? real[i])
    done.current(real[i], shown[i] ?? real[i])
  }

  const spin = () => {
    if (spinning || real.length === 0) return
    const n = real.length
    const a = 360 / n
    const i = randomIndex(n)
    const jitter = (Math.random() - 0.5) * a * 0.6
    const base = Math.ceil(rotation / 360) * 360 + 360 * (reduce ? 1 : 7)
    target.current = i
    setWinner(null)
    setSpinning(!reduce)
    setRotation(base + 360 - (i + 0.5) * a + jitter)
    if (reduce) window.setTimeout(finish, 50)
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className={cn('w-full', large ? 'max-w-[min(78vh,92vw)]' : 'max-w-md')}>
        <RaffleWheel names={shown} rotation={rotation} spinning={spinning} centre={centre} onSpinEnd={finish} />
      </div>
      <button
        type="button"
        onClick={spin}
        disabled={disabled || spinning || real.length === 0}
        className={cn(
          'mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-ink font-medium uppercase tracking-[0.2em] text-ivory shadow-soft transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50',
          large ? 'min-h-16 px-14 text-lg' : 'min-h-12 px-10 text-sm',
        )}
      >
        <Sparkles aria-hidden="true" className={large ? 'size-5' : 'size-4'} strokeWidth={1.6} />
        {spinning ? 'Spinning…' : 'Spin'}
      </button>
      <div aria-live="polite" className="mt-6 min-h-20 text-center">
        <AnimatePresence>
          {winner && (
            <motion.div key={winner + rotation} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-sm uppercase tracking-[0.3em] text-gold">Winner</p>
              <p className={cn('mt-1 font-serif text-ink', large ? 'text-6xl' : 'text-4xl')}>{winner}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

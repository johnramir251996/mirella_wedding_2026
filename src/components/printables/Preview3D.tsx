import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ENV } from '../../utils/printables'

const MM = 96 / 25.4 // CSS px per mm

/** Drag (mouse or finger) to turn the object in 3D. */
function useSpin(initial: { x: number; y: number }) {
  const [rot, setRot] = useState(initial)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const handlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      drag.current = { px: e.clientX, py: e.clientY, x: rot.x, y: rot.y }
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const d = drag.current
      if (!d) return
      setRot({ x: Math.max(-60, Math.min(60, d.x - (e.clientY - d.py) * 0.4)), y: d.y + (e.clientX - d.px) * 0.5 })
    },
    onPointerUp: () => {
      drag.current = null
    },
    onPointerCancel: () => {
      drag.current = null
    },
  }
  return { rot, setRot, handlers }
}

function Stage({ children, height, spin, hint }: { children: ReactNode; height: number; spin: ReturnType<typeof useSpin>; hint: string }) {
  return (
    <div
      {...spin.handlers}
      style={{
        position: 'relative',
        height,
        perspective: 1600,
        touchAction: 'none',
        cursor: 'grab',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 40%, var(--color-paper, #fff) 0%, var(--color-cream, #f3eee6) 75%)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* soft floor shadow */}
      <div style={{ position: 'absolute', left: '50%', bottom: '10%', width: '55%', height: 28, transform: 'translateX(-50%)', background: 'radial-gradient(ellipse, rgba(0,0,0,0.18), transparent 70%)', filter: 'blur(4px)' }} />
      {children}
      <p style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted, #8a847b)' }}>{hint}</p>
    </div>
  )
}

const face = (extra: CSSProperties = {}): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  overflow: 'hidden',
  ...extra,
})

// ---------------------------------------------------------------- envelope

interface EnvelopeProps {
  /** The flat envelope SVG (from envelopeSvg). */
  svg: string
  paper: string
  /** px per mm on screen */
  scale: number
  folded: boolean
  spin: ReturnType<typeof useSpin>
}

function EnvelopeModel({ svg, paper, scale: k, folded, spin }: EnvelopeProps) {
  const { W, H, side: s, top: tf, bottom: bf } = ENV
  const flatW = W + 2 * s
  // Each piece shows its own part of the printed sheet.
  const art = (x: number, y: number) => (
    <div style={{ position: 'absolute', left: -x * k, top: -y * k, width: flatW * k, height: (tf + H + bf) * k }}>
      <div style={{ width: flatW * MM, transform: `scale(${k / MM})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
  const plain: CSSProperties = { background: paper, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.12), inset 0 0 18px rgba(0,0,0,0.05)' }
  const t = (d: number) => `transform 0.8s cubic-bezier(0.22,1,0.36,1) ${d}s`
  // Fold order: sides → bottom → top.  Unfold in reverse.
  const delay = folded ? { side: 0, bottom: 0.55, top: 1.1 } : { side: 1.1, bottom: 0.55, top: 0 }

  const piece = (style: CSSProperties, clip: string, artXY: [number, number], backRotate: string) => (
    <div style={{ position: 'absolute', transformStyle: 'preserve-3d', ...style }}>
      <div style={face({ clipPath: clip })}>{art(...artXY)}</div>
      <div style={face({ clipPath: clip, transform: backRotate, ...plain })} />
    </div>
  )

  const a = (n: number, total: number) => `${(n / total) * 100}%`
  return (
    <div
      style={{
        position: 'relative',
        width: W * k,
        height: H * k,
        transformStyle: 'preserve-3d',
        transform: `rotateX(${spin.rot.x}deg) rotateY(${spin.rot.y}deg)`,
        transition: spin.rot.y % 180 === 0 ? 'transform 0.9s cubic-bezier(0.22,1,0.36,1)' : undefined,
      }}
    >
      {/* front panel */}
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        <div style={face()}>{art(s, tf)}</div>
        <div style={face({ transform: 'rotateY(180deg)', ...plain })} />
      </div>
      {/* side flaps (fold in first, so they sit closest to the front) */}
      {piece(
        { left: -s * k, top: 0, width: s * k, height: H * k, transformOrigin: 'right center', transform: `translateZ(${folded ? -0.4 : 0}px) rotateY(${folded ? -180 : 0}deg)`, transition: t(delay.side) },
        `polygon(100% 0%, 0% ${a(12, H)}, 0% ${a(H - 12, H)}, 100% 100%)`,
        [0, tf],
        'rotateY(180deg)',
      )}
      {piece(
        { left: W * k, top: 0, width: s * k, height: H * k, transformOrigin: 'left center', transform: `translateZ(${folded ? -0.4 : 0}px) rotateY(${folded ? 180 : 0}deg)`, transition: t(delay.side) },
        `polygon(0% 0%, 100% ${a(12, H)}, 100% ${a(H - 12, H)}, 0% 100%)`,
        [s + W, tf],
        'rotateY(180deg)',
      )}
      {/* bottom flap */}
      {piece(
        { left: 0, top: H * k, width: W * k, height: bf * k, transformOrigin: 'center top', transform: `translateZ(${folded ? -0.9 : 0}px) rotateX(${folded ? -180 : 0}deg)`, transition: t(delay.bottom) },
        `polygon(0% 0%, 100% 0%, ${a(W - 9, W)} 100%, ${a(9, W)} 100%)`,
        [s, tf + H],
        'rotateX(180deg)',
      )}
      {/* top flap (closes last, outermost) */}
      {piece(
        { left: 0, top: -tf * k, width: W * k, height: tf * k, transformOrigin: 'center bottom', transform: `translateZ(${folded ? -1.4 : 0}px) rotateX(${folded ? 180 : 0}deg)`, transition: t(delay.top) },
        `polygon(0% 100%, ${a(18, W)} 0%, ${a(W - 18, W)} 0%, 100% 100%)`,
        [s, 0],
        'rotateX(180deg)',
      )}
    </div>
  )
}

export function Envelope3D({ svg, paper, width }: { svg: string; paper: string; width: number }) {
  const [folded, setFolded] = useState(false)
  const spin = useSpin({ x: -14, y: -18 })
  const k = Math.max(0.9, Math.min(1.7, (width - 40) / (ENV.W + ENV.side * 2)))
  const showBack = () => spin.setRot((r) => ({ x: -10, y: Math.round(r.y / 180) * 180 + 180 }))
  return (
    <div>
      <Stage height={Math.max(360, (ENV.top + ENV.H + ENV.bottom) * k + 90)} spin={spin} hint="Drag to turn it around">
        <EnvelopeModel svg={svg} paper={paper} scale={k} folded={folded} spin={spin} />
      </Stage>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setFolded((f) => !f)} className="min-h-10 rounded-full bg-ink px-5 text-sm font-medium text-ivory shadow-soft transition hover:bg-ink-soft">
          {folded ? 'Unfold' : 'Fold it up'}
        </button>
        <button type="button" onClick={showBack} className="min-h-10 rounded-full border border-line bg-paper px-5 text-sm text-ink transition hover:bg-cream">
          Turn over
        </button>
        <button type="button" onClick={() => spin.setRot({ x: -14, y: -18 })} className="min-h-10 rounded-full px-4 text-sm text-muted transition hover:bg-cream">
          Reset view
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- invitation card

export function Card3D({ frontHtml, backHtml, widthMm, heightMm, width }: { frontHtml: string; backHtml: string; widthMm: number; heightMm: number; width: number }) {
  const spin = useSpin({ x: -8, y: -24 })
  const k = Math.max(1, Math.min(2.4, Math.min((width - 60) / widthMm, 520 / heightMm)))
  const content = (html: string) => (
    <div style={{ width: widthMm * MM, transform: `scale(${k / MM})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: html }} />
  )
  const turn = () => spin.setRot((r) => ({ x: -6, y: Math.round(r.y / 180) * 180 + 180 }))
  return (
    <div>
      <Stage height={heightMm * k + 100} spin={spin} hint="Drag to turn the card">
        <div
          style={{
            position: 'relative',
            width: widthMm * k,
            height: heightMm * k,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${spin.rot.x}deg) rotateY(${spin.rot.y}deg)`,
            transition: spin.rot.y % 180 === 0 ? 'transform 0.9s cubic-bezier(0.22,1,0.36,1)' : undefined,
          }}
        >
          <div style={face({ boxShadow: '0 1px 2px rgba(0,0,0,0.12)' })}>{content(frontHtml)}</div>
          <div style={face({ transform: 'rotateY(180deg)', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' })}>{content(backHtml)}</div>
        </div>
      </Stage>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={turn} className="min-h-10 rounded-full bg-ink px-5 text-sm font-medium text-ivory shadow-soft transition hover:bg-ink-soft">
          Turn over
        </button>
        <button type="button" onClick={() => spin.setRot({ x: -8, y: -24 })} className="min-h-10 rounded-full px-4 text-sm text-muted transition hover:bg-cream">
          Reset view
        </button>
      </div>
    </div>
  )
}

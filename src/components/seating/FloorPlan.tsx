import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import type { SeatingConfig, SeatingItem, SeatingTable } from '../../types/seating'
import { ITEM_KINDS } from '../../types/seating'
import { chairsFor, itemLocation } from '../../utils/seatingGeometry'
import { cn } from '../ui/cn'

export type ObjectKind = 'table' | 'item' | 'room'
export type DragAction = 'move' | 'resize' | 'rotate' | 'resize-tl'

export interface ChairInfo {
  name: string
  /** filled = someone sits here · you/party = Find My Seat highlight */
  state: 'filled' | 'you' | 'party'
}

interface Props {
  config: SeatingConfig
  tables: SeatingTable[]
  items: SeatingItem[]
  chair?: (tableId: string, index: number) => ChairInfo | null
  /** Admin: "4/10" under table names. */
  counts?: Map<string, number>
  highlightTableId?: string | null
  /** Softly fade every other table (guest view). */
  dimOthers?: boolean
  selected?: { kind: ObjectKind; id: string } | null
  editable?: boolean
  showNames?: boolean
  /** Current zoom, so handles stay the same size on screen. */
  zoom?: number
  svgRef?: Ref<SVGSVGElement>
  className?: string
  onObjectPointerDown?: (e: ReactPointerEvent, kind: ObjectKind, id: string, action: DragAction) => void
  onChairClick?: (tableId: string, index: number) => void
  onBackgroundPointerDown?: () => void
}

const kindLabel = (k: string) => ITEM_KINDS.find((x) => x.kind === k)?.label ?? 'Item'

export function FloorPlan({
  config,
  tables,
  items,
  chair,
  counts,
  highlightTableId,
  dimOthers,
  selected,
  editable,
  showNames,
  zoom = 1,
  svgRef,
  className,
  onObjectPointerDown,
  onChairClick,
  onBackgroundPointerDown,
}: Props) {
  const { room, canvas } = config
  const h = 9 / zoom // handle radius, constant on screen
  const isSel = (kind: ObjectKind, id: string) => selected?.kind === kind && selected.id === id
  const down = (kind: ObjectKind, id: string, action: DragAction) => (e: ReactPointerEvent) => {
    if (!editable || !onObjectPointerDown) return
    e.stopPropagation()
    onObjectPointerDown(e, kind, id, action)
  }

  const handles = (kind: ObjectKind, id: string, w: number, hgt: number, rotate: boolean) => (
    <g>
      <rect x={-w / 2 - 6} y={-hgt / 2 - 6} width={w + 12} height={hgt + 12} rx={8} className="fill-none stroke-gold" strokeDasharray="6 5" strokeWidth={1.5 / zoom} />
      <circle
        cx={w / 2 + 6}
        cy={hgt / 2 + 6}
        r={h}
        className="cursor-nwse-resize fill-paper stroke-gold"
        strokeWidth={2 / zoom}
        style={{ touchAction: 'none' }}
        onPointerDown={down(kind, id, 'resize')}
      >
        <title>Drag to resize</title>
      </circle>
      {rotate && (
        <>
          <line x1={0} y1={-hgt / 2 - 6} x2={0} y2={-hgt / 2 - 6 - 28 / zoom} className="stroke-gold" strokeWidth={1.5 / zoom} />
          <circle
            cx={0}
            cy={-hgt / 2 - 6 - 28 / zoom}
            r={h}
            className="cursor-grab fill-gold stroke-paper"
            strokeWidth={2 / zoom}
            style={{ touchAction: 'none' }}
            onPointerDown={down(kind, id, 'rotate')}
          >
            <title>Drag to rotate</title>
          </circle>
        </>
      )}
    </g>
  )

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      className={cn('block select-none', className)}
      role="img"
      aria-label="Seating plan of the venue"
      onPointerDown={() => onBackgroundPointerDown?.()}
    >
      <defs>
        <pattern id="fp-garden" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.6" className="fill-sage/35" />
          <circle cx="17" cy="16" r="1.2" className="fill-sage/25" />
        </pattern>
        <pattern id="fp-floor" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="15" height="15" className="fill-champagne-light/60" />
          <rect x="15" y="15" width="15" height="15" className="fill-champagne-light/60" />
        </pattern>
      </defs>

      {/* Outside area */}
      <rect width={canvas.width} height={canvas.height} className="fill-cream" />
      <rect width={canvas.width} height={canvas.height} fill="url(#fp-garden)" />
      <text x={24} y={40} className="fill-sage text-[18px] font-medium uppercase tracking-[0.3em]">
        Outside
      </text>

      {/* The hall */}
      <g>
        <rect x={room.x} y={room.y} width={room.width} height={room.height} className="fill-paper" />
        <rect
          x={room.x}
          y={room.y}
          width={room.width}
          height={room.height}
          className={cn('fill-none stroke-ink-soft/70', editable && 'cursor-move')}
          strokeWidth={6}
          style={editable ? { touchAction: 'none' } : undefined}
          onPointerDown={down('room', 'room', 'move')}
        />
        <rect x={room.x + 9} y={room.y + 9} width={room.width - 18} height={room.height - 18} className="pointer-events-none fill-none stroke-line" strokeWidth={1.5} />
        <text x={room.x + 22} y={room.y + 38} className="pointer-events-none fill-muted text-[16px] font-medium uppercase tracking-[0.3em]">
          Inside the hall
        </text>
        {editable && isSel('room', 'room') && (
          <g>
            <circle
              cx={room.x}
              cy={room.y}
              r={h}
              className="cursor-nwse-resize fill-paper stroke-gold"
              strokeWidth={2 / zoom}
              style={{ touchAction: 'none' }}
              onPointerDown={down('room', 'room', 'resize-tl')}
            />
            <circle
              cx={room.x + room.width}
              cy={room.y + room.height}
              r={h}
              className="cursor-nwse-resize fill-paper stroke-gold"
              strokeWidth={2 / zoom}
              style={{ touchAction: 'none' }}
              onPointerDown={down('room', 'room', 'resize')}
            />
          </g>
        )}
      </g>

      {/* Non-seat items */}
      {items.map((it) => {
        const outside = itemLocation(it, room) === 'outside'
        const label = it.label.trim() || kindLabel(it.kind)
        return (
          <g
            key={it.id}
            transform={`translate(${it.x} ${it.y}) rotate(${it.rotation})`}
            className={cn(dimOthers && 'opacity-70')}
          >
            <rect
              x={-it.width / 2}
              y={-it.height / 2}
              width={it.width}
              height={it.height}
              rx={it.kind === 'cake' ? it.width / 2 : 10}
              className={cn(
                it.kind === 'stage' ? 'fill-champagne-light stroke-gold' : it.kind === 'entrance' ? 'fill-paper stroke-ink-soft' : 'fill-paper stroke-champagne',
                editable && 'cursor-move',
              )}
              fill={it.kind === 'dance_floor' ? 'url(#fp-floor)' : undefined}
              strokeWidth={it.kind === 'stage' ? 2.5 : 1.8}
              strokeDasharray={it.kind === 'entrance' ? '8 6' : undefined}
              style={editable ? { touchAction: 'none' } : undefined}
              onPointerDown={down('item', it.id, 'move')}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y={outside ? -8 : 0}
              className="pointer-events-none fill-ink text-[15px] font-medium uppercase tracking-[0.18em]"
              transform={`rotate(${-it.rotation})`}
            >
              {label}
            </text>
            {outside && (
              <text textAnchor="middle" dominantBaseline="central" y={12} transform={`rotate(${-it.rotation})`} className="pointer-events-none fill-sage text-[11px] font-semibold uppercase tracking-[0.2em]">
                Outside
              </text>
            )}
            {editable && isSel('item', it.id) && handles('item', it.id, it.width, it.height, true)}
          </g>
        )
      })}

      {/* Tables */}
      {tables.map((t) => {
        const hl = highlightTableId === t.id
        const chairs = chairsFor(t)
        const count = counts?.get(t.id)
        return (
          <g key={t.id} className={cn(dimOthers && !hl && 'opacity-45')}>
            {/* chairs (canvas coordinates) */}
            {chairs.map((c, i) => {
              const info = chair?.(t.id, i) ?? null
              const outward = { x: c.x - t.x, y: c.y - t.y }
              const len = Math.hypot(outward.x, outward.y) || 1
              return (
                <g
                  key={i}
                  transform={`translate(${c.x} ${c.y})`}
                  className={cn(onChairClick && 'cursor-pointer')}
                  onPointerDown={(e) => onChairClick && e.stopPropagation()}
                  onClick={() => onChairClick?.(t.id, i)}
                >
                  <circle r={17} className="fill-transparent" />
                  <g transform={`rotate(${c.facing})`}>
                    <path
                      d="M-12 11 C-12 3 -7 1 0 1 C7 1 12 3 12 11 Z"
                      className={cn(
                        info?.state === 'you'
                          ? 'fill-gold stroke-gold'
                          : info?.state === 'party'
                            ? 'fill-champagne stroke-gold'
                            : info
                              ? 'fill-ink-soft stroke-ink-soft'
                              : 'fill-paper stroke-champagne',
                      )}
                      strokeWidth={1.6}
                    />
                    <circle
                      cy={-6}
                      r={6}
                      className={cn(
                        info?.state === 'you' ? 'fill-gold stroke-gold' : info?.state === 'party' ? 'fill-champagne stroke-gold' : info ? 'fill-ink-soft stroke-ink-soft' : 'fill-paper stroke-champagne',
                      )}
                      strokeWidth={1.6}
                    />
                  </g>
                  {info?.state === 'you' && <circle r={22} className="pointer-events-none fill-none stroke-gold motion-safe:animate-pulse" strokeWidth={2.5} />}
                  <title>{info ? info.name : `Chair ${i + 1} — empty`}</title>
                  {(showNames || info?.state === 'you' || info?.state === 'party') && info && (
                    <text
                      x={(outward.x / len) * 26}
                      y={(outward.y / len) * 26}
                      textAnchor={Math.abs(outward.x / len) < 0.35 ? 'middle' : outward.x > 0 ? 'start' : 'end'}
                      dominantBaseline="central"
                      className={cn('pointer-events-none text-[12px]', info.state === 'you' ? 'fill-ink font-semibold' : 'fill-ink-soft')}
                    >
                      {info.state === 'you' ? 'You' : info.name.split(' ')[0]}
                    </text>
                  )}
                </g>
              )
            })}
            {/* table top */}
            <g transform={`translate(${t.x} ${t.y}) rotate(${t.rotation})`}>
              {t.shape === 'round' ? (
                <ellipse
                  rx={t.width / 2}
                  ry={t.height / 2}
                  className={cn(hl ? 'fill-champagne-light stroke-gold' : 'fill-linen stroke-champagne', editable && 'cursor-move')}
                  strokeWidth={hl ? 3.5 : 2}
                  style={editable ? { touchAction: 'none' } : undefined}
                  onPointerDown={down('table', t.id, 'move')}
                />
              ) : (
                <rect
                  x={-t.width / 2}
                  y={-t.height / 2}
                  width={t.width}
                  height={t.height}
                  rx={8}
                  className={cn(hl ? 'fill-champagne-light stroke-gold' : 'fill-linen stroke-champagne', editable && 'cursor-move')}
                  strokeWidth={hl ? 3.5 : 2}
                  style={editable ? { touchAction: 'none' } : undefined}
                  onPointerDown={down('table', t.id, 'move')}
                />
              )}
              <g transform={`rotate(${-t.rotation})`} className="pointer-events-none">
                <text textAnchor="middle" dominantBaseline="central" y={count !== undefined ? -8 : 0} className="fill-ink font-serif text-[19px]">
                  {t.name}
                </text>
                {count !== undefined && (
                  <text textAnchor="middle" dominantBaseline="central" y={14} className={cn('text-[12px] tabular-nums', count >= t.capacity ? 'fill-gold' : 'fill-muted')}>
                    {count}/{t.capacity}
                  </text>
                )}
              </g>
              {editable && isSel('table', t.id) && handles('table', t.id, t.width, t.height, true)}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

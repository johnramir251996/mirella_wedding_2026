import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Maximize2, Plus, Search, Trash2, X } from 'lucide-react'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useToast } from '../hooks/useToast'
import {
  DEFAULT_RAFFLE,
  addRaffleDraw,
  deleteRaffleDraw,
  getRaffleDraws,
  getRafflePool,
  getRaffleSettings,
  maskName,
  namesMasked,
  saveRaffleSettings,
  wheelNames,
  type PoolName,
  type RaffleDraw,
  type RaffleSettings,
} from '../services/raffleService'
import { toFriendlyMessage } from '../utils/errors'
import { formatDateTime, fromManilaParts, monogram, toManilaParts } from '../utils/formatting'
import { siteBaseUrl } from '../utils/share'
import { PageHeader } from '../components/admin/PageHeader'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Skeleton } from '../components/ui/Skeleton'
import { cn } from '../components/ui/cn'
import { SpinStage } from '../components/raffle/RaffleWheel'

type Save = 'idle' | 'saving' | 'saved' | 'error'

export default function AdminRaffle() {
  const { settings } = useWeddingSettings()
  const toast = useToast()
  const [cfg, setCfg] = useState<RaffleSettings | null>(null)
  const [pool, setPool] = useState<PoolName[]>([])
  const [draws, setDraws] = useState<RaffleDraw[]>([])
  const [save, setSave] = useState<Save>('idle')
  const [prize, setPrize] = useState('')
  const [newName, setNewName] = useState('')
  const [query, setQuery] = useState('')
  const [present, setPresent] = useState(false)
  const [toRemove, setToRemove] = useState<RaffleDraw | null>(null)
  const [removing, setRemoving] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef<RaffleSettings>(DEFAULT_RAFFLE)

  useEffect(() => {
    document.title = 'Raffle · Wedding admin'
    Promise.all([getRaffleSettings(), getRafflePool(), getRaffleDraws()])
      .then(([c, p, d]) => {
        latest.current = c
        setCfg(c)
        setPool(p)
        setDraws(d)
      })
      .catch((e) => toast.error(toFriendlyMessage(e)))
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Saved shortly after each change.
  const update = (patch: Partial<RaffleSettings>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setCfg(next)
    setSave('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      saveRaffleSettings(latest.current)
        .then(() => setSave('saved'))
        .catch(() => setSave('error'))
    }, 600)
  }

  const names = useMemo(() => (cfg ? wheelNames(cfg, pool, draws) : []), [cfg, pool, draws])
  const masked = cfg ? namesMasked(cfg.mask, settings?.weddingDate) : true
  const shown = useMemo(() => (masked ? names.map(maskName) : names), [names, masked])

  // Every name that could be on the wheel, for ticking names on or off.
  const candidates = useMemo(() => {
    if (!cfg) return []
    const seen = new Set<string>()
    const list: { name: string; extra: boolean }[] = []
    for (const p of pool) {
      if ((cfg.pool !== 'all' && p.side !== cfg.pool) || (cfg.attendingOnly && !p.attending)) continue
      const k = p.name.trim().toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      list.push({ name: p.name.trim(), extra: false })
    }
    for (const n of cfg.extraNames) {
      const k = n.trim().toLowerCase()
      if (!seen.has(k)) {
        seen.add(k)
        list.push({ name: n.trim(), extra: true })
      }
    }
    const q = query.trim().toLowerCase()
    return list.filter((x) => !q || x.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))
  }, [cfg, pool, query])

  const isExcluded = (n: string) => Boolean(cfg?.excluded.some((x) => x.toLowerCase() === n.toLowerCase()))
  const toggleExcluded = (n: string) => {
    if (!cfg) return
    update({ excluded: isExcluded(n) ? cfg.excluded.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...cfg.excluded, n] })
  }
  const addName = () => {
    const n = newName.trim().replace(/\s+/g, ' ').slice(0, 150)
    if (!n || !cfg) return
    if (!cfg.extraNames.some((x) => x.toLowerCase() === n.toLowerCase())) update({ extraNames: [...cfg.extraNames, n] })
    setNewName('')
  }

  const onWinner = useCallback(
    async (real: string) => {
      try {
        const d = await addRaffleDraw(real, prize)
        setDraws((list) => [d, ...list])
        setPrize('')
      } catch (e) {
        toast.error(toFriendlyMessage(e))
      }
    },
    [prize, toast],
  )

  const confirmRemove = async () => {
    if (!toRemove) return
    setRemoving(true)
    try {
      await deleteRaffleDraw(toRemove.id)
      setDraws((list) => list.filter((d) => d.id !== toRemove.id))
      setToRemove(null)
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setRemoving(false)
    }
  }

  const fromParts = cfg?.from ? toManilaParts(cfg.from) : { date: '', time: '' }
  const publicUrl = `${siteBaseUrl()}#/raffle`
  const centre = settings ? monogram(settings.coupleNames, '&') : ''

  return (
    <>
      <PageHeader
        title="Raffle"
        description="A prize wheel the host spins at the reception. Winners are saved here."
        actions={
          <Button variant="outline" onClick={() => setPresent(true)} disabled={!names.length} icon={<Maximize2 aria-hidden="true" className="size-4" />}>
            Present
          </Button>
        }
      />
      {!cfg ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-5">
            <p className="text-xs text-muted" aria-live="polite">
              {save === 'saving' ? 'Saving…' : save === 'saved' ? 'All changes saved' : save === 'error' ? 'Couldn’t save — please try again' : 'Changes save as you go'}
            </p>

            <section className="space-y-3 rounded-xl border border-line bg-paper p-5 shadow-soft">
              <h2 className="text-xl text-ink">Raffle page on the website</h2>
              <select className="input-base" value={cfg.mode} onChange={(e) => update({ mode: e.target.value as RaffleSettings['mode'] })} aria-label="Raffle page visibility">
                <option value="hidden">Hidden</option>
                <option value="visible">Visible</option>
                <option value="scheduled">Visible from a date</option>
              </select>
              {cfg.mode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="input-base"
                    aria-label="From date"
                    value={fromParts.date}
                    onChange={(e) => update({ from: e.target.value ? fromManilaParts(e.target.value, fromParts.time || '00:00') : null })}
                  />
                  <input
                    type="time"
                    className="input-base"
                    aria-label="From time"
                    value={fromParts.time}
                    onChange={(e) => fromParts.date && update({ from: fromManilaParts(fromParts.date, e.target.value || '00:00') })}
                  />
                </div>
              )}
              <p className="text-xs text-muted">Guests see the wheel only — they can’t spin it. Philippine time.</p>
              {cfg.mode !== 'hidden' && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-gold underline-offset-4 hover:underline">
                  <ExternalLink aria-hidden="true" className="size-3.5" /> Open the raffle page
                </a>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-line bg-paper p-5 shadow-soft">
              <h2 className="text-xl text-ink">Names on the wheel</h2>
              <select className="input-base" value={cfg.pool} onChange={(e) => update({ pool: e.target.value as RaffleSettings['pool'] })} aria-label="Whose names">
                <option value="all">All guests</option>
                <option value="groom">Groom’s side only</option>
                <option value="bride">Bride’s side only</option>
              </select>
              <Toggle label="Attending guests only" hint="Only guests who confirmed they’re coming." checked={cfg.attendingOnly} onChange={(v) => update({ attendingOnly: v })} />
              <Toggle label="Take winners off the wheel" hint="So no one wins twice." checked={cfg.removeWinners} onChange={(v) => update({ removeWinners: v })} />
            </section>

            <section className="space-y-3 rounded-xl border border-line bg-paper p-5 shadow-soft">
              <h2 className="text-xl text-ink">Hide names</h2>
              <select className="input-base" value={cfg.mask} onChange={(e) => update({ mask: e.target.value as RaffleSettings['mask'] })} aria-label="Name masking">
                <option value="auto">Masked until the wedding day</option>
                <option value="on">Always masked</option>
                <option value="off">Show full names</option>
              </select>
              <p className="text-xs text-muted">
                Masked names look like <span className="font-medium text-ink-soft">{maskName('Rina Gaspar')}</span>. {masked ? 'Names are masked right now' : 'Full names are shown right now'} — on the website and in
                Present. This page always shows full names to you.
              </p>
            </section>

            <section className="space-y-3 rounded-xl border border-line bg-paper p-5 shadow-soft">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xl text-ink">Who’s in</h2>
                <span className="text-sm text-muted">{names.length} on the wheel</span>
              </div>
              <div className="flex gap-2">
                <input
                  className="input-base min-w-0 flex-1"
                  placeholder="Add a name"
                  value={newName}
                  maxLength={150}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addName())}
                  aria-label="Add a name to the wheel"
                />
                <Button variant="outline" onClick={addName} disabled={!newName.trim()} icon={<Plus aria-hidden="true" className="size-4" />}>
                  Add
                </Button>
              </div>
              <label className="relative block">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input className="input-base pl-9" placeholder="Search names" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search names" />
              </label>
              <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                {candidates.map((c) => (
                  <li key={c.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input type="checkbox" className="size-4 accent-ink" checked={!isExcluded(c.name)} onChange={() => toggleExcluded(c.name)} />
                      <span className={cn('truncate', isExcluded(c.name) ? 'text-muted line-through' : 'text-ink')}>{c.name}</span>
                    </label>
                    {c.extra && (
                      <button
                        type="button"
                        onClick={() => update({ extraNames: cfg.extraNames.filter((x) => x.toLowerCase() !== c.name.toLowerCase()) })}
                        aria-label={`Remove ${c.name}`}
                        className="rounded p-1 text-muted hover:bg-cream hover:text-ink"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
                {candidates.length === 0 && <li className="px-3 py-3 text-sm text-muted">No names match.</li>}
              </ul>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-8">
              <label className="mx-auto mb-6 block max-w-md text-sm text-ink-soft">
                Prize for this spin (optional)
                <input className="input-base mt-2" value={prize} maxLength={150} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. Coffee maker" />
              </label>
              <SpinStage shown={names} real={names} centre={centre} onWinner={onWinner} />
            </section>

            <section className="rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
              <h2 className="text-xl text-ink">Winners</h2>
              {draws.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No winners yet. Each spin is saved here.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {draws.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{d.name}</p>
                        <p className="text-xs text-muted">
                          {d.prize ? `${d.prize} · ` : ''}
                          {formatDateTime(d.drawnAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setToRemove(d)}
                        aria-label={`Remove ${d.name} from the winners`}
                        className="rounded p-1.5 text-muted transition hover:bg-rose/10 hover:text-rose"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {present &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto bg-ivory px-6 py-10" role="dialog" aria-modal="true" aria-label="Raffle">
            <button
              type="button"
              onClick={() => setPresent(false)}
              className="absolute right-5 top-5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-muted transition hover:bg-cream hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" /> Close
            </button>
            {settings && <p className="mb-6 font-serif text-3xl text-ink-soft">{settings.coupleNames}</p>}
            {prize.trim() && <p className="mb-4 text-lg uppercase tracking-[0.3em] text-gold">{prize.trim()}</p>}
            <SpinStage shown={shown} real={names} centre={centre} large onWinner={onWinner} />
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        title="Remove this winner?"
        message={`${toRemove?.name ?? 'This winner'} will be removed from the winners${cfg?.removeWinners ? ' and go back on the wheel' : ''}. This can’t be undone.`}
        confirmLabel="Remove"
        destructive
        loading={removing}
        loadingText="Removing…"
        onCancel={() => !removing && setToRemove(null)}
        onConfirm={confirmRemove}
      />
    </>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 text-sm text-ink-soft">
      <span>
        <span className="font-medium text-ink">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" />
    </label>
  )
}

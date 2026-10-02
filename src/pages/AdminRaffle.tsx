import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Maximize2, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useToast } from '../hooks/useToast'
import {
  DEFAULT_RAFFLE,
  addRaffleDraw,
  deleteRaffleDraw,
  getRaffleDraws,
  getRafflePool,
  getRaffleRound,
  getRaffleSettings,
  maskName,
  namesMasked,
  ordinal,
  saveRaffleRound,
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
import { QUICK_SPIN_MS, SLOW_SPIN_MS, SoundControls, SpinStage, type Outcome } from '../components/raffle/RaffleWheel'

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
  // Last one standing: names knocked out in this round, and auto-play.
  const [eliminated, setEliminated] = useState<string[]>([])
  const [autoPlay, setAutoPlay] = useState(false)
  const [askNewRound, setAskNewRound] = useState(false)
  const autoRef = useRef(false)
  const remainingRef = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef<RaffleSettings>(DEFAULT_RAFFLE)

  useEffect(() => {
    document.title = 'Raffle · Wedding admin'
    Promise.all([getRaffleSettings(), getRafflePool(), getRaffleDraws(), getRaffleRound()])
      .then(([c, p, d, r]) => {
        latest.current = c
        setCfg(c)
        setPool(p)
        setDraws(d)
        setEliminated(r)
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

  const lastMode = cfg?.drawMode === 'last'
  const allNames = useMemo(() => (cfg ? wheelNames(cfg, pool, draws) : []), [cfg, pool, draws])
  // Last one standing: who's still in this round.
  const names = useMemo(() => {
    if (!lastMode) return allNames
    const out = new Set(eliminated.map((x) => x.toLowerCase()))
    return allNames.filter((n) => !out.has(n.toLowerCase()))
  }, [allNames, eliminated, lastMode])
  const masked = cfg ? namesMasked(cfg.mask, settings?.weddingDate) : true
  const shown = useMemo(() => (masked ? names.map(maskName) : names), [names, masked])
  const display = (n: string) => (masked ? maskName(n) : n)
  const roundDone = lastMode && eliminated.length > 0 && names.length <= 1
  const finalsAt = cfg?.finalsAt ?? 5
  const spinMs = lastMode && names.length > finalsAt ? QUICK_SPIN_MS : SLOW_SPIN_MS
  useEffect(() => {
    autoRef.current = autoPlay
  }, [autoPlay])
  useEffect(() => {
    remainingRef.current = names.length
  }, [names.length])

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

  const save1 = async (name: string, p: string, place: number | null) => {
    try {
      const d = await addRaffleDraw(name, p, place)
      setDraws((list) => [d, ...list])
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    }
  }

  const onLanded = useCallback(
    async (real: string, shownName: string): Promise<Outcome | null> => {
      if (!cfg) return null
      if (cfg.drawMode !== 'last') {
        // First spin wins.
        await save1(real, prize, null)
        const p = prize.trim()
        setPrize('')
        return { tone: 'winner', title: 'Winner', name: shownName, detail: p || undefined }
      }
      // Last one standing: the name landed on is out.
      const remaining = names.length
      const place = remaining >= 2 && remaining <= cfg.consolations + 1 ? remaining : null
      const nextOut = [...eliminated, real]
      setEliminated(nextOut)
      remainingRef.current = remaining - 1
      saveRaffleRound(nextOut).catch(() => toast.error('The round couldn’t be saved — keep this page open.'))
      const placePrize = place ? (cfg.prizes[place - 1] ?? '').trim() : ''
      if (place) await save1(real, placePrize, place)
      let then: Outcome | undefined
      if (remaining - 1 === 1) {
        const last = names.find((n) => n !== real) ?? ''
        const winPrize = (cfg.prizes[0] ?? '').trim()
        if (last) {
          await save1(last, winPrize, 1)
          then = { tone: 'winner', title: 'Winner — last one standing', name: display(last), detail: winPrize || undefined }
        }
      }
      return place
        ? { tone: 'place', title: `${ordinal(place)} place`, name: shownName, detail: placePrize || undefined, then }
        : { tone: 'out', title: 'Out', name: shownName, detail: `${remaining - 1} left`, then }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg, prize, names, eliminated, masked],
  )

  const startNewRound = async () => {
    setAskNewRound(false)
    setEliminated([])
    setAutoPlay(false)
    try {
      await saveRaffleRound([])
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    }
  }
  useEffect(() => {
    if (!present) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPresent(false)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [present])
  const keepAutoPlaying = useCallback(() => autoRef.current && remainingRef.current > (latest.current.finalsAt ?? 5), [])

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
          <Button variant="outline" onClick={() => setPresent(true)} disabled={!allNames.length} icon={<Maximize2 aria-hidden="true" className="size-4" />}>
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
              <h2 className="text-xl text-ink">How the raffle works</h2>
              {(
                [
                  ['first', 'First spin wins', 'The name the wheel lands on wins.'],
                  ['last', 'Last one standing', 'Each spin knocks a name out; the last name left wins.'],
                ] as const
              ).map(([id, label, hint]) => (
                <label key={id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm has-[:checked]:border-champagne has-[:checked]:bg-champagne-light/30">
                  <input type="radio" name="draw-mode" className="mt-0.5 size-4 accent-ink" checked={cfg.drawMode === id} onChange={() => update({ drawMode: id })} />
                  <span>
                    <span className="font-medium text-ink">{label}</span>
                    <span className="mt-0.5 block text-muted">{hint}</span>
                  </span>
                </label>
              ))}
              {cfg.drawMode === 'last' && (
                <div className="space-y-3 pt-1">
                  <label className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                    <span>
                      <span className="font-medium text-ink">Consolation prizes</span>
                      <span className="block text-xs text-muted">The last names knocked out before the winner.</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="input-base w-20 text-center"
                      value={cfg.consolations}
                      onChange={(e) => update({ consolations: Math.min(10, Math.max(0, Math.round(Number(e.target.value)) || 0)) })}
                    />
                  </label>
                  <div className="space-y-2">
                    {Array.from({ length: cfg.consolations + 1 }, (_, i) => (
                      <label key={i} className="flex items-center gap-3 text-sm text-ink-soft">
                        <span className="w-20 shrink-0 font-medium text-ink">{i === 0 ? 'Winner' : `${ordinal(i + 1)} place`}</span>
                        <input
                          className="input-base min-w-0 flex-1"
                          placeholder="Prize (optional)"
                          maxLength={150}
                          value={cfg.prizes[i] ?? ''}
                          onChange={(e) => {
                            const prizes = [...cfg.prizes]
                            while (prizes.length <= i) prizes.push('')
                            prizes[i] = e.target.value
                            update({ prizes })
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                    <span>
                      <span className="font-medium text-ink">Full spins from the last</span>
                      <span className="block text-xs text-muted">Quick spins until this many names are left.</span>
                    </span>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      className="input-base w-20 text-center"
                      value={cfg.finalsAt}
                      onChange={(e) => update({ finalsAt: Math.min(20, Math.max(2, Math.round(Number(e.target.value)) || 5)) })}
                    />
                  </label>
                </div>
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
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <SoundControls />
                {lastMode && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                    <span>
                      {roundDone ? (
                        'Round complete'
                      ) : (
                        <>
                          <span className="font-medium text-ink">{names.length}</span> left{names.length > finalsAt ? ` · full spins from ${finalsAt}` : ' · finals'}
                        </>
                      )}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className="size-4 accent-ink" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
                      Auto-play to the finals
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => setAskNewRound(true)} disabled={!eliminated.length} icon={<RotateCcw aria-hidden="true" className="size-3.5" />}>
                      New round
                    </Button>
                  </div>
                )}
              </div>
              {!lastMode && (
                <label className="mx-auto mb-6 block max-w-md text-sm text-ink-soft">
                  Prize for this spin (optional)
                  <input className="input-base mt-2" value={prize} maxLength={150} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. Coffee maker" />
                </label>
              )}
              {/* The same wheel expands to full screen for Present — a spin carries on smoothly. */}
              <div
                className={present ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto bg-ivory px-6 py-10' : undefined}
                role={present ? 'dialog' : undefined}
                aria-modal={present || undefined}
                aria-label={present ? 'Raffle' : undefined}
              >
                {present && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPresent(false)}
                      className="absolute right-5 top-5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-muted transition hover:bg-cream hover:text-ink"
                    >
                      <X aria-hidden="true" className="size-4" /> Close
                    </button>
                    {settings && <p className="mb-4 font-serif text-3xl text-ink-soft">{settings.coupleNames}</p>}
                    {!lastMode && prize.trim() && <p className="mb-4 text-lg uppercase tracking-[0.3em] text-gold">{prize.trim()}</p>}
                    {lastMode && <p className="mb-4 text-lg uppercase tracking-[0.3em] text-gold">{roundDone ? 'We have a winner' : `${names.length} left`}</p>}
                  </>
                )}
                {roundDone && !present && <p className="mb-4 text-center text-sm text-muted">This round is complete. Start a new round to spin again.</p>}
                <SpinStage
                  shown={present ? shown : names}
                  real={names}
                  centre={centre}
                  large={present}
                  durationMs={spinMs}
                  disabled={roundDone}
                  autoPlay={keepAutoPlaying}
                  spinLabel={lastMode && names.length > finalsAt ? 'Quick spin' : 'Spin'}
                  onLanded={onLanded}
                />
                {present && <SoundControls className="mt-2" />}
              </div>
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
                        <p className="truncate font-medium text-ink">
                          {d.place && <span className="mr-2 text-xs uppercase tracking-[0.2em] text-gold">{d.place === 1 ? 'Winner' : `${ordinal(d.place)} place`}</span>}
                          {d.name}
                        </p>
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


      <ConfirmDialog
        open={askNewRound}
        title="Start a new round?"
        message="Everyone knocked out comes back on the wheel. Winners already saved stay in the winners list."
        confirmLabel="New round"
        onCancel={() => setAskNewRound(false)}
        onConfirm={() => void startNewRound()}
      />

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

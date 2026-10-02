import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAdminPreference, getAdminPreference, saveAdminPreference } from '../services/preferencesService'
import type { CardSize, Paper } from '../utils/printables'
import type { StyleId } from '../theme/themes'

/** Everything on the Printables page that's remembered between visits (not the guest selection). */
export interface PrintablePrefs {
  paper: Paper
  /** null = follow the website's design style. */
  design: StyleId | null
  size: CardSize
  qrPlace: 'back' | 'front'
  /** "Good to know" sections ticked for the back; null = the first three. */
  backIds: string[] | null
  /** Sections whose title prints in bold. */
  boldIds: string[]
  printSide: 'front' | 'back' | 'both'
  showPositions: boolean
  rotateBacks: boolean
  envelopeQr: boolean
  /** Details printed on the front (the rest re-centres when some are off). */
  showCeremony: boolean
  showReception: boolean
  showRespondBy: boolean
  showWithNames: boolean
}

export const DEFAULT_PRINTABLE_PREFS: PrintablePrefs = {
  paper: 'a4',
  design: null,
  size: '5x7',
  qrPlace: 'back',
  backIds: null,
  boldIds: [],
  printSide: 'front',
  showPositions: true,
  rotateBacks: false,
  envelopeQr: true,
  showCeremony: true,
  showReception: true,
  showRespondBy: true,
  showWithNames: true,
}

const KEY = 'printables'
export type SaveState = 'loading' | 'idle' | 'saving' | 'saved' | 'error'

/**
 * Loads the saved Printables setup and saves every change shortly after it's made
 * (stored in the database, so it's the same on every device).
 */
export function usePrintablePrefs() {
  const [prefs, setPrefs] = useState<PrintablePrefs>(DEFAULT_PRINTABLE_PREFS)
  const [state, setState] = useState<SaveState>('loading')
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef(prefs)

  useEffect(() => {
    let alive = true
    getAdminPreference<Partial<PrintablePrefs>>(KEY)
      .then((saved) => {
        if (!alive) return
        const next = { ...DEFAULT_PRINTABLE_PREFS, ...(saved ?? {}) }
        latest.current = next
        setPrefs(next)
        setState(saved ? 'saved' : 'idle')
      })
      .catch(() => alive && setState('idle'))
    return () => {
      alive = false
      window.clearTimeout(timer.current)
    }
  }, [])

  const update = useCallback((patch: Partial<PrintablePrefs>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setPrefs(next)
    setState('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      saveAdminPreference(KEY, latest.current)
        .then(() => setState('saved'))
        .catch(() => setState('error'))
    }, 700)
  }, [])

  const reset = useCallback(async () => {
    window.clearTimeout(timer.current)
    latest.current = DEFAULT_PRINTABLE_PREFS
    setPrefs(DEFAULT_PRINTABLE_PREFS)
    try {
      await deleteAdminPreference(KEY)
      setState('idle')
    } catch {
      setState('error')
    }
  }, [])

  return { prefs, update, reset, state }
}

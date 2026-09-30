import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useInvitation } from '../hooks/useInvitation'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useRsvpQuestions } from '../hooks/useRsvpQuestions'
import { submitRSVP } from '../services/rsvpService'
import type { AttendanceStatus, RSVPFormState } from '../types/rsvp'
import type { PublicGift } from '../types/wedding'
import { isRsvpOpen } from '../services/settingsService'
import { getInvitationGift } from '../services/giftService'
import { GiftCard } from '../components/wedding/GiftCard'
import { PageLoader } from '../components/ui/Spinner'
import { CalendarClock } from 'lucide-react'
import { RsvpClosedError, toFriendlyMessage } from '../utils/errors'
import { formatDeadlineDate, formatWeddingDate } from '../utils/formatting'
import { toSubmission } from '../utils/validation'
import { SearchForm } from '../components/rsvp/SearchForm'
import { InvitationFound } from '../components/rsvp/InvitationFound'
import { EnvelopeAnimation } from '../components/rsvp/EnvelopeAnimation'
import { RSVPForm } from '../components/rsvp/RSVPForm'
import { EMPTY_RSVP } from '../components/rsvp/rsvpDefaults'
import { SuccessState } from '../components/rsvp/SuccessState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Ornament } from '../components/ui/Ornament'
import { PublicHeader } from '../components/wedding/PublicHeader'
import { Footer } from '../components/wedding/Footer'
import { CoupleNames } from '../components/wedding/CoupleNames'

type Step = 'search' | 'found' | 'opening' | 'form' | 'success'

const FALLBACK = { coupleNames: 'Mir & Ella', weddingDate: '2026-12-19' }

export default function RSVP() {
  const { settings, loading: settingsLoading } = useWeddingSettings()
  const { questions } = useRsvpQuestions()
  const { status, invitation, error, searchByName, searchByCode, reset } = useInvitation()
  const [params] = useSearchParams()
  const reduce = useReducedMotion()

  const [step, setStep] = useState<Step>('search')
  const [form, setForm] = useState<RSVPFormState>(EMPTY_RSVP)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: AttendanceStatus; guests: number } | null>(null)
  const [closedByServer, setClosedByServer] = useState(false)
  const [gift, setGift] = useState<PublicGift | null>(null)
  const submittingRef = useRef(false)

  const coupleNames = settings?.coupleNames ?? FALLBACK.coupleNames
  const weddingDate = settings?.weddingDate ?? FALLBACK.weddingDate

  useEffect(() => {
    document.title = `RSVP · ${coupleNames}`
  }, [coupleNames])

  // Future-ready personal links: /#/rsvp?invite=abc123
  const inviteCode = params.get('invite')
  useEffect(() => {
    if (!inviteCode) return
    setForm(EMPTY_RSVP)
    setSubmitError(null)
    setResult(null)
    setStep('search')
    void searchByCode(inviteCode)
  }, [inviteCode, searchByCode])

  // Move to the "found" state whenever a lookup succeeds.
  useEffect(() => {
    if (status === 'found' && invitation) setStep((s) => (s === 'search' ? 'found' : s))
  }, [status, invitation])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [step, reduce])

  const startOver = useCallback(() => {
    reset()
    setForm(EMPTY_RSVP)
    setSubmitError(null)
    setResult(null)
    setStep('search')
  }, [reset])

  const handleConfirm = async () => {
    if (!invitation || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = toSubmission(invitation.invitationId, form, invitation.maxAdditionalGuests, settings?.rsvpConfig, questions)
      const saved = await submitRSVP(payload)
      setConfirmOpen(false)
      setResult({ status: saved.attendanceStatus, guests: payload.additionalGuests.length })
      setStep('success')
      getInvitationGift(invitation.invitationId).then(setGift)
    } catch (e) {
      setConfirmOpen(false)
      if (e instanceof RsvpClosedError) setClosedByServer(true)
      else setSubmitError(toFriendlyMessage(e))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const rsvpClosed = closedByServer || (settings ? !isRsvpOpen(settings) : false)
  const deadline = settings?.rsvpOpen ? settings.rsvpDeadline : null

  const pageMotion = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }

  return (
    <div className="flex min-h-[100svh] flex-col">
      <PublicHeader />

      <main className="flex flex-1 flex-col px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {settingsLoading && !settings ? (
          <PageLoader />
        ) : rsvpClosed && step !== 'success' ? (
          <section aria-labelledby="closed-heading" className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-serif text-2xl font-light text-ink-soft">
              <CoupleNames names={coupleNames} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.34em] text-muted">{formatWeddingDate(weddingDate)}</p>
            <Ornament className="mt-7" />
            <h1 id="closed-heading" className="mt-7 text-[2.3rem] leading-tight text-ink sm:text-5xl">
              RSVPs are closed
            </h1>
            <p className="mx-auto mt-5 max-w-md whitespace-pre-line font-serif text-xl italic leading-relaxed text-ink-soft">
              {settings?.rsvpClosedMessage || 'Our RSVP list is now closed. Thank you so much!'}
            </p>
          </section>
        ) : (
        <AnimatePresence mode="wait">
          {step === 'search' && (
            <motion.section key="search" {...pageMotion} aria-labelledby="search-heading" className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-10 text-center">
                <p className="font-serif text-2xl font-light text-ink-soft">
                  <CoupleNames names={coupleNames} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.34em] text-muted">{formatWeddingDate(weddingDate)}</p>
                <Ornament className="mt-7" />
                <h1 id="search-heading" className="mt-7 text-[2.5rem] leading-tight text-ink sm:text-5xl">
                  Search Your Invitation
                </h1>
                {deadline && (
                  <p className="mx-auto mt-5 inline-flex items-center gap-2 text-sm text-ink-soft">
                    <CalendarClock aria-hidden="true" className="size-4 text-gold" strokeWidth={1.5} />
                    Kindly respond by {formatDeadlineDate(deadline)}
                  </p>
                )}
              </div>
              <SearchForm onSearch={searchByName} searching={status === 'searching'} error={status === 'not_found' || status === 'error' ? error : null} />
            </motion.section>
          )}

          {step === 'found' && invitation && (
            <motion.section key="found" {...pageMotion} className="flex flex-1 items-center justify-center">
              <InvitationFound invitation={invitation} onOpen={() => setStep('opening')} onReset={startOver} />
            </motion.section>
          )}

          {step === 'opening' && invitation && (
            <motion.section key="opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <EnvelopeAnimation
                guestName={invitation.inviteeName}
                tableNumber={invitation.tableNumber}
                includedGuests={invitation.includedGuests}
                coupleNames={coupleNames}
                weddingDate={weddingDate}
                onComplete={() => setStep('form')}
              />
            </motion.section>
          )}

          {step === 'form' && invitation && (
            <motion.section key="form" {...pageMotion}>
              <RSVPForm
                invitation={invitation}
                form={form}
                onChange={setForm}
                onRequestConfirm={() => {
                  setSubmitError(null)
                  setConfirmOpen(true)
                }}
                submitting={submitting}
                submitError={submitError}
                config={settings?.rsvpConfig}
                questions={questions}
              />
              <p className="mt-8 text-center">
                <button type="button" onClick={startOver} className="rounded px-3 py-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                  Not you? Search again
                </button>
              </p>
            </motion.section>
          )}

          {step === 'success' && invitation && result && (
            <motion.section key="success" {...pageMotion} className="flex flex-1 flex-col items-center justify-center gap-10">
              <SuccessState
                status={result.status}
                guestName={invitation.inviteeName}
                coupleNames={coupleNames}
                weddingDate={weddingDate}
                requestedGuests={result.guests}
              />
              {gift && <GiftCard gift={gift} />}
            </motion.section>
          )}
        </AnimatePresence>
        )}
      </main>

      {step !== 'opening' && <Footer coupleNames={coupleNames} weddingDate={weddingDate} closingMessage={settings?.closingMessage} />}

      <ConfirmDialog
        open={confirmOpen}
        tone="wedding"
        title="Are you sure?"
        message="Your RSVP will be recorded using the information you provided."
        cancelLabel="Cancel"
        confirmLabel="Confirm Response"
        loading={submitting}
        loadingText="Saving your RSVP..."
        onCancel={() => !submitting && setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  )
}

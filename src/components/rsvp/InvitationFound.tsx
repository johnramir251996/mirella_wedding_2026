import { motion, useReducedMotion } from 'framer-motion'
import { MailOpen } from 'lucide-react'
import type { InvitationLookup } from '../../types/rsvp'
import { formatTable } from '../../utils/formatting'
import { Button } from '../ui/Button'
import { Ornament } from '../ui/Ornament'

interface Props {
  invitation: InvitationLookup
  onOpen: () => void
}

export function InvitationFound({ invitation, onOpen }: Props) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fine-frame paper-texture mx-auto w-full max-w-md rounded-sm px-7 py-12 text-center shadow-card sm:px-10"
      aria-live="polite"
    >
      <p className="eyebrow">Your Invitation Has Arrived</p>
      <Ornament className="mt-6" />
      <h2 className="mt-7 text-[2.4rem] leading-tight text-ink">{invitation.inviteeName}</h2>
      <div className="mx-auto mt-5 inline-flex flex-col items-center rounded-lg border border-champagne/60 bg-champagne-light/35 px-6 py-3">
        <span className="text-[0.62rem] font-medium uppercase tracking-[0.3em] text-gold">Your table</span>
        <span className="mt-0.5 font-serif text-[1.7rem] leading-tight text-ink">{formatTable(invitation.tableNumber)}</span>
      </div>
      <div className="relative z-10 mt-10 flex flex-col items-center gap-3">
        <Button size="lg" onClick={onOpen} icon={<MailOpen aria-hidden="true" className="size-5" strokeWidth={1.5} />} fullWidth autoFocus>
          Open Invitation
        </Button>
      </div>
    </motion.div>
  )
}

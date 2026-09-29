import type { ReactNode } from 'react'
import { cn } from './cn'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  /** Hide from the stacked mobile card view (e.g. when shown in the card title). */
  hideOnMobile?: boolean
}

interface ResponsiveTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  caption: string
  mobileTitle: (row: T) => ReactNode
  mobileActions?: (row: T) => ReactNode
  empty?: ReactNode
}

/** A real <table> on md+ screens and stacked cards on phones — never overflows the page. */
export function ResponsiveTable<T>({ rows, columns, rowKey, caption, mobileTitle, mobileActions, empty }: ResponsiveTableProps<T>) {
  if (!rows.length) {
    return <div className="px-6 py-16 text-center text-muted">{empty ?? 'Nothing to show yet.'}</div>
  }
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-ivory/70">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line/60 align-top transition-colors last:border-0 hover:bg-ivory/60">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3.5 text-ink-soft', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line/70 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-4 py-4">
            <div className="mb-3 font-medium text-ink">{mobileTitle(row)}</div>
            <dl className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="text-muted">{c.header}</dt>
                    <dd className="min-w-0 break-words text-ink-soft">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
            {mobileActions && <div className="mt-3 flex flex-wrap gap-2">{mobileActions(row)}</div>}
          </li>
        ))}
      </ul>
    </>
  )
}

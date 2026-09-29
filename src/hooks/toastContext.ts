import { createContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void
  success: (message: string) => void
  error: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

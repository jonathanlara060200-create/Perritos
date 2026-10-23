'use client'

import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'

/** Botón de envío que pide confirmación antes de mandar el formulario. */
export function ConfirmButton({
  children,
  message,
  className = 'btn-outline btn-sm',
  pendingText = 'Borrando…',
}: {
  children: React.ReactNode
  message: string
  className?: string
  pendingText?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(className)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {pending ? pendingText : children}
    </button>
  )
}

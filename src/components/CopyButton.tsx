'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn-soft btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        } catch {
          window.prompt('Copia el enlace:', text)
        }
      }}
    >
      {done ? '✓ Copiado' : label}
    </button>
  )
}

'use client'

import { useState } from 'react'

/** Comparte con el menú nativo del celular; si no existe, copia el enlace. */
export function ShareButton({ url, title, text }: { url: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn-outline w-full py-4 text-lg"
      onClick={async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title, text, url })
          } catch {
            /* el usuario canceló */
          }
          return
        }
        try {
          await navigator.clipboard.writeText(`${text} ${url}`)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          window.prompt('Copia el enlace:', url)
        }
      }}
    >
      {copied ? '✓ Enlace copiado' : '📣 Compartir para ayudar'}
    </button>
  )
}

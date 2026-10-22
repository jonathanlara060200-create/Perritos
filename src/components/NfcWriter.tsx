'use client'

import { useState } from 'react'

/**
 * Escribe la URL en un chip NFC usando Web NFC.
 * Requiere: Chrome en Android, HTTPS y chip NTAG virgen o regrabable.
 * En iPhone o escritorio: usa una app como "NFC Tools" con la misma URL.
 */
export function NfcWriter({
  url,
  tagId,
  markWritten,
}: {
  url: string
  tagId: string
  markWritten: (tagId: string, locked: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [lock, setLock] = useState(false)
  const [msg, setMsg] = useState('')

  async function write() {
    setMsg('')
    if (!('NDEFReader' in window)) {
      setMsg('Este navegador no soporta escritura NFC. Usa Chrome en Android o la app NFC Tools.')
      return
    }
    setBusy(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: url }] }, { overwrite: true })
      let locked = false
      if (lock) {
        if (typeof ndef.makeReadOnly === 'function') {
          await ndef.makeReadOnly()
          locked = true
        } else {
          setMsg('URL escrita, pero este navegador no puede bloquear el chip. Usa NFC Tools para bloquearlo.')
        }
      }
      await markWritten(tagId, locked)
      setMsg(locked ? '✅ Chip escrito y bloqueado (solo lectura).' : '✅ Chip escrito. Acércalo a un celular para probarlo.')
    } catch (e) {
      const err = e as Error
      setMsg(err.name === 'NotAllowedError' ? 'Permiso NFC denegado.' : `No se pudo escribir: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={write} disabled={busy} className="btn-primary w-full">
        {busy ? 'Acerca el chip al teléfono…' : '📲 Escribir URL en el chip'}
      </button>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>Bloquear el chip después de escribir (irreversible; evita que lo sobrescriban).</span>
      </label>
      {msg && <p className="rounded-2xl bg-axo-50 px-4 py-3 text-sm font-bold">{msg}</p>}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'

/** Input de foto que la reduce a máx. 1600 px (WebP) antes de subirla: más rápido en celular. */
export function PhotoInput({ name = 'photo' }: { name?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return setPreview(null)
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.85))
      if (blob && blob.size < file.size) {
        const resized = new File([blob], 'foto.webp', { type: 'image/webp' })
        const dt = new DataTransfer()
        dt.items.add(resized)
        if (ref.current) ref.current.files = dt.files
      }
    } catch {
      // Si el navegador no puede procesarla, se sube tal cual (el servidor valida tipo y tamaño)
    }
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-3">
      <input ref={ref} type="file" name={name} accept="image/jpeg,image/png,image/webp" onChange={onChange} required className="input file:mr-3 file:rounded-xl file:border-0 file:bg-axo-100 file:px-3 file:py-1.5 file:font-bold file:text-axo-600" />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Vista previa" className="h-40 w-40 rounded-3xl object-cover" />
      )}
    </div>
  )
}

import { redirect } from 'next/navigation'

// QR y NFC son dos formas de leer la misma placa: se administran juntos en /admin/tags.
export default function AdminQr() {
  redirect('/admin/tags')
}

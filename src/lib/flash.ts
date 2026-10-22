import { redirect } from 'next/navigation'

/** Redirige agregando un mensaje (?t=ok|error&msg=...) que la página muestra con <Flash />. */
export function go(path: string, kind: 'ok' | 'error', msg: string): never {
  const u = new URL(path, 'http://x')
  u.searchParams.set('t', kind)
  u.searchParams.set('msg', msg)
  redirect(u.pathname + u.search)
}

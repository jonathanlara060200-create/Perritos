import { cn } from '@/lib/utils'

type SP = { [key: string]: string | string[] | undefined }

export function Flash({ sp }: { sp: SP }) {
  const msg = typeof sp.msg === 'string' ? sp.msg : null
  if (!msg) return null
  const error = sp.t === 'error'
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={cn(
        'mb-4 rounded-2xl px-4 py-3 text-sm font-bold',
        error ? 'bg-red-50 text-red-700' : 'bg-mint text-emerald-900',
      )}
    >
      {msg}
    </div>
  )
}

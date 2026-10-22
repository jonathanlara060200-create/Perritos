import { NextResponse } from 'next/server'
import { getProfile } from '@/lib/auth'
import { generateClaimCode, hashClaimCode } from '@/lib/claim'
import { createClient } from '@/lib/supabase/server'

// Crea placas en lote y devuelve un CSV con los códigos de activación.
// Los códigos solo se guardan como hash: este CSV es la ÚNICA vez que se ven.
export async function POST(request: Request) {
  const profile = await getProfile()
  const origin = new URL(request.url).origin
  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/admin/tags?t=error&msg=${encodeURIComponent(msg)}`, { status: 303 })

  if (!profile || profile.role !== 'admin') return NextResponse.redirect(`${origin}/login`, { status: 303 })

  const fd = await request.formData()
  const count = Math.floor(Number(fd.get('count')))
  if (!Number.isFinite(count) || count < 1 || count > 200) return fail('La cantidad debe estar entre 1 y 200.')

  const str = (k: string) => {
    const v = fd.get(k)
    return typeof v === 'string' && v.trim() ? v.trim() : null
  }
  const row = {
    model: str('model') ?? 'AJolote ID',
    color: str('color'),
    material: str('material') ?? 'PLA',
    version: str('version') ?? 'v1',
    dtf_uv: fd.get('dtf_uv') === 'on',
  }

  const supabase = await createClient()
  const { data: tags, error } = await supabase
    .from('tags')
    .insert(Array.from({ length: count }, () => row))
    .select('id, tag_code')
  if (error || !tags) return fail('No pudimos crear las placas.')

  const codes = new Map<string, string>()
  const secrets = []
  for (const t of tags as { id: string; tag_code: string }[]) {
    const code = generateClaimCode()
    codes.set(t.tag_code, code)
    secrets.push({ tag_id: t.id, claim_code_hash: await hashClaimCode(code) })
  }
  const { error: secErr } = await supabase.from('tag_secrets').insert(secrets)
  if (secErr) {
    await supabase.from('tags').delete().in('id', (tags as { id: string }[]).map((t) => t.id))
    return fail('No pudimos guardar los códigos de activación. No se creó ninguna placa.')
  }

  const csv = ['tag_code,claim_code', ...[...codes].map(([t, c]) => `${t},${c}`)].join('\n') + '\n'
  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="placas-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

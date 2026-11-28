import { createClient } from '@/lib/supabase/server'
import { JOB0, type CalcProduct, type Job } from '@/lib/print-pricing'

const photoUrl = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/calc-photos/${path}` : null

/** Catálogo compartido de la calculadora (RLS: solo admin y equipo de la calculadora). */
export async function getCalcProducts(): Promise<CalcProduct[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('calc_products')
    .select('id, name, photo_path, job, colors, notes, final_price, wholesale, suggested_price, updated_at')
    .order('name')
  return ((data ?? []) as (Omit<CalcProduct, 'photo_url' | 'job'> & { photo_path: string | null; job: Partial<Job> })[]).map((p) => ({
    id: p.id,
    name: p.name,
    photo_url: photoUrl(p.photo_path),
    job: { ...JOB0, ...p.job },
    colors: p.colors ?? [],
    notes: p.notes,
    final_price: p.final_price === null ? null : Number(p.final_price),
    wholesale: p.wholesale,
    suggested_price: p.suggested_price === null ? null : Number(p.suggested_price),
    updated_at: p.updated_at,
  }))
}

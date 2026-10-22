import { createPublicClient } from '@/lib/supabase/public'

/** nombre de color → hex, tomado de product_variants (editable desde el admin). */
export async function getColorMap(): Promise<Record<string, string>> {
  try {
    const { data } = await createPublicClient().from('product_variants').select('color_name, color_hex')
    const map: Record<string, string> = {}
    for (const v of (data ?? []) as { color_name: string; color_hex: string }[]) map[v.color_name] = v.color_hex
    return map
  } catch {
    return {}
  }
}

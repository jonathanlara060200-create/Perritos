import { ClickersBoard } from '@/components/ClickersBoard'

export const metadata = { title: 'Clickers y llaveros · Admin' }

export default async function AdminClickers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ClickersBoard sp={await searchParams} basePath="/admin/clickers" />
}

import { ClickersBoard } from '@/components/ClickersBoard'

export const metadata = { title: 'Pedidos de clickers' }

export default async function ClickersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ClickersBoard sp={await searchParams} basePath="/clickers" staff />
}

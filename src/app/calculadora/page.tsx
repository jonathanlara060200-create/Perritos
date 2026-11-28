import { PrintCalculator } from '@/components/PrintCalculator'
import { getCalcAccess } from '@/lib/auth'
import { getCalcProducts } from '@/lib/calc-products'

export const metadata = { title: 'Calculadora 3D' }

export default async function CalculadoraPage() {
  const [products, access] = await Promise.all([getCalcProducts(), getCalcAccess()])
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Calculadora de precios 3D</h1>
        <p className="muted">Filamento, tiempo, clickers y NFC → cuánto cuesta y cuánto cobrar. Tus costos base se guardan en este dispositivo; los productos se comparten con el equipo.</p>
      </div>
      <PrintCalculator products={products} canDelete={access === 'admin'} />
    </div>
  )
}

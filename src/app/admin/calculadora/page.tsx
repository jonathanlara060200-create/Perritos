import { PrintCalculator } from '@/components/PrintCalculator'
import { getCalcProducts } from '@/lib/calc-products'

export const metadata = { title: 'Calculadora 3D · Admin' }

export default async function AdminCalculator() {
  const products = await getCalcProducts()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Calculadora de precios 3D</h1>
        <p className="muted">Filamento, tiempo, clickers y NFC → cuánto te cuesta y cuánto cobrar. Los productos guardados los ve también el equipo de la calculadora.</p>
      </div>
      <PrintCalculator products={products} canDelete />
    </div>
  )
}

import { PrintCalculator } from '@/components/PrintCalculator'

export const metadata = { title: 'Calculadora 3D · Admin' }

export default function AdminCalculator() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Calculadora de precios 3D</h1>
        <p className="muted">Filamento, tiempo, clickers y NFC → cuánto te cuesta y cuánto cobrar.</p>
      </div>
      <PrintCalculator />
    </div>
  )
}

import { PrintCalculator } from '@/components/PrintCalculator'

export const metadata = { title: 'Calculadora 3D' }

export default function CalculadoraPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Calculadora de precios 3D</h1>
        <p className="muted">Filamento, tiempo, clickers y NFC → cuánto cuesta y cuánto cobrar. Tus costos se guardan en este dispositivo.</p>
      </div>
      <PrintCalculator />
    </div>
  )
}

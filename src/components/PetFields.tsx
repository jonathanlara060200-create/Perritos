import { SEX, SPECIES } from '@/lib/labels'

type Pet = {
  name?: string
  species?: string
  breed?: string | null
  sex?: string
  birth_date?: string | null
  weight_kg?: number | string | null
  color?: string | null
  description?: string | null
}

export function PetFields({ pet = {} }: { pet?: Pet }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Nombre</label>
        <input id="name" name="name" required maxLength={60} defaultValue={pet.name ?? ''} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="species">Especie</label>
          <select id="species" name="species" defaultValue={pet.species ?? 'dog'} className="input">
            {Object.entries(SPECIES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sex">Sexo</label>
          <select id="sex" name="sex" defaultValue={pet.sex ?? 'unknown'} className="input">
            {Object.entries(SEX).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="breed">Raza</label>
          <input id="breed" name="breed" maxLength={80} defaultValue={pet.breed ?? ''} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">Color</label>
          <input id="color" name="color" maxLength={80} defaultValue={pet.color ?? ''} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="birth_date">Nacimiento</label>
          <input id="birth_date" name="birth_date" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={pet.birth_date ?? ''} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="weight_kg">Peso (kg, opcional)</label>
          <input id="weight_kg" name="weight_kg" inputMode="decimal" defaultValue={pet.weight_kg ?? ''} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción</label>
        <textarea id="description" name="description" rows={3} maxLength={1000} defaultValue={pet.description ?? ''} placeholder="Ej. Muy cariñosa, tiene una mancha blanca en el pecho" className="input" />
      </div>
    </div>
  )
}

import { BASE_COLORS, COLOR_LIST, CUSTOM_STATUS, ITEM_TYPE, PRICE_PER_LETTER } from '@/lib/clickers'

export type ClickerFormValues = {
  customer_name?: string
  contact?: string | null
  item_type?: string
  control_name?: string | null
  base_color?: string | null
  key_color?: string | null
  letter_color?: string | null
  has_nfc?: boolean
  price?: number | string | null
  paid_amount?: number | string | null
  due_date?: string | null
  description?: string | null
  notes?: string | null
  status?: string
}

/** Listas de sugerencias de color. Se ponen UNA vez por página y los inputs las usan con list="…". */
export function ColorDatalists() {
  return (
    <>
      <datalist id="clr-base">
        {BASE_COLORS.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
      <datalist id="clr-all">
        {COLOR_LIST.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
    </>
  )
}

/** Campos del pedido (sirven para crear y para editar). */
export function ClickerFields({ v = {}, withStatus = false }: { v?: ClickerFormValues; withStatus?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Cliente</label>
        <input name="customer_name" defaultValue={v.customer_name ?? ''} required maxLength={120} placeholder="¿Quién lo pidió?" className="input" />
      </div>
      <div>
        <label className="label">Contacto <span className="muted">(Instagram / WhatsApp)</span></label>
        <input name="contact" defaultValue={v.contact ?? ''} maxLength={120} className="input" />
      </div>

      <div>
        <label className="label">Tipo</label>
        <select name="item_type" defaultValue={v.item_type ?? 'clicker'} className="input">
          {Object.entries(ITEM_TYPE).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Fecha de entrega</label>
        <input type="date" name="due_date" defaultValue={v.due_date ?? ''} className="input" />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Nombre del control <span className="muted">(una letra por tecla)</span></label>
        <input name="control_name" defaultValue={v.control_name ?? ''} maxLength={30} placeholder="Ej. LUNA" className="input uppercase" />
      </div>

      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
        <div>
          <label className="label">Color de la base</label>
          <input name="base_color" list="clr-base" defaultValue={v.base_color ?? ''} maxLength={40} placeholder="Azul cielo…" className="input" />
        </div>
        <div>
          <label className="label">Color de la tecla</label>
          <input name="key_color" list="clr-all" defaultValue={v.key_color ?? ''} maxLength={40} placeholder="El que pidan" className="input" />
        </div>
        <div>
          <label className="label">Color de la letra</label>
          <input name="letter_color" list="clr-all" defaultValue={v.letter_color ?? ''} maxLength={40} placeholder="El que pidan" className="input" />
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Descripción <span className="muted">(para llaveros u otros pedidos)</span></label>
        <input name="description" defaultValue={v.description ?? ''} maxLength={500} placeholder="Ej. Llavero de huella con NFC" className="input" />
      </div>

      <div>
        <label className="label">Precio (MXN)</label>
        <input name="price" inputMode="decimal" defaultValue={v.price ?? ''} placeholder={`Auto: $${PRICE_PER_LETTER} por letra`} className="input" />
        <p className="muted mt-1">Déjalo vacío y en los clickers se calcula solo: letras × ${PRICE_PER_LETTER}.</p>
      </div>
      <div>
        <label className="label">Ya pagó (MXN)</label>
        <input name="paid_amount" inputMode="decimal" defaultValue={v.paid_amount ?? ''} placeholder="0" className="input" />
      </div>

      <label className="flex items-center gap-2 font-bold">
        <input type="checkbox" name="has_nfc" defaultChecked={!!v.has_nfc} className="h-5 w-5" /> Lleva NFC
      </label>
      {withStatus ? (
        <div>
          <label className="label">Estado</label>
          <select name="status" defaultValue={v.status ?? 'pending'} className="input">
            {Object.entries(CUSTOM_STATUS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      ) : (
        <span />
      )}

      <div className="sm:col-span-2">
        <label className="label">Notas</label>
        <textarea name="notes" rows={2} defaultValue={v.notes ?? ''} maxLength={1000} className="input" />
      </div>
    </div>
  )
}

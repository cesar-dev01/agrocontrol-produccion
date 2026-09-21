'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './inventory.module.css'

export const inventoryLabels = {
  opening: 'Saldo inicial',
  purchase: 'Compra / entrada',
  adjustment_in: 'Ajuste de entrada',
  adjustment_out: 'Ajuste de salida',
  return_in: 'Devolución al inventario',
  return_out: 'Devolución al proveedor',
  consumption: 'Consumo en cultivo',
  consumption_reversal: 'Reversión de consumo',
}

const actionOptions = ['purchase', 'adjustment_in', 'adjustment_out', 'return_in', 'return_out']

export function InventoryChangeModal({ product, close, onSave, currencySymbol }) {
  const [kind, setKind] = useState('purchase')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [unitCost, setUnitCost] = useState(String(product.unitCost || 0))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isOut = kind === 'adjustment_out' || kind === 'return_out'

  const submit = async event => {
    event.preventDefault()
    setError('')
    const amount = Number(quantity)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Ingresa una cantidad mayor que cero.')
    if (isOut && amount > product.stockQuantity) return setError(`Stock insuficiente: hay ${product.stock} disponibles.`)
    setSaving(true)
    try {
      await onSave({ kind, quantity: amount, date, unitCost: kind === 'purchase' ? Number(unitCost) : null, note: note.trim() })
      close()
    } catch (saveError) {
      setError(saveError?.message || 'No pudimos registrar el cambio de inventario.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={close}>
    <form className="modal" onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
      <button type="button" className="modal-close" onClick={close} aria-label="Cerrar">×</button>
      <p className="eyebrow">CONTROL DE EXISTENCIAS</p><h2>Registrar entrada o salida</h2>
      <p className="muted">{product.name} · Stock actual: {product.stock}</p>
      <div className="form-grid">
        <label className={styles.fullField}>Operación<select value={kind} onChange={event => setKind(event.target.value)}>{actionOptions.map(option => <option key={option} value={option}>{inventoryLabels[option]}</option>)}</select></label>
        <label>Cantidad ({product.stockUnit})<input required type="number" min="0.01" step="0.01" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="0.00" /></label>
        <label>Fecha<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        {kind === 'purchase' && <label className={styles.fullField}>Costo unitario ({currencySymbol})<input required type="number" min="0" step="0.01" value={unitCost} onChange={event => setUnitCost(event.target.value)} /></label>}
        <label className={styles.fullField}>Motivo o referencia<input value={note} onChange={event => setNote(event.target.value)} placeholder={kind === 'purchase' ? 'Ej. Compra a proveedor, factura 123' : 'Ej. Conteo físico o devolución'} /></label>
      </div>
      <p className={styles.hint}>{kind === 'purchase' ? 'La compra aumenta existencias y actualiza el costo unitario. Se contabilizará como gasto de campaña cuando registres su consumo en Movimientos.' : 'Esta operación cambia el stock, pero no crea ni modifica un gasto de campaña.'}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary full" disabled={saving} type="submit">{saving ? 'Guardando...' : 'Registrar en inventario'}</button>
    </form>
  </div>
}

export function InventoryHistoryModal({ product, close, localEvents, unitMoney, timezone }) {
  const [events, setEvents] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setEvents(localEvents.filter(event => String(event.product_id) === String(product.id)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))))
      return
    }
    let active = true
    supabase.from('inventory_events').select('*')
      .eq('product_id', product.id).order('created_at', { ascending: false }).range(0, 49)
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) setError(fetchError.message)
        else { setEvents(data || []); setHasMore((data || []).length === 50) }
        setLoading(false)
      })
    return () => { active = false }
  }, [product.id, localEvents])

  const more = async () => {
    const nextPage = page + 1
    setLoading(true)
    const { data, error: fetchError } = await supabase.from('inventory_events').select('*')
      .eq('product_id', product.id).order('created_at', { ascending: false })
      .range(nextPage * 50, nextPage * 50 + 49)
    if (fetchError) setError(fetchError.message)
    else { setEvents(current => [...current, ...(data || [])]); setHasMore((data || []).length === 50); setPage(nextPage) }
    setLoading(false)
  }

  const date = value => value ? new Intl.DateTimeFormat('es-PE', { timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : ''

  return <div className="modal-backdrop" onMouseDown={close}>
    <section className={`modal ${styles.historyModal}`} onMouseDown={event => event.stopPropagation()} aria-label={`Historial de ${product.name}`}>
      <button type="button" className="modal-close" onClick={close} aria-label="Cerrar">×</button>
      <p className="eyebrow">TRAZABILIDAD DE INSUMOS</p><h2>Historial de existencias</h2>
      <p className="muted">{product.name} · Stock actual: {product.stock}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && events.length === 0 ? <p className={styles.empty}>Cargando historial...</p> : events.length === 0 ? <p className={styles.empty}>Aún no hay operaciones registradas para este insumo.</p> : <div className={styles.historyList}>
        {events.map(event => <article className={styles.historyRow} key={event.id}>
          <div><b>{inventoryLabels[event.event_type] || event.event_type}</b><small>{date(event.occurred_on)}{event.note ? ` · ${event.note}` : ''}</small></div>
          <div className={styles.historyNumbers}><strong className={event.quantity_delta > 0 ? styles.positive : styles.negative}>{event.quantity_delta > 0 ? '+' : ''}{Number(event.quantity_delta)} {product.stockUnit}</strong><small>Saldo después: {Number(event.balance_after)} · {unitMoney.format(Number(event.unit_cost || 0))} c/u</small></div>
        </article>)}
      </div>}
      {hasMore && <button type="button" className={styles.more} onClick={more} disabled={loading}>{loading ? 'Cargando...' : 'Ver más operaciones'}</button>}
    </section>
  </div>
}

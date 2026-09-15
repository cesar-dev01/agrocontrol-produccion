'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import campaignStyles from './campaigns.module.css'
import movementStyles from './movements.module.css'
import harvestStyles from './harvests.module.css'
import reportStyles from './reports.module.css'
import actionStyles from './actions.module.css'

const expenseData = [
  { label: 'Preparación', amount: 2850, color: '#2f8c64' },
  { label: 'Siembra', amount: 1870, color: '#88bd69' },
  { label: 'Cuidado', amount: 3260, color: '#e7ad51' },
  { label: 'Cosecha', amount: 1420, color: '#d87d48' },
]

const initialProducts = [
  { id: 1, name: 'Fertilizante NPK 20-20-20', category: 'Abono', stock_quantity: 12, stock_unit: 'sacos', unit_cost: 123.33, icon: '✳' },
  { id: 2, name: 'Insecticida biológico', category: 'Insecticida', stock_quantity: 8, stock_unit: 'litros', unit_cost: 95, icon: '◉' },
  { id: 3, name: 'Semilla de maíz híbrido', category: 'Semilla', stock_quantity: 24, stock_unit: 'kg', unit_cost: 40, icon: '◆' },
]

const normalizeProduct = product => {
  const legacyStock = String(product.stock || '').trim().split(/\s+/)
  const stockQuantity = Number(product.stock_quantity ?? product.stockQuantity ?? legacyStock[0] ?? 0)
  const stockUnit = product.stock_unit ?? product.stockUnit ?? (legacyStock.slice(1).join(' ') || 'unidades')
  const unitCost = Number(product.unit_cost ?? product.unitCost ?? product.value ?? 0)
  return {
    ...product,
    stockQuantity,
    stockUnit,
    unitCost,
    stock: `${stockQuantity} ${stockUnit}`,
    value: unitCost,
    icon: product.icon || '✦',
    photo: product.photo_url ?? product.photo ?? '',
  }
}

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const unitMoney = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const canUseStorage = typeof window !== 'undefined'

function Icon({ name, size = 20 }) {
  const paths = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    leaf: 'M20.8 3.2C10 3.1 4 8.5 4 15c0 3.4 2.5 5.8 5.5 5.8 6.5 0 10.4-7.3 11.3-17.6Z M3 21c2-4.5 5.6-7 11-9',
    bag: 'M5 8h14l1 13H4L5 8Zm3 0 1-5h6l1 5M8 12h8',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6',
    chart: 'M4 20V10m6 10V4m6 16v-7m6 7V7',
    users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75',
    settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Zm0-13v2m0 15v2m9.5-9.5h-2m-15 0h-2m16.72-6.72-1.42 1.42M6.2 17.8l-1.42 1.42m14.44 0-1.42-1.42M6.2 6.2 4.78 4.78',
    plus: 'M12 5v14M5 12h14',
    arrow: 'm9 18 6-6-6-6',
    calendar: 'M5 3v3m14-3v3M4 8h16M5 5h14v16H5z',
    trend: 'm3 17 6-6 4 4 8-9M14 6h7v7',
    camera: 'M4 7h3l2-3h6l2 3h3v13H4V7Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    logout: 'M10 17l5-5-5-5m5 5H3m15-8h3v16h-3',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}

function Logo() { return <div className="brand"><span className="brand-mark"><Icon name="leaf" size={25} /></span><span>Agro<span>Control</span></span></div> }

function Actions({ onEdit, onDelete, className = '' }) { return <div className={`${actionStyles.actions} ${className}`}><button className={actionStyles.edit} onClick={onEdit}>Editar</button><button className={actionStyles.remove} onClick={onDelete}>Eliminar</button></div> }

function Auth({ onLogin }) {
  const [signup, setSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    if (!supabase) { onLogin({ id: 'demo-admin', name: signup ? name || 'Administrador' : 'Administrador', email: email || 'admin@agrocontrol.pe' }); setLoading(false); return }
    const password = e.currentTarget.password.value
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (result.error) return setError(result.error.message)
    if (signup && !result.data.session) return setError('Revisa tu correo para confirmar la cuenta y luego inicia sesión.')
    const authUser = result.data.user
    onLogin({ id: authUser.id, name: authUser.user_metadata?.full_name || 'Administrador', email: authUser.email })
  }
  return <main className="auth-page"><section className="auth-visual"><Logo /><div className="auth-copy"><p className="eyebrow">GESTIONA CON INTELIGENCIA</p><h1>Tu cultivo,<br /><em>en control.</em></h1><p>Registra cada inversión y toma decisiones con números claros desde la preparación hasta la cosecha.</p></div><div className="auth-stat"><span>↗</span><div><b>Más claridad</b><small>en cada campaña</small></div></div></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><div className="auth-mobile-logo"><Logo /></div><p className="eyebrow">{signup ? 'CREA TU ESPACIO' : 'BIENVENIDO DE NUEVO'}</p><h2>{signup ? 'Empieza a cultivar mejor.' : 'Ingresa a tu cuenta.'}</h2><p className="muted">{signup ? 'Crea la cuenta del administrador principal.' : 'Gestiona tus campañas e inversiones.'}</p>{signup && <label>Nombre completo<input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Juan Pérez" /></label>}<label>Correo electrónico<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.com" /></label><label>Contraseña<input name="password" type="password" required placeholder="••••••••" minLength="6" /></label>{error && <p className="form-error">{error}</p>}{!signup && <a href="#recuperar" className="forgot">¿Olvidaste tu contraseña?</a>}<button className="primary full" disabled={loading} type="submit">{loading ? 'Procesando...' : signup ? 'Crear cuenta' : 'Ingresar'} {!loading && <Icon name="arrow" size={17} />}</button><p className="switch">{signup ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'} <button type="button" onClick={() => { setSignup(!signup); setError('') }}>{signup ? 'Ingresa' : 'Crea tu cuenta'}</button></p></form></section></main>
}

function SideNav({ active, setActive, onLogout }) {
  const nav = [['dashboard', 'grid', 'Resumen'], ['cultivos', 'leaf', 'Mis cultivos'], ['insumos', 'bag', 'Insumos'], ['movimientos', 'receipt', 'Movimientos'], ['cosechas', 'leaf', 'Cosechas'], ['reportes', 'chart', 'Reportes'], ['equipo', 'users', 'Equipo']]
  return <aside className="sidebar"><Logo /><nav>{nav.map(([id, icon, label]) => <button key={id} onClick={() => setActive(id)} className={active === id ? 'active' : ''}><Icon name={icon} />{label}</button>)}</nav><div className="nav-bottom"><button><Icon name="settings" />Configuración</button><button onClick={onLogout}><Icon name="logout" />Cerrar sesión</button></div></aside>
}

function Metric({ title, value, note, icon, tone }) { return <article className="metric"><div><p>{title}</p><h3>{value}</h3><span className={tone || ''}>{note}</span></div><i className={'metric-icon ' + (tone || '')}><Icon name={icon} /></i></article> }

function Dashboard({ products, showProduct }) {
  const max = Math.max(...expenseData.map(x => x.amount))
  return <><div className="page-heading"><div><p className="eyebrow">VISTA GENERAL</p><h1>Buenos días, Administrador <span>🌱</span></h1><p className="muted">Aquí tienes el resumen de tu producción.</p></div><button className="primary" onClick={showProduct}><Icon name="plus" size={18} />Nuevo registro</button></div><section className="metrics"><Metric title="Inversión total" value="S/ 9,400" note="Esta campaña" icon="receipt" /><Metric title="Ventas estimadas" value="S/ 14,250" note="↑ 18.5% vs. anterior" icon="trend" tone="positive" /><Metric title="Utilidad proyectada" value="S/ 4,850" note="Margen de 34%" icon="chart" tone="positive" /><Metric title="Cultivos activos" value="2" note="15.7 ha en producción" icon="leaf" tone="green" /></section><section className="content-grid"><article className="panel campaign"><div className="panel-head"><div><h2>Campaña actual</h2><p>Maíz amarillo duro · Primavera 2026</p></div><button className="icon-button">•••</button></div><div className="campaign-info"><div className="crop-icon">♧</div><div><b>Hacienda El Porvenir</b><p><Icon name="calendar" size={15} /> 15 mar — 30 ago 2026</p></div><span className="status">En crecimiento</span></div><div className="progress-meta"><span>Progreso de campaña</span><b>68%</b></div><div className="progress"><i /></div><footer><span>Próxima actividad <b>· Fertilización</b></span><span>En 4 días</span></footer></article><article className="panel expenses"><div className="panel-head"><div><h2>Inversión por etapa</h2><p>Campaña actual</p></div><button className="link">Ver detalle <Icon name="arrow" size={14} /></button></div><div className="bar-chart">{expenseData.map(x => <div className="bar-col" key={x.label}><div className="bar-value" style={{height: `${(x.amount / max) * 138}px`, background: x.color}}><span>{money.format(x.amount)}</span></div><small>{x.label}</small></div>)}</div></article></section><section className="content-grid lower"><article className="panel activity"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Últimos movimientos de la campaña</p></div><button className="link">Ver todo <Icon name="arrow" size={14} /></button></div><div className="activity-row"><i className="activity-icon orange"><Icon name="bag" size={18} /></i><div><b>Compra de fertilizante NPK</b><p>Insumos · Hoy, 09:42</p></div><strong>- S/ 1,480</strong></div><div className="activity-row"><i className="activity-icon green"><Icon name="leaf" size={18} /></i><div><b>Aplicación de insecticida</b><p>Cuidado · Ayer, 16:20</p></div><strong>- S/ 360</strong></div><div className="activity-row"><i className="activity-icon blue"><Icon name="calendar" size={18} /></i><div><b>Jornal de riego</b><p>Mano de obra · 24 ago, 08:15</p></div><strong>- S/ 280</strong></div></article><article className="panel inventory"><div className="panel-head"><div><h2>Insumos con stock bajo</h2><p>Revisa antes de tu próxima actividad</p></div><button className="link">Ver insumos <Icon name="arrow" size={14} /></button></div>{products.slice(0, 2).map(p => <div className="stock-row" key={p.id}><i>{p.photo ? <img src={p.photo} alt="" /> : p.icon}</i><div><b>{p.name}</b><p>{p.category}</p></div><span>{p.stock}</span></div>)}</article></section></>
}

function Products({ products, showProduct, editProduct, deleteProduct }) { return <><div className="page-heading"><div><p className="eyebrow">CATÁLOGO</p><h1>Insumos</h1><p className="muted">Controla los productos y materiales de tu producción.</p></div><button className="primary" onClick={showProduct}><Icon name="plus" size={18} />Agregar insumo</button></div><section className="products-grid">{products.map(p => <article className="product-card" key={p.id}><div className="product-image">{p.photo ? <img src={p.photo} alt={p.name} /> : <span>{p.icon}</span>}</div><div className="product-body"><span className="tag">{p.category}</span><h3>{p.name}</h3><div><span>{p.stock}</span><b>{unitMoney.format(p.value)} / {p.stockUnit}</b></div><Actions className={actionStyles.cardActions} onEdit={() => editProduct(p)} onDelete={() => deleteProduct(p)} /></div></article>)}<button className="add-card" onClick={showProduct}><Icon name="plus" size={30} /><b>Agregar un nuevo insumo</b><span>Con foto y control de stock</span></button></section></> }

function ProductModal({ close, addProduct, updateProduct, user, product }) {
  const [photo, setPhoto] = useState(product?.photo || ''); const [name, setName] = useState(product?.name || ''); const [category, setCategory] = useState(product?.category || 'Abono'); const [stock, setStock] = useState(product?.stock?.split(' ')[0] || ''); const [value, setValue] = useState(product?.value || '')
  const [stockUnit, setStockUnit] = useState(product?.stockUnit || 'unidades')
  const [file, setFile] = useState(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const image = e => { const selected = e.target.files?.[0]; if (selected) { setFile(selected); const reader = new FileReader(); reader.onload = ev => setPhoto(ev.target.result); reader.readAsDataURL(selected) } }
  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    let photoUrl = photo
    if (supabase) {
      if (file) { const extension = file.name.split('.').pop(); const path = `${user.id}/${Date.now()}.${extension}`; const upload = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type }); if (upload.error) { setError(upload.error.message); setSaving(false); return }; photoUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl }
      const request = product ? supabase.from('products').update({ name, category, stock_quantity: Number(stock || 0), stock_unit: stockUnit, unit_cost: Number(value || 0), photo_url: photoUrl }).eq('id', product.id) : supabase.from('products').insert({ name, category, stock_quantity: Number(stock || 0), stock_unit: stockUnit, unit_cost: Number(value || 0), photo_url: photoUrl })
      const saved = await request.select().single()
      if (saved.error) { setError(saved.error.message); setSaving(false); return }
      const formatted = normalizeProduct(saved.data); product ? updateProduct(formatted) : addProduct(formatted); close(); return
    }
    const formatted = normalizeProduct({ id: product?.id || Date.now(), name, category, stock_quantity: Number(stock || 0), stock_unit: stockUnit, unit_cost: Number(value || 0), icon: '✦', photo: photoUrl }); product ? updateProduct(formatted) : addProduct(formatted); close()
  }
  return <div className="modal-backdrop" onMouseDown={close}>
    <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit}>
      <button type="button" className="modal-close" onClick={close}>×</button>
      <p className="eyebrow">{product ? 'EDITAR INSUMO' : 'NUEVO INSUMO'}</p><h2>{product ? 'Edita el producto' : 'Agrega un producto'}</h2>
      <p className="muted">Quedará disponible para registrar gastos y aplicaciones.</p>
      <label className="upload">{photo ? <img src={photo} alt="Vista previa" /> : <><Icon name="camera" size={26} /><b>Subir foto del producto</b><span>JPG o PNG</span></>}<input type="file" accept="image/*" onChange={image} /></label>
      <div className="form-grid">
        <label>Nombre<input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Urea granulada" /></label>
        <label>Categoría<select value={category} onChange={e => setCategory(e.target.value)}><option>Abono</option><option>Insecticida</option><option>Herbicida</option><option>Semilla</option><option>Herramienta</option></select></label>
        <label>Stock actual<input type="number" min="0" step="0.01" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" /></label>
        <label>Unidad de stock<select value={stockUnit} onChange={e => setStockUnit(e.target.value)}><option value="unidades">Unidades</option><option value="sacos">Sacos</option><option value="kg">Kg</option><option value="litros">Litros</option><option value="galones">Galones</option></select></label>
        <label>Costo por unidad (S/)<input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0.00" /></label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button disabled={saving} className="primary full" type="submit">{saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Guardar insumo'} {!saving && <Icon name="arrow" size={17} />}</button>
    </form>
  </div>
}

function Campaigns({ campaigns, loading, showCampaign, closeCampaign, editCampaign, deleteCampaign }) {
  const status = { planned: 'Planificada', preparation: 'Preparación', growing: 'En crecimiento', harvesting: 'En cosecha', closed: 'Cerrada' }
  const displayDate = date => date ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'Sin fecha'
  return <><div className="page-heading"><div><p className="eyebrow">PRODUCCIÓN</p><h1>Mis cultivos</h1><p className="muted">Organiza tus parcelas y campañas de cultivo.</p></div><button className="primary" onClick={showCampaign}><Icon name="plus" size={18} />Nueva campaña</button></div>
    {loading ? <div className={campaignStyles.empty}>Cargando campañas…</div> : campaigns.length === 0 ? <div className={campaignStyles.empty}><i><Icon name="leaf" size={32} /></i><h2>Tu primera campaña empieza aquí.</h2><p>Registra el cultivo, la parcela y la fecha aproximada de cosecha para centralizar todos sus gastos.</p><button className="primary" onClick={showCampaign}><Icon name="plus" size={18} />Registrar campaña</button></div> : <section className={campaignStyles.grid}>{campaigns.map(c => <article className={campaignStyles.card} key={c.id}><div className={campaignStyles.cardTop}><i>♧</i><span className={`${campaignStyles.status} ${campaignStyles[c.status] || ''}`}>{status[c.status] || c.status}</span></div><h2>{c.crop_name}</h2><p className={campaignStyles.field}>{c.fieldName} · {c.area ? `${c.area} ha` : 'Área pendiente'}</p><div className={campaignStyles.dates}><div><small>INICIO</small><b>{displayDate(c.started_on)}</b></div><div><small>COSECHA ESTIMADA</small><b>{displayDate(c.estimated_harvest_on)}</b></div></div><footer><span>{c.season || 'Sin temporada'}</span>{c.status !== 'closed' && <button onClick={() => closeCampaign(c.id)}>Cerrar <Icon name="arrow" size={14} /></button>}<Actions className={actionStyles.inline} onEdit={() => editCampaign(c)} onDelete={() => deleteCampaign(c)} /></footer></article>)}</section>}</>
}

function CampaignModal({ close, user, addCampaign, updateCampaign, campaign }) {
  const today = new Date().toISOString().slice(0, 10)
  const estimated = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10)
  const [fieldName, setFieldName] = useState(campaign?.fieldName || ''); const [area, setArea] = useState(campaign?.area || ''); const [location, setLocation] = useState(campaign?.location || '')
  const [cropName, setCropName] = useState(campaign?.crop_name || ''); const [season, setSeason] = useState(campaign?.season || ''); const [startedOn, setStartedOn] = useState(campaign?.started_on || today); const [harvestOn, setHarvestOn] = useState(campaign?.estimated_harvest_on || estimated); const [status, setStatus] = useState(campaign?.status || 'preparation')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async e => { e.preventDefault(); setError(''); setSaving(true)
    if (harvestOn < startedOn) { setError('La cosecha estimada debe ser posterior al inicio.'); setSaving(false); return }
    const model = { crop_name: cropName, season, started_on: startedOn, estimated_harvest_on: harvestOn, status }
    if (supabase) {
      if (campaign?.fieldId) { const fieldUpdate = await supabase.from('fields').update({ name: fieldName, area_hectares: Number(area || 0), location }).eq('id', campaign.fieldId); if (fieldUpdate.error) { setError(fieldUpdate.error.message); setSaving(false); return } }
      const fieldInsert = campaign ? { data: { id: campaign.fieldId } } : await supabase.from('fields').insert({ name: fieldName, area_hectares: Number(area || 0), location }).select().single()
      if (fieldInsert.error) { setError(fieldInsert.error.message); setSaving(false); return }
      const request = campaign ? supabase.from('crop_cycles').update(model).eq('id', campaign.id) : supabase.from('crop_cycles').insert({ ...model, field_id: fieldInsert.data.id })
      const cycle = await request.select('*, fields(id, name, area_hectares, location)').single()
      if (cycle.error) { setError(cycle.error.message); setSaving(false); return }
      const c = cycle.data; const formatted = { ...c, fieldId: c.fields?.id || campaign?.fieldId, fieldName: c.fields?.name || fieldName, area: c.fields?.area_hectares || area, location: c.fields?.location || location }; campaign ? updateCampaign(formatted) : addCampaign(formatted); close(); return
    }
    const formatted = { id: campaign?.id || Date.now(), ...model, fieldId: campaign?.fieldId, fieldName, area: Number(area || 0), location }; campaign ? updateCampaign(formatted) : addCampaign(formatted); close()
  }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit}><button type="button" className="modal-close" onClick={close}>×</button><p className="eyebrow">{campaign ? 'EDITAR CAMPAÑA' : 'NUEVA CAMPAÑA'}</p><h2>{campaign ? 'Edita tu cultivo' : 'Registra tu cultivo'}</h2><p className="muted">Luego podrás asociar gastos, jornales, riegos y cosechas.</p><h3 className={campaignStyles.sectionTitle}>Parcela</h3><div className="form-grid"><label>Nombre de parcela<input required value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="Ej. Lote Norte" /></label><label>Área (hectáreas)<input type="number" min="0" step="0.01" value={area} onChange={e => setArea(e.target.value)} placeholder="Ej. 2.5" /></label><label className={campaignStyles.fullField}>Ubicación <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej. Hacienda El Porvenir" /></label></div><h3 className={campaignStyles.sectionTitle}>Cultivo y fechas</h3><div className="form-grid"><label>Cultivo<input required value={cropName} onChange={e => setCropName(e.target.value)} placeholder="Ej. Maíz amarillo duro" /></label><label>Temporada<input value={season} onChange={e => setSeason(e.target.value)} placeholder="Ej. Primavera 2026" /></label><label>Fecha de inicio<input required type="date" value={startedOn} onChange={e => setStartedOn(e.target.value)} /></label><label>Cosecha estimada<input required type="date" value={harvestOn} onChange={e => setHarvestOn(e.target.value)} /></label><label className={campaignStyles.fullField}>Estado inicial<select value={status} onChange={e => setStatus(e.target.value)}><option value="planned">Planificada</option><option value="preparation">Preparación de tierra</option><option value="growing">En crecimiento</option><option value="harvesting">En cosecha</option><option value="closed">Cerrada</option></select></label></div>{error && <p className="form-error">{error}</p>}<button disabled={saving} className="primary full" type="submit">{saving ? 'Guardando...' : campaign ? 'Guardar cambios' : 'Guardar campaña'} {!saving && <Icon name="arrow" size={17} />}</button></form></div>
}

function Movements({ movements, campaigns, loading, showMovement, editMovement, deleteMovement, exportExcel, exportPdf }) {
  const labels = { machinery: 'Maquinaria', irrigation: 'Riego', labor: 'Mano de obra', input: 'Insumos', transport: 'Transporte', other: 'Otros' }
  const icons = { machinery: '⚙', irrigation: '≋', labor: '♙', input: '✳', transport: '↗', other: '·' }
  const spent = movements.reduce((sum, item) => sum + Number(item.total_cost || 0), 0)
  const displayDate = value => value ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : ''
  return <><div className="page-heading"><div><p className="eyebrow">REGISTRO FINANCIERO</p><h1>Movimientos</h1><p className="muted">Cada inversión de tus campañas en un solo lugar.</p></div><div className={movementStyles.headerActions}><button className={reportStyles.secondary} onClick={exportExcel} disabled={!movements.length}>Excel</button><button className={reportStyles.secondary} onClick={exportPdf} disabled={!movements.length}>PDF</button><button className="primary" onClick={showMovement} disabled={!campaigns.length}><Icon name="plus" size={18} />Registrar movimiento</button></div></div>
    {!campaigns.length ? <div className={movementStyles.notice}><Icon name="leaf" size={20} /><span>Primero crea una campaña de cultivo para poder registrar sus movimientos.</span></div> : <section className={movementStyles.summary}><article><span>Inversión registrada</span><b>{money.format(spent)}</b><small>En {movements.length} movimiento{movements.length === 1 ? '' : 's'}</small></article><article><span>Campañas activas</span><b>{campaigns.filter(c => c.status !== 'closed').length}</b><small>Seleccionables para registrar gastos</small></article><button onClick={showMovement}><Icon name="plus" size={19} /><b>Nuevo movimiento</b><span>Maquinaria, riego, peones e insumos</span></button></section>}
    {campaigns.length > 0 && <section className={movementStyles.panel}><div className="panel-head"><div><h2>Historial de movimientos</h2><p>Ordenado del más reciente al más antiguo.</p></div></div>{loading ? <p className={movementStyles.loading}>Cargando movimientos…</p> : movements.length === 0 ? <div className={movementStyles.empty}><i><Icon name="receipt" size={26} /></i><b>Aún no hay movimientos registrados.</b><span>Empieza por anotar el arado, riego, jornales o cualquier inversión.</span><button className="primary" onClick={showMovement}>Registrar primero</button></div> : <div className={movementStyles.table}>{movements.map(m => <div className={movementStyles.row} key={m.id}><i className={movementStyles[m.activity_type] || ''}>{icons[m.activity_type] || '·'}</i><div className={movementStyles.description}><b>{m.description}</b><p>{labels[m.activity_type] || m.activity_type} · {m.productName ? `${m.productName} · ` : ''}{m.cycleName || 'Campaña'} · {displayDate(m.started_at)}</p></div><div className={movementStyles.quantity}>{m.quantity ? <><b>{m.quantity} {m.unit || ''}</b><small>{m.productName && m.unit_cost != null ? `${unitMoney.format(m.unit_cost)} c/u` : 'Cantidad'}</small></> : <small>Sin cantidad</small>}</div><strong>- {money.format(m.total_cost)}</strong><Actions className={actionStyles.rowActions} onEdit={() => editMovement(m)} onDelete={() => deleteMovement(m)} /></div>)}</div>}</section>}</>
}

function MovementModal({ close, campaigns, products, addMovement, updateMovement, syncInventory, movement }) {
  const [campaignId, setCampaignId] = useState(movement?.crop_cycle_id || campaigns[0]?.id || '')
  const [stage, setStage] = useState(movement?.stage || 'preparation')
  const [type, setType] = useState(movement?.activity_type || 'machinery')
  const [productId, setProductId] = useState(movement?.product_id || '')
  const [description, setDescription] = useState(movement?.description || '')
  const [date, setDate] = useState(movement?.started_at?.slice(0, 10) || new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState(movement?.quantity || '')
  const [unit, setUnit] = useState(movement?.unit || 'horas')
  const [cost, setCost] = useState(movement?.total_cost || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedProduct = products.find(product => String(product.id) === String(productId))
  const restoredQuantity = movement?.activity_type === 'input' && String(movement.product_id) === String(productId) ? Number(movement.quantity || 0) : 0
  const availableStock = Number(selectedProduct?.stockQuantity || 0) + restoredQuantity
  const calculatedCost = type === 'input' ? Number(quantity || 0) * Number(selectedProduct?.unitCost || 0) : Number(cost || 0)

  const setMovementType = value => {
    setType(value)
    setError('')
    if (value === 'input') {
      const firstProduct = selectedProduct || products[0]
      setProductId(firstProduct?.id || '')
      setUnit(firstProduct?.stockUnit || 'unidades')
    } else {
      setProductId('')
      setUnit(value === 'labor' ? 'jornales' : value === 'irrigation' || value === 'machinery' ? 'horas' : '')
    }
  }

  const selectProduct = value => {
    const product = products.find(item => String(item.id) === String(value))
    setProductId(value)
    setUnit(product?.stockUnit || 'unidades')
    if (!description || description.startsWith('Uso de ')) setDescription(product ? `Uso de ${product.name}` : '')
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (type === 'input' && !selectedProduct) return setError('Selecciona el insumo que utilizaste.')
    if (type === 'input' && Number(quantity || 0) <= 0) return setError('Ingresa una cantidad utilizada mayor que cero.')
    if (type === 'input' && Number(quantity) > availableStock) return setError(`Stock insuficiente. Disponible: ${availableStock} ${selectedProduct.stockUnit}.`)

    setSaving(true)
    const model = {
      crop_cycle_id: campaignId,
      product_id: type === 'input' ? selectedProduct.id : null,
      stage,
      activity_type: type,
      description,
      started_at: `${date}T12:00:00`,
      quantity: quantity ? Number(quantity) : null,
      unit: type === 'input' ? selectedProduct.stockUnit : unit || null,
      unit_cost: type === 'input' ? selectedProduct.unitCost : null,
      total_cost: calculatedCost,
    }

    if (supabase) {
      const request = movement ? supabase.from('activities').update(model).eq('id', movement.id) : supabase.from('activities').insert(model)
      const saved = await request.select('*, crop_cycles(crop_name), products(name, stock_unit, unit_cost)').single()
      if (saved.error) { setError(saved.error.message); setSaving(false); return }
      const data = saved.data
      const formatted = { ...data, cycleName: data.crop_cycles?.crop_name, productName: data.products?.name }
      movement ? updateMovement(formatted) : addMovement(formatted)
      await syncInventory(movement, formatted)
      close()
      return
    }

    const campaign = campaigns.find(campaignItem => String(campaignItem.id) === String(campaignId))
    const formatted = { id: movement?.id || Date.now(), ...model, cycleName: campaign?.crop_name, productName: selectedProduct?.name }
    movement ? updateMovement(formatted) : addMovement(formatted)
    await syncInventory(movement, formatted)
    close()
  }

  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit}><button type="button" className="modal-close" onClick={close}>×</button><p className="eyebrow">{movement ? 'EDITAR MOVIMIENTO' : 'NUEVO MOVIMIENTO'}</p><h2>{movement ? 'Edita la inversión' : 'Registra una inversión'}</h2><p className="muted">Al usar un insumo, su costo se calcula y el stock se descuenta automáticamente.</p><div className="form-grid"><label className={movementStyles.fullField}>Campaña<select required value={campaignId} onChange={e => setCampaignId(e.target.value)}>{campaigns.map(c => <option value={c.id} key={c.id}>{c.crop_name} · {c.fieldName || 'Parcela'}</option>)}</select></label><label>Etapa<select value={stage} onChange={e => setStage(e.target.value)}><option value="preparation">Preparación de tierra</option><option value="planting">Siembra</option><option value="care">Cuidado</option><option value="harvest">Cosecha</option></select></label><label>Tipo de inversión<select value={type} onChange={e => setMovementType(e.target.value)}><option value="machinery">Maquinaria</option><option value="irrigation">Riego</option><option value="labor">Mano de obra / peones</option><option value="input">Insumos</option><option value="transport">Transporte</option><option value="other">Otro</option></select></label>{type === 'input' && <label className={movementStyles.fullField}>Insumo<select required value={productId} onChange={e => selectProduct(e.target.value)}><option value="">Selecciona un insumo</option>{products.map(product => <option value={product.id} key={product.id}>{product.name} · {product.stock}</option>)}</select>{selectedProduct && <small className={movementStyles.stockHint}>Disponible: {availableStock} {selectedProduct.stockUnit} · Costo: {unitMoney.format(selectedProduct.unitCost)} por {selectedProduct.stockUnit}</small>}{!products.length && <small className={movementStyles.stockWarning}>Primero agrega un insumo con stock disponible.</small>}</label>}<label className={movementStyles.fullField}>Descripción<input required value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'input' ? 'Ej. Aplicación de fertilizante' : 'Ej. Alquiler de tractor para arado'} /></label><label>Fecha<input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label>Costo total (S/)<input required type="number" min="0" step="0.01" value={type === 'input' ? calculatedCost.toFixed(2) : cost} onChange={e => setCost(e.target.value)} readOnly={type === 'input'} placeholder="0.00" /></label><label>{type === 'input' ? 'Cantidad utilizada' : 'Cantidad (opcional)'}<input required={type === 'input'} type="number" min="0" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Ej. 8" /></label><label>Unidad<select value={unit} onChange={e => setUnit(e.target.value)} disabled={type === 'input'}><option value="horas">Horas</option><option value="jornales">Jornales</option><option value="unidades">Unidades</option><option value="sacos">Sacos</option><option value="kg">Kg</option><option value="litros">Litros</option><option value="">No aplica</option></select></label></div>{error && <p className="form-error">{error}</p>}<button disabled={saving || (type === 'input' && !products.length)} className="primary full" type="submit">{saving ? 'Guardando...' : movement ? 'Guardar cambios' : 'Guardar movimiento'} {!saving && <Icon name="arrow" size={17} />}</button></form></div>
}

function Harvests({ harvests, campaigns, loading, showHarvest, editHarvest, deleteHarvest }) {
  const totalIncome = harvests.reduce((sum, harvest) => sum + Number(harvest.total_income || 0), 0)
  const totalQuantity = harvests.reduce((sum, harvest) => sum + Number(harvest.quantity || 0), 0)
  const displayDate = value => value ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : ''
  return <><div className="page-heading"><div><p className="eyebrow">RESULTADOS DE PRODUCCIÓN</p><h1>Cosechas y ventas</h1><p className="muted">Registra lo producido y los ingresos reales de cada campaña.</p></div><button className="primary" onClick={showHarvest} disabled={!campaigns.length}><Icon name="plus" size={18} />Registrar cosecha</button></div>
    {!campaigns.length ? <div className={harvestStyles.notice}><Icon name="leaf" size={20} /><span>Necesitas crear una campaña antes de registrar una cosecha.</span></div> : <section className={harvestStyles.summary}><article><span>Ingresos registrados</span><b>{money.format(totalIncome)}</b><small>Ventas y valor de cosecha</small></article><article><span>Producción registrada</span><b>{totalQuantity.toLocaleString('es-PE')} <em>{harvests[0]?.unit || 'kg'}</em></b><small>Acumulado de todas las cosechas</small></article><button onClick={showHarvest}><Icon name="plus" size={19} /><b>Registrar cosecha</b><span>Producción, precio e ingreso</span></button></section>}
    {campaigns.length > 0 && <section className={harvestStyles.panel}><div className="panel-head"><div><h2>Cosechas registradas</h2><p>Ingresos que se usarán para calcular tu utilidad.</p></div></div>{loading ? <p className={harvestStyles.loading}>Cargando cosechas…</p> : harvests.length === 0 ? <div className={harvestStyles.empty}><i><Icon name="leaf" size={27} /></i><b>Aún no registraste una cosecha.</b><span>Cuando vendas o finalices una recolección, anótala aquí.</span><button className="primary" onClick={showHarvest}>Registrar cosecha</button></div> : <div className={harvestStyles.table}>{harvests.map(h => <div className={harvestStyles.row} key={h.id}><i>♧</i><div><b>{h.cycleName || 'Campaña de cultivo'}</b><p>{displayDate(h.harvested_on)}{h.notes ? ` · ${h.notes}` : ''}</p></div><span>{h.quantity} {h.unit}</span><strong>+ {money.format(h.total_income)}</strong><Actions className={actionStyles.rowActions} onEdit={() => editHarvest(h)} onDelete={() => deleteHarvest(h)} /></div>)}</div>}</section>}</>
}

function HarvestModal({ close, campaigns, addHarvest, updateHarvest, harvest }) {
  const [campaignId, setCampaignId] = useState(harvest?.crop_cycle_id || campaigns[0]?.id || ''); const [date, setDate] = useState(harvest?.harvested_on || new Date().toISOString().slice(0, 10)); const [quantity, setQuantity] = useState(harvest?.quantity || ''); const [unit, setUnit] = useState(harvest?.unit || 'kg'); const [income, setIncome] = useState(harvest?.total_income || ''); const [notes, setNotes] = useState(harvest?.notes || '')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async e => { e.preventDefault(); setSaving(true); setError(''); const model = { crop_cycle_id: campaignId, harvested_on: date, quantity: Number(quantity), unit, total_income: Number(income), notes: notes || null }
    if (supabase) { const request = harvest ? supabase.from('harvests').update(model).eq('id', harvest.id) : supabase.from('harvests').insert(model); const saved = await request.select('*, crop_cycles(crop_name)').single(); if (saved.error) { setError(saved.error.message); setSaving(false); return }; await supabase.from('crop_cycles').update({ status: 'harvesting' }).eq('id', campaignId); const h = saved.data; const formatted = { ...h, cycleName: h.crop_cycles?.crop_name }; harvest ? updateHarvest(formatted) : addHarvest(formatted); close(); return }
    const campaign = campaigns.find(c => String(c.id) === String(campaignId)); const formatted = { id: harvest?.id || Date.now(), ...model, cycleName: campaign?.crop_name }; harvest ? updateHarvest(formatted) : addHarvest(formatted); close()
  }
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit}><button type="button" className="modal-close" onClick={close}>×</button><p className="eyebrow">{harvest ? 'EDITAR COSECHA' : 'NUEVA COSECHA'}</p><h2>{harvest ? 'Edita producción e ingreso' : 'Registra producción e ingreso'}</h2><p className="muted">Registra una o varias cosechas parciales para la misma campaña.</p><div className="form-grid"><label className={harvestStyles.fullField}>Campaña<select required value={campaignId} onChange={e => setCampaignId(e.target.value)}>{campaigns.map(c => <option value={c.id} key={c.id}>{c.crop_name} · {c.fieldName || 'Parcela'}</option>)}</select></label><label>Fecha de cosecha<input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label>Ingreso total (S/)<input required type="number" min="0" step="0.01" value={income} onChange={e => setIncome(e.target.value)} placeholder="0.00" /></label><label>Cantidad cosechada<input required type="number" min="0" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Ej. 3500" /></label><label>Unidad<select value={unit} onChange={e => setUnit(e.target.value)}><option value="kg">Kilogramos (kg)</option><option value="toneladas">Toneladas</option><option value="sacos">Sacos</option><option value="cajas">Cajas</option><option value="unidades">Unidades</option></select></label><label className={harvestStyles.fullField}>Observaciones<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. Venta a distribuidor local" /></label></div>{error && <p className="form-error">{error}</p>}<button disabled={saving} className="primary full" type="submit">{saving ? 'Guardando...' : harvest ? 'Guardar cambios' : 'Guardar cosecha'} {!saving && <Icon name="arrow" size={17} />}</button></form></div>
}

function Reports({ campaigns, movements, harvests, exportReport, exportExcel, exportPdf }) {
  const summaries = campaigns.map(campaign => {
    const costs = movements.filter(m => String(m.crop_cycle_id) === String(campaign.id)).reduce((sum, m) => sum + Number(m.total_cost || 0), 0)
    const income = harvests.filter(h => String(h.crop_cycle_id) === String(campaign.id)).reduce((sum, h) => sum + Number(h.total_income || 0), 0)
    return { ...campaign, costs, income, result: income - costs, margin: income ? ((income - costs) / income) * 100 : 0 }
  })
  const totalCost = summaries.reduce((sum, item) => sum + item.costs, 0)
  const totalIncome = summaries.reduce((sum, item) => sum + item.income, 0)
  const totalResult = totalIncome - totalCost
  const margin = totalIncome ? (totalResult / totalIncome) * 100 : 0
  const categories = movements.reduce((all, movement) => ({ ...all, [movement.activity_type]: (all[movement.activity_type] || 0) + Number(movement.total_cost || 0) }), {})
  const categoryLabels = { machinery: 'Maquinaria', irrigation: 'Riego', labor: 'Mano de obra', input: 'Insumos', transport: 'Transporte', other: 'Otros' }
  const maxCategory = Math.max(...Object.values(categories), 1)
  return <><div className="page-heading"><div><p className="eyebrow">ANÁLISIS FINANCIERO</p><h1>Reportes de rentabilidad</h1><p className="muted">El resultado se actualiza con cada gasto, cosecha o venta registrada.</p></div><div className={reportStyles.actions}><button className={reportStyles.secondary} onClick={exportExcel} disabled={!campaigns.length}>Excel</button><button className={reportStyles.secondary} onClick={exportPdf} disabled={!campaigns.length}>PDF</button><button className="primary" onClick={exportReport} disabled={!campaigns.length}>CSV</button></div></div>
    <section className={reportStyles.metrics}><article><span>Inversión total</span><b>{money.format(totalCost)}</b><small>{movements.length} movimientos registrados</small></article><article><span>Ingresos totales</span><b>{money.format(totalIncome)}</b><small>{harvests.length} cosechas o ventas</small></article><article className={totalResult >= 0 ? reportStyles.gain : reportStyles.loss}><span>{totalResult >= 0 ? 'Utilidad acumulada' : 'Pérdida acumulada'}</span><b>{money.format(Math.abs(totalResult))}</b><small>{totalIncome ? `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}% de margen` : 'Registra ingresos para calcular margen'}</small></article></section>
    {campaigns.length === 0 ? <div className={reportStyles.empty}><i><Icon name="chart" size={31} /></i><h2>Aún no hay datos para analizar.</h2><p>Crea una campaña, registra sus gastos y anota la cosecha para ver el resultado financiero.</p></div> : <section className={reportStyles.grid}><article className={reportStyles.panel}><div className="panel-head"><div><h2>Resultado por campaña</h2><p>Ingresos menos inversiones registradas.</p></div></div><div className={reportStyles.campaigns}>{summaries.map(item => <div className={reportStyles.campaign} key={item.id}><div className={reportStyles.campaignTitle}><i>♧</i><div><b>{item.crop_name}</b><small>{item.fieldName || 'Parcela'} · {item.season || 'Sin temporada'}</small></div><strong className={item.result >= 0 ? reportStyles.positive : reportStyles.negative}>{item.income ? `${item.result >= 0 ? '+' : '-'} ${money.format(Math.abs(item.result))}` : 'Sin ventas'}</strong></div><div className={reportStyles.values}><span><small>Inversión</small><b>{money.format(item.costs)}</b></span><span><small>Ingresos</small><b>{money.format(item.income)}</b></span><span><small>Margen</small><b className={item.margin >= 0 ? reportStyles.positive : reportStyles.negative}>{item.income ? `${item.margin.toFixed(1)}%` : '—'}</b></span></div></div>)}</div></article><article className={reportStyles.panel}><div className="panel-head"><div><h2>Inversión por categoría</h2><p>Distribución de tus costos.</p></div></div>{Object.keys(categories).length === 0 ? <div className={reportStyles.noData}>Registra movimientos para ver el desglose de inversión.</div> : <div className={reportStyles.bars}>{Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([category, value]) => <div className={reportStyles.bar} key={category}><div><span>{categoryLabels[category] || category}</span><b>{money.format(value)}</b></div><i><em style={{ width: `${(value / maxCategory) * 100}%` }} /></i></div>)}</div>}</article></section>}</>
}

function LiveDashboard({ products, campaigns, movements, harvests, showProduct, showCampaign }) {
  const totalCost = movements.reduce((sum, item) => sum + Number(item.total_cost || 0), 0)
  const totalIncome = harvests.reduce((sum, item) => sum + Number(item.total_income || 0), 0)
  const result = totalIncome - totalCost
  const activeCampaigns = campaigns.filter(item => item.status !== 'closed')
  const current = activeCampaigns[0]
  const stages = [['preparation', 'Preparación', '#2f8c64'], ['planting', 'Siembra', '#88bd69'], ['care', 'Cuidado', '#e7ad51'], ['harvest', 'Cosecha', '#d87d48']].map(([id, label, color]) => ({ label, color, amount: movements.filter(m => m.stage === id).reduce((sum, m) => sum + Number(m.total_cost || 0), 0) }))
  const max = Math.max(...stages.map(item => item.amount), 1)
  const date = value => value ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Sin fecha'
  const status = { planned: 'Planificada', preparation: 'Preparación', growing: 'En crecimiento', harvesting: 'En cosecha' }
  return <><div className="page-heading"><div><p className="eyebrow">VISTA GENERAL</p><h1>Buenos días, Administrador <span>🌱</span></h1><p className="muted">Aquí tienes el resumen real de tu producción.</p></div><button className="primary" onClick={showCampaign}><Icon name="plus" size={18} />Nueva campaña</button></div><section className="metrics"><Metric title="Inversión total" value={money.format(totalCost)} note={`${movements.length} movimientos registrados`} icon="receipt" /><Metric title="Ingresos registrados" value={money.format(totalIncome)} note={`${harvests.length} cosechas o ventas`} icon="trend" tone="positive" /><Metric title={result >= 0 ? 'Utilidad actual' : 'Pérdida actual'} value={money.format(Math.abs(result))} note={totalIncome ? `${result >= 0 ? '+' : ''}${((result / totalIncome) * 100).toFixed(1)}% de margen` : 'Registra ingresos para calcular'} icon="chart" tone={result >= 0 ? 'positive' : ''} /><Metric title="Cultivos activos" value={String(activeCampaigns.length)} note={`${activeCampaigns.reduce((sum, item) => sum + Number(item.area || 0), 0)} ha registradas`} icon="leaf" tone="green" /></section><section className="content-grid"><article className="panel campaign">{current ? <><div className="panel-head"><div><h2>Campaña actual</h2><p>{current.crop_name} · {current.season || 'Sin temporada'}</p></div></div><div className="campaign-info"><div className="crop-icon">♧</div><div><b>{current.fieldName || 'Parcela'}</b><p><Icon name="calendar" size={15} /> {date(current.started_on)} — {date(current.estimated_harvest_on)}</p></div><span className="status">{status[current.status] || current.status}</span></div><div className="progress-meta"><span>Estado de campaña</span><b>{status[current.status] || current.status}</b></div><div className="progress"><i style={{ width: current.status === 'growing' ? '68%' : current.status === 'harvesting' ? '90%' : '28%' }} /></div><footer><span>Inversión acumulada <b>· {money.format(movements.filter(m => String(m.crop_cycle_id) === String(current.id)).reduce((sum, m) => sum + Number(m.total_cost || 0), 0))}</b></span><span>Cosecha: {date(current.estimated_harvest_on)}</span></footer></> : <div className="placeholder"><i><Icon name="leaf" size={27} /></i><h2>Inicia tu primera campaña.</h2><p>Registra un cultivo para empezar a medir su producción.</p><button className="primary" onClick={showCampaign}>Nueva campaña</button></div>}</article><article className="panel expenses"><div className="panel-head"><div><h2>Inversión por etapa</h2><p>Todos los movimientos registrados</p></div></div><div className="bar-chart">{stages.map(item => <div className="bar-col" key={item.label}><div className="bar-value" style={{ height: `${(item.amount / max) * 138}px`, background: item.color }}><span>{money.format(item.amount)}</span></div><small>{item.label}</small></div>)}</div></article></section><section className="content-grid lower"><article className="panel activity"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados</p></div></div>{movements.length === 0 ? <div className="placeholder"><i><Icon name="receipt" size={24} /></i><h2>Sin movimientos aún.</h2><p>Registra tus inversiones para ver la actividad.</p></div> : movements.slice(0, 3).map(m => <div className="activity-row" key={m.id}><i className="activity-icon green"><Icon name="receipt" size={18} /></i><div><b>{m.description}</b><p>{m.activity_type} · {date(m.started_at?.slice(0, 10))}</p></div><strong>- {money.format(m.total_cost)}</strong></div>)}</article><article className="panel inventory"><div className="panel-head"><div><h2>Insumos recientes</h2><p>Disponibles en tu catálogo</p></div><button className="link" onClick={showProduct}>Agregar <Icon name="plus" size={14} /></button></div>{products.length === 0 ? <div className="placeholder"><i><Icon name="bag" size={24} /></i><h2>Sin insumos.</h2><p>Agrega tus primeros productos.</p></div> : products.slice(0, 2).map(p => <div className="stock-row" key={p.id}><i>{p.photo ? <img src={p.photo} alt="" /> : p.icon}</i><div><b>{p.name}</b><p>{p.category}</p></div><span>{p.stock}</span></div>)}</article></section></>
}

function Placeholder({ title, text, icon }) { return <div className="placeholder"><i><Icon name={icon} size={32} /></i><h2>{title}</h2><p>{text}</p><button className="primary">Próximamente</button></div> }

function App() {
  const [user, setUser] = useState(() => !supabase && canUseStorage ? JSON.parse(localStorage.getItem('agro-user') || 'null') : null)
  const [active, setActive] = useState('dashboard'); const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [products, setProducts] = useState(() => {
    const saved = canUseStorage ? JSON.parse(localStorage.getItem('agro-products') || 'null') : null
    return (saved || initialProducts).map(normalizeProduct)
  })
  const [campaigns, setCampaigns] = useState(() => canUseStorage ? JSON.parse(localStorage.getItem('agro-campaigns') || '[]') : [])
  const [movements, setMovements] = useState(() => canUseStorage ? JSON.parse(localStorage.getItem('agro-movements') || '[]') : [])
  const [harvests, setHarvests] = useState(() => canUseStorage ? JSON.parse(localStorage.getItem('agro-harvests') || '[]') : [])
  const [campaignsLoading, setCampaignsLoading] = useState(Boolean(supabase))
  const [movementsLoading, setMovementsLoading] = useState(Boolean(supabase))
  const [harvestsLoading, setHarvestsLoading] = useState(Boolean(supabase))
  const loadProducts = async () => {
    if (!supabase || !user?.id) return
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!error && data) setProducts(data.map(normalizeProduct))
  }
  const syncInventory = async (previous, next) => {
    if (supabase) { await loadProducts(); return }
    setProducts(current => current.map(product => {
      let stockQuantity = Number(product.stockQuantity || 0)
      if (previous?.activity_type === 'input' && String(previous.product_id) === String(product.id)) stockQuantity += Number(previous.quantity || 0)
      if (next?.activity_type === 'input' && String(next.product_id) === String(product.id)) stockQuantity -= Number(next.quantity || 0)
      return normalizeProduct({ ...product, stock_quantity: Math.max(0, stockQuantity) })
    }))
  }
  useEffect(() => localStorage.setItem('agro-products', JSON.stringify(products)), [products])
  useEffect(() => localStorage.setItem('agro-campaigns', JSON.stringify(campaigns)), [campaigns])
  useEffect(() => localStorage.setItem('agro-movements', JSON.stringify(movements)), [movements])
  useEffect(() => localStorage.setItem('agro-harvests', JSON.stringify(harvests)), [harvests])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { const authUser = data.session?.user; if (authUser) setUser({ id: authUser.id, name: authUser.user_metadata?.full_name || 'Administrador', email: authUser.email }) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { const authUser = session?.user; setUser(authUser ? { id: authUser.id, name: authUser.user_metadata?.full_name || 'Administrador', email: authUser.email } : null) })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!supabase || !user?.id) return
    loadProducts()
  }, [user?.id])
  useEffect(() => {
    if (!supabase || !user?.id) { setHarvestsLoading(false); return }
    supabase.from('harvests').select('*, crop_cycles(crop_name)').order('harvested_on', { ascending: false }).then(({ data, error }) => { if (!error && data) setHarvests(data.map(h => ({ ...h, cycleName: h.crop_cycles?.crop_name }))); setHarvestsLoading(false) })
  }, [user?.id])
  useEffect(() => {
    if (!supabase || !user?.id) { setMovementsLoading(false); return }
    supabase.from('activities').select('*, crop_cycles(crop_name), products(name, stock_unit, unit_cost)').order('started_at', { ascending: false }).then(({ data, error }) => { if (!error && data) setMovements(data.map(m => ({ ...m, cycleName: m.crop_cycles?.crop_name, productName: m.products?.name }))); setMovementsLoading(false) })
  }, [user?.id])
  useEffect(() => {
    if (!supabase || !user?.id) { setCampaignsLoading(false); return }
    supabase.from('crop_cycles').select('*, fields(id, name, area_hectares, location)').order('started_on', { ascending: false }).then(({ data, error }) => { if (!error && data) setCampaigns(data.map(c => ({ ...c, fieldId: c.fields?.id, fieldName: c.fields?.name || 'Parcela', area: c.fields?.area_hectares, location: c.fields?.location }))); setCampaignsLoading(false) })
  }, [user?.id])
  const login = u => { localStorage.setItem('agro-user', JSON.stringify(u)); setUser(u) }
  const closeCampaign = async id => {
    if (supabase) { const { error } = await supabase.from('crop_cycles').update({ status: 'closed', harvested_on: new Date().toISOString().slice(0, 10) }).eq('id', id); if (error) return }
    setCampaigns(current => current.map(campaign => campaign.id === id ? { ...campaign, status: 'closed', harvested_on: new Date().toISOString().slice(0, 10) } : campaign))
  }
  const openNew = type => { setEditing(null); setModal(type) }
  const openEdit = (type, item) => { setEditing({ type, item }); setModal(type) }
  const closeModal = () => { setModal(null); setEditing(null) }
  const updateProduct = item => setProducts(current => current.map(product => product.id === item.id ? item : product))
  const updateCampaign = item => setCampaigns(current => current.map(campaign => campaign.id === item.id ? item : campaign))
  const updateMovement = item => setMovements(current => current.map(movement => movement.id === item.id ? item : movement))
  const updateHarvest = item => setHarvests(current => current.map(harvest => harvest.id === item.id ? item : harvest))
  const deleteProduct = async item => { if (!window.confirm(`¿Eliminar el insumo “${item.name}”?`)) return; if (supabase) { const { error } = await supabase.from('products').delete().eq('id', item.id); if (error) { window.alert(error.message); return } }; setProducts(current => current.filter(product => product.id !== item.id)) }
  const deleteCampaign = async item => { if (!window.confirm(`¿Eliminar la campaña “${item.crop_name}”? También se eliminarán sus movimientos y cosechas asociados.`)) return; if (supabase) { const { error } = await supabase.from('crop_cycles').delete().eq('id', item.id); if (error) return }; setCampaigns(current => current.filter(campaign => campaign.id !== item.id)); setMovements(current => current.filter(movement => String(movement.crop_cycle_id) !== String(item.id))); setHarvests(current => current.filter(harvest => String(harvest.crop_cycle_id) !== String(item.id))) }
  const deleteMovement = async item => { if (!window.confirm(`¿Eliminar el movimiento “${item.description}”?${item.product_id ? ' El stock utilizado volverá al inventario.' : ''}`)) return; if (supabase) { const { error } = await supabase.from('activities').delete().eq('id', item.id); if (error) return; await loadProducts() } else { await syncInventory(item, null) }; setMovements(current => current.filter(movement => movement.id !== item.id)) }
  const deleteHarvest = async item => { if (!window.confirm('¿Eliminar esta cosecha y su ingreso?')) return; if (supabase) { const { error } = await supabase.from('harvests').delete().eq('id', item.id); if (error) return }; setHarvests(current => current.filter(harvest => harvest.id !== item.id)) }
  const reportRows = () => campaigns.map(campaign => { const cost = movements.filter(m => String(m.crop_cycle_id) === String(campaign.id)).reduce((sum, m) => sum + Number(m.total_cost || 0), 0); const income = harvests.filter(h => String(h.crop_cycle_id) === String(campaign.id)).reduce((sum, h) => sum + Number(h.total_income || 0), 0); return [campaign.crop_name, campaign.fieldName || '', campaign.season || '', cost, income, income - cost, income ? (income - cost) / income : 0] })
  const exportReport = () => {
    const rows = [['Campaña', 'Parcela', 'Temporada', 'Inversión (S/)', 'Ingresos (S/)', 'Resultado (S/)', 'Margen (%)'], ...reportRows().map(row => [...row.slice(0, 6).map((value, index) => index >= 3 ? Number(value).toFixed(2) : value), (row[6] * 100).toFixed(1)])]
    const content = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'); const file = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = `reporte-agrocontrol-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  const movementReportRows = () => {
    const stageLabels = { preparation: 'Preparación', planting: 'Siembra', care: 'Cuidado', harvest: 'Cosecha' }
    const typeLabels = { machinery: 'Maquinaria', irrigation: 'Riego', labor: 'Mano de obra', input: 'Insumos', transport: 'Transporte', other: 'Otro' }
    return movements.map(item => [item.started_at?.slice(0, 10) || '', item.cycleName || '', stageLabels[item.stage] || item.stage, typeLabels[item.activity_type] || item.activity_type, item.productName || '', item.description, Number(item.quantity || 0), item.unit || '', Number(item.unit_cost || 0), Number(item.total_cost || 0)])
  }
  const exportMovementsExcel = async () => {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Movimientos')
    const rows = movementReportRows()
    const total = rows.reduce((sum, row) => sum + row[9], 0)
    sheet.columns = [{ width: 14 }, { width: 24 }, { width: 17 }, { width: 18 }, { width: 24 }, { width: 36 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 18 }]
    sheet.mergeCells('A1:J1'); sheet.getCell('A1').value = 'AGROCONTROL - REPORTE DE MOVIMIENTOS'; sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164A36' } }
    sheet.addRow([`Generado: ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date())}`]); sheet.addRow([`Inversión total: ${unitMoney.format(total)}`]); sheet.addRow([])
    const header = sheet.addRow(['Fecha', 'Campaña', 'Etapa', 'Tipo', 'Insumo', 'Descripción', 'Cantidad', 'Unidad', 'Costo unitario (S/)', 'Costo total (S/)']); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF226849' } }
    rows.forEach(row => sheet.addRow(row)); sheet.getColumn(9).numFmt = '#,##0.00'; sheet.getColumn(10).numFmt = '#,##0.00'; sheet.views = [{ state: 'frozen', ySplit: 5 }]
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `movimientos-agrocontrol-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(url)
  }
  const exportMovementsPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const rows = movementReportRows()
    const total = rows.reduce((sum, row) => sum + row[9], 0)
    doc.setFillColor(22, 74, 54); doc.rect(0, 0, 297, 30, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(19); doc.text('AgroControl', 14, 14); doc.setFontSize(10); doc.text('Reporte detallado de movimientos', 14, 22)
    doc.setTextColor(34, 61, 48); doc.setFontSize(10); doc.text(`Generado: ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date())}`, 14, 39); doc.setFontSize(12); doc.text(`Inversión total: ${unitMoney.format(total)} · ${rows.length} movimientos`, 14, 48)
    autoTable(doc, { startY: 55, head: [['Fecha', 'Campaña', 'Etapa', 'Tipo', 'Insumo', 'Descripción', 'Cantidad', 'Unidad', 'C. unitario', 'Total']], body: rows.map(row => [...row.slice(0, 8), unitMoney.format(row[8]), unitMoney.format(row[9])]), headStyles: { fillColor: [34, 104, 73] }, styles: { fontSize: 6.8, cellPadding: 2 }, columnStyles: { 1: { cellWidth: 31 }, 4: { cellWidth: 30 }, 5: { cellWidth: 49 } } })
    doc.save(`movimientos-agrocontrol-${new Date().toISOString().slice(0, 10)}.pdf`)
  }
  const exportExcel = async () => {
    const ExcelJS = await import('exceljs'); const workbook = new ExcelJS.Workbook(); const summary = reportRows(); const now = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date()); const fileDate = new Date().toISOString().slice(0, 10)
    const summarySheet = workbook.addWorksheet('Resumen'); summarySheet.columns = [{ width: 28 }, { width: 24 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 13 }]; summarySheet.mergeCells('A1:G1'); summarySheet.getCell('A1').value = 'AGROCONTROL - REPORTE DE RENTABILIDAD'; summarySheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164A36' } }; summarySheet.addRow([`Generado: ${now}`]); summarySheet.addRow([]); const header = summarySheet.addRow(['Campaña', 'Parcela', 'Temporada', 'Inversión (S/)', 'Ingresos (S/)', 'Resultado (S/)', 'Margen']); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF226849' } }; summary.forEach(row => summarySheet.addRow(row)); summarySheet.getColumn(4).numFmt = '#,##0.00'; summarySheet.getColumn(5).numFmt = '#,##0.00'; summarySheet.getColumn(6).numFmt = '#,##0.00'; summarySheet.getColumn(7).numFmt = '0.0%'
    const movementSheet = workbook.addWorksheet('Movimientos'); movementSheet.columns = [{ width: 32 }, { width: 22 }, { width: 24 }, { width: 15 }, { width: 18 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }]; const movementHeader = movementSheet.addRow(['Descripción', 'Campaña', 'Insumo', 'Etapa', 'Tipo', 'Fecha', 'Cantidad', 'Unidad', 'Costo unitario (S/)', 'Costo total (S/)']); movementHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }; movementHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF226849' } }; movements.forEach(m => movementSheet.addRow([m.description, m.cycleName || '', m.productName || '', m.stage, m.activity_type, m.started_at?.slice(0, 10), Number(m.quantity || 0), m.unit || '', Number(m.unit_cost || 0), Number(m.total_cost || 0)])); movementSheet.getColumn(9).numFmt = '#,##0.00'; movementSheet.getColumn(10).numFmt = '#,##0.00'
    const harvestSheet = workbook.addWorksheet('Cosechas'); harvestSheet.columns = [{ width: 26 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 36 }]; const harvestHeader = harvestSheet.addRow(['Campaña', 'Fecha', 'Cantidad', 'Unidad', 'Ingreso (S/)', 'Observaciones']); harvestHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }; harvestHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF226849' } }; harvests.forEach(h => harvestSheet.addRow([h.cycleName || '', h.harvested_on, Number(h.quantity || 0), h.unit, Number(h.total_income || 0), h.notes || ''])); harvestSheet.getColumn(5).numFmt = '#,##0.00'
    const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `reporte-agrocontrol-${fileDate}.xlsx`; link.click(); URL.revokeObjectURL(url)
  }
  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf'); const { default: autoTable } = await import('jspdf-autotable'); const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const now = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date()); const rows = reportRows(); const totalCost = rows.reduce((sum, row) => sum + row[3], 0); const totalIncome = rows.reduce((sum, row) => sum + row[4], 0)
    doc.setFillColor(22, 74, 54); doc.rect(0, 0, 210, 31, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text('AgroControl', 14, 15); doc.setFontSize(11); doc.text('Reporte de rentabilidad por campaña', 14, 23); doc.setTextColor(34, 61, 48); doc.setFontSize(10); doc.text(`Generado: ${now}`, 14, 40); doc.setFontSize(12); doc.text(`Inversión total: ${money.format(totalCost)}`, 14, 50); doc.text(`Ingresos totales: ${money.format(totalIncome)}`, 14, 57); doc.setTextColor(totalIncome - totalCost >= 0 ? 39 : 180, totalIncome - totalCost >= 0 ? 132 : 76, totalIncome - totalCost >= 0 ? 83 : 51); doc.text(`${totalIncome - totalCost >= 0 ? 'Utilidad' : 'Pérdida'}: ${money.format(Math.abs(totalIncome - totalCost))}`, 14, 64)
    autoTable(doc, { startY: 72, head: [['Campaña', 'Parcela', 'Inversión', 'Ingresos', 'Resultado', 'Margen']], body: rows.map(row => [row[0], row[1], money.format(row[3]), money.format(row[4]), money.format(row[5]), `${(row[6] * 100).toFixed(1)}%`]), headStyles: { fillColor: [34, 104, 73] }, styles: { fontSize: 8, cellPadding: 3 }, columnStyles: { 0: { cellWidth: 37 }, 1: { cellWidth: 34 } } }); doc.save(`reporte-agrocontrol-${new Date().toISOString().slice(0, 10)}.pdf`)
  }
  if (!user) return <Auth onLogin={login} />
  const title = { equipo: ['Equipo', 'Invita personas y controla sus permisos.', 'users'] }
  const product = editing?.type === 'product' ? editing.item : null
  const campaign = editing?.type === 'campaign' ? editing.item : null
  const movement = editing?.type === 'movement' ? editing.item : null
  const harvest = editing?.type === 'harvest' ? editing.item : null
  return <div className="app">
    <SideNav active={active} setActive={setActive} onLogout={async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem('agro-user'); setUser(null) }} />
    <main className="workspace"><header className="topbar"><button className="mobile-menu">☰</button><div className="topbar-right"><button className="notification">♢<i /></button><div className="profile"><span>AD</span><div><b>{user.name}</b><small>Administrador</small></div></div></div></header><div className="page">
      {active === 'dashboard' ? <LiveDashboard products={products} campaigns={campaigns} movements={movements} harvests={harvests} showProduct={() => openNew('product')} showCampaign={() => openNew('campaign')} /> : active === 'cultivos' ? <Campaigns campaigns={campaigns} loading={campaignsLoading} showCampaign={() => openNew('campaign')} closeCampaign={closeCampaign} editCampaign={item => openEdit('campaign', item)} deleteCampaign={deleteCampaign} /> : active === 'movimientos' ? <Movements campaigns={campaigns} movements={movements} loading={movementsLoading} showMovement={() => openNew('movement')} editMovement={item => openEdit('movement', item)} deleteMovement={deleteMovement} exportExcel={exportMovementsExcel} exportPdf={exportMovementsPdf} /> : active === 'cosechas' ? <Harvests campaigns={campaigns} harvests={harvests} loading={harvestsLoading} showHarvest={() => openNew('harvest')} editHarvest={item => openEdit('harvest', item)} deleteHarvest={deleteHarvest} /> : active === 'reportes' ? <Reports campaigns={campaigns} movements={movements} harvests={harvests} exportReport={exportReport} exportExcel={exportExcel} exportPdf={exportPdf} /> : active === 'insumos' ? <Products products={products} showProduct={() => openNew('product')} editProduct={item => openEdit('product', item)} deleteProduct={deleteProduct} /> : <Placeholder title={title[active][0]} text={title[active][1]} icon={title[active][2]} />}
    </div></main>
    {modal === 'product' && <ProductModal user={user} product={product} close={closeModal} addProduct={item => setProducts(current => [item, ...current])} updateProduct={updateProduct} />}
    {modal === 'campaign' && <CampaignModal user={user} campaign={campaign} close={closeModal} addCampaign={item => setCampaigns(current => [item, ...current])} updateCampaign={updateCampaign} />}
    {modal === 'movement' && <MovementModal movement={movement} close={closeModal} campaigns={campaigns} products={products} syncInventory={syncInventory} addMovement={item => setMovements(current => [item, ...current])} updateMovement={updateMovement} />}
    {modal === 'harvest' && <HarvestModal harvest={harvest} close={closeModal} campaigns={campaigns} addHarvest={item => setHarvests(current => [item, ...current])} updateHarvest={updateHarvest} />}
  </div>
  return <div className="app"><SideNav active={active} setActive={setActive} onLogout={async () => { if (supabase) await supabase.auth.signOut(); localStorage.removeItem('agro-user'); setUser(null) }} /><main className="workspace"><header className="topbar"><button className="mobile-menu">☰</button><div className="topbar-right"><button className="notification">♢<i /></button><div className="profile"><span>AD</span><div><b>{user.name}</b><small>Administrador</small></div></div></div></header><div className="page">{active === 'dashboard' ? <LiveDashboard products={products} campaigns={campaigns} movements={movements} harvests={harvests} showProduct={() => setModal('product')} showCampaign={() => setModal('campaign')} /> : active === 'cultivos' ? <Campaigns campaigns={campaigns} loading={campaignsLoading} showCampaign={() => setModal('campaign')} closeCampaign={closeCampaign} /> : active === 'movimientos' ? <Movements campaigns={campaigns} movements={movements} loading={movementsLoading} showMovement={() => setModal('movement')} /> : active === 'cosechas' ? <Harvests campaigns={campaigns} harvests={harvests} loading={harvestsLoading} showHarvest={() => setModal('harvest')} /> : active === 'reportes' ? <Reports campaigns={campaigns} movements={movements} harvests={harvests} exportReport={exportReport} exportExcel={exportExcel} exportPdf={exportPdf} /> : active === 'insumos' ? <Products products={products} showProduct={() => setModal('product')} /> : <Placeholder title={title[active][0]} text={title[active][1]} icon={title[active][2]} />}</div></main>{modal === 'product' && <ProductModal user={user} close={() => setModal(null)} addProduct={p => setProducts([p, ...products])} />}{modal === 'campaign' && <CampaignModal user={user} close={() => setModal(null)} addCampaign={c => setCampaigns([c, ...campaigns])} />}{modal === 'movement' && <MovementModal close={() => setModal(null)} campaigns={campaigns} addMovement={m => setMovements([m, ...movements])} />}{modal === 'harvest' && <HarvestModal close={() => setModal(null)} campaigns={campaigns} addHarvest={h => setHarvests([h, ...harvests])} />}</div>
}

export default App

import { useMemo, useState } from 'react'
import type { Block, Item } from './types'
import { lineKey, mxn, useCart } from './cart'
import { useData, useSite } from './data'

function Prices({ it, b }: { it: Item; b: Block }) {
  const { add } = useCart()
  if (!it.available) return <span className="soon">Agotado</span>
  if (it.price == null) return <span className="soon">{it.label || 'Próximamente'}</span>
  const base = { itemId: it.id, name: it.name }
  if (it.bottle != null) {
    const cap = b.sub.split('·')[0].trim() || 'Copa'
    return (
      <span className="dual">
        <button onClick={() => add({ ...base, key: lineKey(b.id, it.name, it.id, cap), variant: cap, price: it.price! })} aria-label={`Agregar ${it.name}, copa`}>Copa <b>{mxn(it.price)}</b></button>
        <button onClick={() => add({ ...base, key: lineKey(b.id, it.name, it.id, 'Botella'), variant: 'Botella', price: it.bottle! })} aria-label={`Agregar ${it.name}, botella`}>Botella <b>{mxn(it.bottle)}</b></button>
      </span>
    )
  }
  return (
    <>
      <b className="price">{mxn(it.price)}</b>
      <button className="add" onClick={() => add({ ...base, key: lineKey(b.id, it.name, it.id), price: it.price! })} aria-label={`Agregar ${it.name}`}>+</button>
    </>
  )
}

export default function Menu() {
  const { menu: cats } = useData()
  const [i, setI] = useState(0)
  const [q, setQ] = useState('')
  const cat = cats[i] ?? cats[0]
  const blocks = useMemo(() => {
    const s = q.trim().toLowerCase()
    const pool = s ? cats.flatMap(c => c.blocks) : cat?.blocks ?? []
    return pool
      .map(b => ({ ...b, items: s ? b.items.filter(x => x.name.toLowerCase().includes(s)) : b.items }))
      .filter(b => b.items.length)
  }, [cats, cat, q])
  const { count, total, setOpen } = useCart()
  const { store } = useSite()
  return (
    <section id="menu" className="sec menu-sec">
      <div className="wrap">
        <div className="head"><h2>La carta</h2><p>Arma tu pedido para recoger hoy o prográmalo con hasta {store.schedule.maxDays} días de anticipación.</p></div>
        <div className="menu-layout">
          <aside className="menu-nav">
            <input className="search" type="search" placeholder="Buscar en la carta" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar en la carta" />
            <div className="tabs" role="tablist">
              {cats.map((c, n) => (
                <button key={c.tab} role="tab" aria-selected={n === i && !q} className={n === i && !q ? 'on' : ''} onClick={() => { setI(n); setQ('') }}>{c.tab}</button>
              ))}
            </div>
          </aside>
          <div className="menu-body">
            {!q && cat?.note && <p className="note">{cat.note}</p>}
            {blocks.map(b => (
              <div className="block" key={b.id}>
                <h3>{b.title}{b.sub && <small>{b.sub}</small>}</h3>
                <ul className="rows">
                  {b.items.map(it => (
                    <li className={'row' + (it.available ? '' : ' out')} key={it.id ?? it.name}>
                      <span className="name">{it.name}</span>
                      <span className="dots" aria-hidden="true" />
                      <Prices it={it} b={b} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {blocks.length === 0 && <p className="note">No encontramos "{q}". Prueba con otra palabra.</p>}
            <p className="legal">Precios en pesos mexicanos, con IVA. Propina voluntaria. Sujeto a disponibilidad. Prohibida la venta de bebidas alcohólicas a menores de edad. Bebidas energéticas con alcohol: nocivas para la salud.</p>
          </div>
        </div>
      </div>
      {count > 0 && (
        <button className="cartbar" onClick={() => setOpen(true)}>
          <span>{count} producto{count > 1 ? 's' : ''}</span><b>Ver pedido · {mxn(total)}</b>
        </button>
      )}
    </section>
  )
}

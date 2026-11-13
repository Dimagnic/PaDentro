import { useMemo, useState } from 'react'
import type { Block, Item } from './types'
import { lineKey, mxn, useCart } from './cart'
import { useData } from './data'

function Prices({ it, b }: { it: Item; b: Block }) {
  const { add } = useCart()
  if (!it.available) return <span className="soon">Agotado</span>
  if (it.price == null) return <span className="soon">{it.label || 'Próximamente'}</span>
  const base = { itemId: it.id, name: it.name }
  if (it.bottle != null) {
    const cap = b.sub.split('·')[0].trim() || 'Copa'
    return (
      <div className="dual">
        <button onClick={() => add({ ...base, key: lineKey(b.id, it.name, it.id, cap), variant: cap, price: it.price! })}>Copa <b>{mxn(it.price)}</b></button>
        <button onClick={() => add({ ...base, key: lineKey(b.id, it.name, it.id, 'Botella'), variant: 'Botella', price: it.bottle! })}>Botella <b>{mxn(it.bottle)}</b></button>
      </div>
    )
  }
  return (
    <>
      <b className="pr">{mxn(it.price)}</b>
      <button className="add" onClick={() => add({ ...base, key: lineKey(b.id, it.name, it.id), price: it.price! })}>+ Agregar</button>
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
  return (
    <section id="menu" className="sec">
      <div className="wrap">
        <div className="head">
          <div><span className="eyebrow"><i>03</i>La carta</span><h2>Nuestro menú</h2></div>
          <p>Elige tus favoritos y arma tu pedido. Lo enviamos directo a WhatsApp.</p>
        </div>
        <div className="filters">
          {cats.map((c, n) => (
            <button key={c.tab} className={n === i && !q ? 'on' : ''} onClick={() => { setI(n); setQ('') }}>{c.tab}</button>
          ))}
          <input className="search" placeholder="Buscar en la carta…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {!q && cat?.note && <p className="note">{cat.note}</p>}
        <p className="count">{blocks.reduce((a, b) => a + b.items.length, 0)} productos</p>
        {blocks.map(b => (
          <div className="block" key={b.id}>
            <h3>{b.title}{b.sub && <small>{b.sub}</small>}</h3>
            <div className="cards">
              {b.items.map(it => (
                <article className={'card' + (it.available ? '' : ' out')} key={it.id ?? it.name}>
                  <h4>{it.name}</h4>
                  <div className="row"><Prices it={it} b={b} /></div>
                </article>
              ))}
            </div>
          </div>
        ))}
        {blocks.length === 0 && <p className="note">No encontramos "{q}". Prueba con otra palabra.</p>}
        <p className="legal">Precios en pesos mexicanos, con IVA. Propina voluntaria. Sujeto a disponibilidad. Prohibida la venta de bebidas alcohólicas a menores de edad. Bebidas energéticas con alcohol: nocivas para la salud.</p>
      </div>
    </section>
  )
}

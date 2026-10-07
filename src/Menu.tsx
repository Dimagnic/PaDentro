import { useMemo, useState } from 'react'
import data from './menu.json'
import type { Category, Item } from './types'
import { mxn, useCart } from './cart'

const cats = data as Category[]
const num = (s: string) => Number(s.replace(/,/g, ''))

function Prices({ it, sub }: { it: Item; sub: string }) {
  const { add } = useCart()
  const parts = it.price.split('/')
  if (!/\d/.test(it.price)) return <span className="soon">{it.price}</span>
  if (parts.length === 2) {
    const [cap] = sub.split('·')
    return (
      <div className="dual">
        <button onClick={() => add(it.name, num(parts[0]), cap.trim())}>Copa <b>{mxn(num(parts[0]))}</b></button>
        <button onClick={() => add(it.name, num(parts[1]), 'Botella')}>Botella <b>{mxn(num(parts[1]))}</b></button>
      </div>
    )
  }
  return (
    <>
      <b className="pr">{mxn(num(it.price))}</b>
      <button className="add" onClick={() => add(it.name, num(it.price))}>+ Agregar</button>
    </>
  )
}

export default function Menu() {
  const [i, setI] = useState(0)
  const [q, setQ] = useState('')
  const cat = cats[i]
  const blocks = useMemo(() => {
    const s = q.trim().toLowerCase()
    const pool = s ? cats.flatMap(c => c.blocks) : cat.blocks
    return pool
      .map(b => ({ ...b, items: s ? b.items.filter(x => x.name.toLowerCase().includes(s)) : b.items }))
      .filter(b => b.items.length)
  }, [i, q])
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
        {!q && cat.note && <p className="note">{cat.note}</p>}
        <p className="count">{blocks.reduce((a, b) => a + b.items.length, 0)} productos</p>
        {blocks.map(b => (
          <div className="block" key={b.title}>
            <h3>{b.title}{b.sub && <small>{b.sub}</small>}</h3>
            <div className="cards">
              {b.items.map(it => (
                <article className="card" key={it.name}>
                  <h4>{it.name}</h4>
                  <div className="row"><Prices it={it} sub={b.sub} /></div>
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

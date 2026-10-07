import { useState } from 'react'
/** Muestra /images/<src>; si el archivo no existe, cae a un fondo de marca. */
export default function Photo({ src, label, className = '' }: { src: string; label?: string; className?: string }) {
  const [bad, setBad] = useState(false)
  return (
    <div className={'photo ' + className}>
      {!bad && <img src={`/images/${src}`} alt={label ?? ''} loading="lazy" onError={() => setBad(true)} />}
      {bad && <span>{label ?? "PA'DENTRO"}</span>}
    </div>
  )
}

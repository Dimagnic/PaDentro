import { useEffect, useState } from 'react'

/** URL de una imagen del sitio: acepta una URL completa o un archivo de public/images/. */
export const imgUrl = (src: string) => (/^https?:\/\//.test(src) || src.startsWith('/') ? src : `/images/${src}`)

/** Muestra la imagen; si no existe o está vacía, cae a un fondo de marca. */
export default function Photo({ src, label, className = '' }: { src: string; label?: string; className?: string }) {
  const [bad, setBad] = useState(!src)
  useEffect(() => setBad(!src), [src])
  return (
    <div className={'photo ' + className}>
      {!bad && <img src={imgUrl(src)} alt={label ?? ''} loading="lazy" onError={() => setBad(true)} />}
      {bad && <span>{label ?? "PA'DENTRO"}</span>}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { addDays, dayAvailable, MONTHS, nowMx, slotsFor, timeLabel, type Schedule } from './content'
import Icon from './icons'

export interface When { date: string; time: string }

/** Calendario mensual + horarios disponibles para programar un pedido. */
export default function DatePicker({ schedule, value, onChange }: { schedule: Schedule; value: When | null; onChange: (w: When | null) => void }) {
  const today = nowMx().date
  const last = addDays(today, schedule.maxDays)
  const [month, setMonth] = useState(() => (value?.date ?? today).slice(0, 7))
  const [y, m] = month.split('-').map(Number)

  const days = useMemo(() => {
    const first = `${month}-01`
    const lead = new Date(first + 'T12:00:00Z').getUTCDay()
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const cells: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)
    return cells
  }, [month, y, m])

  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(d.toISOString().slice(0, 7)) }
  const canPrev = month > today.slice(0, 7)
  const canNext = month < last.slice(0, 7)
  const slots = value ? slotsFor(schedule, value.date) : []

  return (
    <div className="dp">
      <div className="dp-head">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Mes anterior"><Icon name="arrowL" size={18} /></button>
        <b>{MONTHS[m - 1]} {y}</b>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label="Mes siguiente"><Icon name="arrowR" size={18} /></button>
      </div>
      <div className="dp-grid" role="grid">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => <span key={i} className="dp-dow">{d}</span>)}
        {days.map((d, i) => d == null ? <span key={i} /> : (
          <button type="button" key={d} disabled={!dayAvailable(schedule, d)}
            className={(value?.date === d ? 'on ' : '') + (d === today ? 'today' : '')}
            onClick={() => { const s = slotsFor(schedule, d); onChange({ date: d, time: value?.date === d ? value.time : s[0] ?? '' }) }}>
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
      {value && (
        <div className="dp-slots">
          <span>Hora para recoger</span>
          <div>
            {slots.map(t => <button type="button" key={t} className={value.time === t ? 'on' : ''} onClick={() => onChange({ ...value, time: t })}>{timeLabel(t)}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}

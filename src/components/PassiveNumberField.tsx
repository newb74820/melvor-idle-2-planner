export default function PassiveNumberField({ label, value, onChange, min = 0, step = 'any' }: {
  label: string; value: string | number; onChange: (value: string) => void; min?: number; step?: number | 'any';
}) {
  return <label>
    <span className="field-label">{label}</span>
    <span className="number-input-wrap">
      <input type="number" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </span>
  </label>;
}

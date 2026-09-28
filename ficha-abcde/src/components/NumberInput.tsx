import { useState } from 'react';

interface Props {
  label: string;
  value: number | null;
  /** Converte o texto digitado; null = inválido/vazio. */
  parse: (s: string) => number | null;
  onChange: (n: number | null) => void;
  inputMode?: 'numeric' | 'decimal';
  disabled?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
}

/** Campo numérico tolerante: mantém o texto digitado e só propaga valores válidos. */
export function NumberInput({
  label,
  value,
  parse,
  onChange,
  inputMode = 'numeric',
  disabled,
  hideLabel,
  placeholder,
}: Props) {
  const [text, setText] = useState(value === null ? '' : String(value));
  // Sincroniza quando o valor muda por fora (ex.: reps preenchidas ao marcar a série).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (value !== parse(text))
      setText(value === null ? '' : String(value).replace('.', ','));
  }
  const invalid = text.trim() !== '' && parse(text) === null;
  return (
    <label className="field">
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        enterKeyHint="done"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parse(e.target.value));
        }}
      />
    </label>
  );
}

import { useState } from 'react';

interface Props {
  label: string;
  value: number | null;
  /** Converte o texto digitado; null = inválido/vazio. */
  parse: (s: string) => number | null;
  onChange: (n: number | null) => void;
  inputMode?: 'numeric' | 'decimal';
  disabled?: boolean;
}

/** Campo numérico tolerante: mantém o texto digitado e só propaga valores válidos. */
export function NumberInput({
  label,
  value,
  parse,
  onChange,
  inputMode = 'numeric',
  disabled,
}: Props) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const invalid = text.trim() !== '' && parse(text) === null;
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        enterKeyHint="done"
        autoComplete="off"
        value={text}
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

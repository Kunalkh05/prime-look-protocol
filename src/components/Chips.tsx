import { useRef, type KeyboardEvent } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface ChipsProps<T extends string> {
  label: string;
  /** shows an "AI estimate" tag when the value was auto-detected */
  detected?: boolean;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  hint?: string;
}

/**
 * A radiogroup built from buttons.
 *
 * ARIA's radiogroup pattern promises arrow-key navigation and a single tab
 * stop; the markup claimed the role without implementing either, which left
 * keyboard users tabbing through every option in the form one at a time.
 */
export function Chips<T extends string>({
  label,
  detected,
  options,
  value,
  onChange,
  hint,
}: ChipsProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  // The focusable one: the selection, or the first option when nothing is set.
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const focusAt = (index: number) => {
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[index]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % options.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + options.length) % options.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = options.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    // Arrow keys both move focus and select, per the radiogroup pattern.
    onChange(options[next].value);
    focusAt(next);
  };

  return (
    <div>
      <span className="q-label" id={`lbl-${label.replace(/\W+/g, "-")}`}>
        {label}
        {detected && <span className="tag">AI estimate · adjust if wrong</span>}
      </span>
      <div
        ref={groupRef}
        className="chips"
        role="radiogroup"
        aria-labelledby={`lbl-${label.replace(/\W+/g, "-")}`}
      >
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={i === activeIndex ? 0 : -1}
            className={`chip${value === o.value ? " on" : ""}`}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

"use client";

import { Check, Minus } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "./TableCheckbox.module.css";

export default function TableCheckbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  ariaLabel,
  className = "",
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <label
      className={`${styles.checkbox} ${disabled ? styles.disabled : ""} ${className}`.trim()}
      aria-disabled={disabled || undefined}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        aria-label={ariaLabel}
      />
      <span className={styles.visual} aria-hidden="true">
        {indeterminate ? <Minus size={12} strokeWidth={3} /> : checked ? <Check size={12} strokeWidth={3} /> : null}
      </span>
    </label>
  );
}

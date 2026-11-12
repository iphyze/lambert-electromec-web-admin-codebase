"use client";

import { CalendarDays, X } from "lucide-react";
import DatePicker from "react-datepicker";
import styles from "./AppDatePicker.module.css";

function parseLocalValue(value, mode) {
  if (!value) return null;
  const text = String(value);
  const [datePart, timePart = "00:00"] = text.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, mode === "datetime" ? hour : 0, mode === "datetime" ? minute : 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalValue(date, mode) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (mode === "date") return datePart;
  return `${datePart}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AppDatePicker({
  value = "",
  onChange,
  mode = "date",
  placeholder,
  disabled = false,
  ariaLabel,
  minDate,
  maxDate,
  className = "",
  clearable = true,
  timeIntervals = 15,
  invalid = false,
  ariaDescribedBy,
}) {
  const selected = parseLocalValue(value, mode);
  const isDateTime = mode === "datetime";

  return (
    <div className={`${styles.wrap} ${disabled ? styles.disabled : ""} ${invalid ? styles.invalid : ""} ${className}`.trim()}>
      <CalendarDays className={styles.leadingIcon} size={15} aria-hidden="true" />
      <DatePicker
        selected={selected}
        onChange={(date) => onChange?.(formatLocalValue(date, mode))}
        showTimeSelect={isDateTime}
        timeIntervals={timeIntervals}
        timeCaption="Time"
        dateFormat={isDateTime ? "MMM d, yyyy · h:mm aa" : "MMM d, yyyy"}
        placeholderText={placeholder || (isDateTime ? "Select date and time" : "Select date")}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        className={styles.input}
        calendarClassName={styles.calendar}
        popperClassName={styles.popper}
        popperPlacement="bottom-start"
        portalId="app-datepicker-portal"
        aria-label={ariaLabel || placeholder || (isDateTime ? "Select date and time" : "Select date")}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
      />
      {clearable && value && !disabled ? (
        <button
          type="button"
          className={styles.clearButton}
          onClick={() => onChange?.("")}
          aria-label="Clear selected date"
        >
          <X size={13} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

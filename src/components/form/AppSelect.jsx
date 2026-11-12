"use client";

import { useId, useMemo, useState, useEffect } from "react";
import Select from "react-select";
import styles from "./AppSelect.module.css";

export default function AppSelect({
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  ariaLabel,
  name,
  className = "",
  isSearchable = true,
  isClearable = false,
  menuPlacement = "auto",
  invalid = false,
  ariaDescribedBy,
}) {
  const reactId = useId();
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const normalizedOptions = useMemo(
    () => options.map((option) => ({
      ...option,
      value: String(option.value ?? ""),
      label: String(option.label ?? ""),
    })),
    [options],
  );

  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => String(option.value) === String(value ?? "")) || null,
    [normalizedOptions, value],
  );

  return (
    <div className={`${styles.wrap} ${disabled ? styles.disabled : ""} ${invalid ? styles.invalid : ""} ${className}`.trim()}>
      <Select
        unstyled
        instanceId={`app-select-${reactId}`}
        inputId={`app-select-input-${reactId}`}
        name={name}
        value={selectedOption}
        options={normalizedOptions}
        onChange={(option) => onChange?.(option?.value ?? "")}
        placeholder={placeholder}
        isDisabled={disabled}
        isSearchable={isSearchable}
        isClearable={isClearable}
        menuPlacement={menuPlacement}
        menuPortalTarget={portalTarget}
        menuPosition="fixed"
        aria-label={ariaLabel || placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        classNames={{
          control: ({ isFocused }) => `${styles.control} ${isFocused ? styles.controlFocused : ""}`.trim(),
          valueContainer: () => styles.valueContainer,
          placeholder: () => styles.placeholder,
          singleValue: () => styles.singleValue,
          input: () => styles.searchInput,
          indicatorsContainer: () => styles.indicators,
          dropdownIndicator: ({ selectProps }) => `${styles.dropdownIndicator} ${selectProps.menuIsOpen ? styles.dropdownIndicatorOpen : ""}`.trim(),
          clearIndicator: () => styles.clearIndicator,
          indicatorSeparator: () => styles.separator,
          menuPortal: () => styles.menuPortal,
          menu: () => styles.menu,
          menuList: () => styles.menuList,
          option: ({ isFocused, isSelected, isDisabled }) => [
            styles.option,
            isFocused ? styles.optionFocused : "",
            isSelected ? styles.optionSelected : "",
            isDisabled ? styles.optionDisabled : "",
          ].filter(Boolean).join(" "),
          noOptionsMessage: () => styles.noOptions,
        }}
      />
    </div>
  );
}

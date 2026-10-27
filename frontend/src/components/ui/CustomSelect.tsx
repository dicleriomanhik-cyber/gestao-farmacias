import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function CustomSelect({ options, value, onChange, placeholder = "Seleciona…", disabled = false, style }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", ...style }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "0.4rem 0.6rem",
          backgroundColor: disabled ? "#f3f4f6" : "white",
          border: open ? "2px solid #2563eb" : "1px solid #e2e8f0",
          borderRadius: "6px",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
          color: selected ? "#1e293b" : "#94a3b8",
          outline: "none",
          boxShadow: open ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
          transition: "all 0.2s",
          ...style,
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            maxHeight: "250px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: "0.4rem 0.6rem",
                cursor: opt.disabled ? "not-allowed" : "pointer",
                backgroundColor: opt.value === value ? "#eff6ff" : "white",
                color: opt.disabled ? "#94a3b8" : opt.value === value ? "#2563eb" : "#1e293b",
                fontWeight: opt.value === value ? "bold" : "normal",
                borderBottom: "1px solid #f1f5f9",
              }}
              onMouseEnter={(e) => {
                if (!opt.disabled && opt.value !== value) {
                  (e.target as HTMLDivElement).style.backgroundColor = "#f8fafc";
                }
              }}
              onMouseLeave={(e) => {
                if (!opt.disabled && opt.value !== value) {
                  (e.target as HTMLDivElement).style.backgroundColor = "white";
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


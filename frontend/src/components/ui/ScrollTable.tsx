import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export default function ScrollTable({ children, reserve = 28 }: { children: ReactNode; reserve?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(300);

  function ajustar() {
    if (!ref.current) return;
    const topo = ref.current.getBoundingClientRect().top;
    const novo = Math.max(200, Math.round(window.innerHeight - topo - reserve));
    setH((atual) => (atual === novo ? atual : novo));
  }

  useEffect(() => {
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  useEffect(() => {
    ajustar();
  });

  return (
    <div
      ref={ref}
      style={{ height: h, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <div className="scroll-table" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
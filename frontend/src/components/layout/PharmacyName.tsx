import { useEffect, useState } from "react";
import { apiClient } from "../../services/api";

export default function PharmacyName({ fallback }: { fallback: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    apiClient
      .get("/pharmacy")
      .then((resp) => {
        const d = resp.data?.data;
        const n = d?.tradeName || d?.name;
        if (vivo && n) setName(String(n));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  return <>{name ?? fallback}</>;
}
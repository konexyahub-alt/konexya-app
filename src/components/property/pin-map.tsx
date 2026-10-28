"use client";

import { useEffect, useRef, useState } from "react";
import { Button, HelpTip, Icon } from "@/components/ui";

const FORTALEZA = { lat: -3.7319, lng: -38.5267 };

type Pin = { lat: number; lng: number };

declare global {
  interface Window {
    google?: { maps: GoogleMaps };
    __konexyaMaps?: Promise<void>;
  }
}
// Tipagem mínima do que usamos do Maps JS.
type GoogleMaps = {
  Map: new (el: HTMLElement, opts: object) => { setCenter(p: Pin): void; setZoom(z: number): void };
  Marker: new (opts: object) => {
    getPosition(): { lat(): number; lng(): number } | null;
    setPosition(p: Pin): void;
    addListener(event: string, fn: () => void): void;
  };
  Geocoder: new () => {
    geocode(req: object): Promise<{ results: { geometry: { location: { lat(): number; lng(): number } } }[] }>;
  };
};

function loadMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  window.__konexyaMaps ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=pt-BR&region=BR`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("maps"));
    document.head.appendChild(s);
  });
  return window.__konexyaMaps;
}

/**
 * Mapa para confirmar o pino do imóvel. Sem a chave do Google (variável
 * NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY), mostra um aviso e o pino fica pendente.
 */
export function PinMap({
  address,
  value,
  confirmed,
  onChange,
}: {
  address: string;
  value: Pin | null;
  confirmed: boolean;
  onChange: (pin: Pin | null, confirmed: boolean) => void;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  const el = useRef<HTMLDivElement>(null);
  const marker = useRef<InstanceType<GoogleMaps["Marker"]> | null>(null);
  const map = useRef<InstanceType<GoogleMaps["Map"]> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">(key ? "loading" : "error");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!key || !el.current) return;
    let alive = true;
    loadMaps(key)
      .then(() => {
        if (!alive || !el.current || !window.google) return;
        const g = window.google.maps;
        const start = value ?? FORTALEZA;
        map.current = new g.Map(el.current, { center: start, zoom: value ? 17 : 12, disableDefaultUI: true, zoomControl: true });
        marker.current = new g.Marker({ position: start, map: map.current, draggable: true });
        marker.current.addListener("dragend", () => {
          const p = marker.current?.getPosition();
          if (p) onChange({ lat: p.lat(), lng: p.lng() }, false);
        });
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function locate() {
    if (!window.google || !address.trim()) return;
    setLocating(true);
    try {
      const { results } = await new window.google.maps.Geocoder().geocode({ address: `${address}, Fortaleza - CE, Brasil` });
      const loc = results[0]?.geometry.location;
      if (loc) {
        const p = { lat: loc.lat(), lng: loc.lng() };
        marker.current?.setPosition(p);
        map.current?.setCenter(p);
        map.current?.setZoom(17);
        onChange(p, false);
      }
    } finally {
      setLocating(false);
    }
  }

  if (state === "error") {
    return (
      <div className="grid gap-1 rounded-[14px] border border-dashed border-line-2 p-4 text-[13px] text-muted">
        <b className="text-ink">Mapa indisponível no momento.</b>
        <span>O pino poderá ser confirmado quando o mapa estiver ativo. Até lá, o anúncio fica sem o selo.</span>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div ref={el} className="h-[220px] rounded-[14px] bg-paper-2" aria-label="Mapa para posicionar o imóvel" />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => void locate()} loading={locating} disabled={state !== "ready"}>
          <Icon name="pin" size="sm" /> Localizar endereço
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={state !== "ready" || !value || confirmed}
          onClick={() => value && onChange(value, true)}
        >
          {confirmed ? "Pino confirmado" : "Confirmar pino aqui"}
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          Arraste o pino até a entrada do prédio.
          <HelpTip label="Confirmar pino">
            O pino marca onde o imóvel fica de verdade. É ele que vai calcular os tempos de trajeto para os clientes no
            Mapa Vivo. Confirmar diz que você conferiu a posição, e conta para o selo Anúncio completo.
          </HelpTip>
        </span>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Star } from "lucide-react";
import { api } from "../lib/api";
import type { Point, SavedPlace } from "../lib/types";

interface Props {
  label: string;
  value: Point | null;
  onChange: (p: Point | null) => void;
  savedPlaces?: SavedPlace[];
  placeholder?: string;
}

interface GeoResult {
  address: string;
  lat: number;
  lng: number;
}

export default function PlaceInput({ label, value, onChange, savedPlaces = [], placeholder }: Props) {
  const [q, setQ] = useState(value?.addr ?? "");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQ(value?.addr ?? "");
  }, [value?.addr]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function search(text: string) {
    setQ(text);
    setOpen(true);
    clearTimeout(timer.current);
    if (text.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get<GeoResult[]>("/places/geocode", { params: { q: text } });
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function pick(r: GeoResult) {
    onChange({ addr: r.address, lat: r.lat, lng: r.lng });
    setQ(r.address);
    setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <label className="label">{label}</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          value={q}
          placeholder={placeholder ?? "Search a place…"}
          onChange={(e) => search(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>

      {open && (savedPlaces.length > 0 || results.length > 0) && (
        <div className="absolute z-[1000] mt-1 max-h-72 w-full overflow-auto ring-1 ring-black/10 bg-white py-1 shadow-brutal">
          {savedPlaces.length > 0 && q.trim().length < 3 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-400">Saved places</div>
              {savedPlaces.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
                  onClick={() => pick({ address: p.address, lat: p.lat, lng: p.lng } as GeoResult)}
                >
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="font-medium">{p.label}</span>
                  <span className="truncate text-slate-400">· {p.address}</span>
                </button>
              ))}
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              onClick={() => pick(r)}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="line-clamp-2">{r.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

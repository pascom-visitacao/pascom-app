"use client";

import { useMemo, useRef, useState } from "react";

export type SearchableEvent = { id: string; title: string; date: string };

const MAX_RESULTS = 8;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Proximidade de agora, futuros antes de passados em caso de empate raro
// (mesma distância exata pra um e pro outro).
function sortByProximity(events: SearchableEvent[]) {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const diffA = new Date(a.date).getTime() - now;
    const diffB = new Date(b.date).getTime() - now;
    return Math.abs(diffA) - Math.abs(diffB) || diffB - diffA;
  });
}

export function EventSearchField({ name, events }: { name: string; events: SearchableEvent[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchableEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const matches = query.trim()
      ? events.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase()))
      : events;
    return sortByProximity(matches).slice(0, MAX_RESULTS);
  }, [query, events]);

  function selectEvent(event: SearchableEvent) {
    setSelected(event);
    setQuery("");
    setIsOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input type="hidden" name={name} value={selected?.id ?? ""} />

      {selected ? (
        <div
          className="input-wrap flex items-center justify-between"
          style={{ paddingRight: "var(--space-2)" }}
        >
          <span style={{ fontSize: "var(--text-sm)" }}>
            {selected.title} <span style={{ color: "var(--color-text-subtle)" }}>· {formatDate(selected.date)}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearSelection}
            aria-label="Limpar evento selecionado"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="input-wrap">
          <input
            type="text"
            placeholder="Buscar evento..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // pequeno atraso pra permitir o clique num resultado antes
              // do dropdown fechar por perda de foco
              setTimeout(() => setIsOpen(false), 150);
            }}
          />
        </div>
      )}

      {isOpen && !selected && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 10,
            padding: "var(--space-2)",
            maxHeight: 260,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {results.length > 0 ? (
            results.map((event) => (
              <button
                key={event.id}
                type="button"
                className="flex items-center justify-between"
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectEvent(event)}
              >
                <span>{event.title}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-subtle)" }}>
                  {formatDate(event.date)}
                </span>
              </button>
            ))
          ) : (
            <span style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-subtle)" }}>
              Nenhum evento encontrado.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

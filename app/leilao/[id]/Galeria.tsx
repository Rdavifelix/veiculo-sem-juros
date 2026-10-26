"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Galeria da ficha: setas, miniaturas, teclado (← →) e arrastar no celular, tudo na mesma página.
 * Nenhuma foto abre em outra aba.
 */
export function Galeria({ fotos, titulo, selo }: { fotos: string[]; titulo: string; selo: { texto: string; urgente: boolean } }) {
  const [i, setI] = useState(0);
  const toque = useRef<number | null>(null);
  const tira = useRef<HTMLDivElement>(null);
  const n = fotos.length;
  const ir = (k: number) => setI(((k % n) + n) % n);

  useEffect(() => {
    if (n < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") ir(i + 1);
      if (e.key === "ArrowLeft") ir(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Mantém a miniatura ativa visível na tira.
  useEffect(() => {
    tira.current?.children[i]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [i]);

  if (n === 0) {
    return (
      <div className="relative aspect-[4/3] bg-neutral-100">
        <div className="grid h-full place-items-center text-neutral-400">Imagem não disponível</div>
        <Selo selo={selo} />
      </div>
    );
  }

  return (
    <>
      <div
        className="relative aspect-[4/3] select-none bg-neutral-100"
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current == null) return;
          const dx = e.changedTouches[0].clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 40) ir(dx < 0 ? i + 1 : i - 1);
        }}
      >
        <Image key={fotos[i]} src={fotos[i]} alt={`${titulo} — foto ${i + 1} de ${n}`} fill sizes="(min-width:1024px) 820px, 100vw" className="object-contain" unoptimized priority={i === 0} />
        <Selo selo={selo} />
        {n > 1 && (
          <>
            <button type="button" onClick={() => ir(i - 1)} aria-label="Foto anterior" className={seta + " left-2"}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m15 5-7 7 7 7" /></svg>
            </button>
            <button type="button" onClick={() => ir(i + 1)} aria-label="Próxima foto" className={seta + " right-2"}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m9 5 7 7-7 7" /></svg>
            </button>
            <span className="absolute bottom-3 right-3 rounded-sm bg-black/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div ref={tira} className="flex snap-x gap-2 overflow-x-auto p-3 [scrollbar-width:thin]">
          {fotos.map((f, k) => (
            <button
              key={f}
              type="button"
              onClick={() => ir(k)}
              aria-label={`Ver foto ${k + 1}`}
              aria-current={k === i}
              className={`relative h-16 w-24 shrink-0 snap-start overflow-hidden rounded-sm bg-neutral-100 ring-2 ring-offset-1 transition sm:h-20 sm:w-28 ${k === i ? "ring-[var(--azul)]" : "ring-transparent opacity-80 hover:opacity-100"}`}
            >
              <Image src={f} alt="" fill sizes="112px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const seta =
  "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-neutral-800 shadow-md hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--azul)]";

function Selo({ selo }: { selo: { texto: string; urgente: boolean } }) {
  return (
    <span className={`absolute right-3 top-3 rounded-sm px-2 py-0.5 text-xs font-semibold shadow-sm ${selo.urgente ? "bg-[var(--laranja)] text-white" : "bg-white/95"}`}>{selo.texto}</span>
  );
}

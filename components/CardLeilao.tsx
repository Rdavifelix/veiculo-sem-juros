import Image from "next/image";
import Link from "next/link";
import type { LeilaoVitrine } from "@/lib/leiloes/tipos";
import { capitalizarTitulo, formatarDataHora, formatarMilhar, formatarReais, partesReais, rotuloEncerramento } from "@/lib/formatar";

export function CardLeilao({ leilao: l }: { leilao: LeilaoVitrine }) {
  const enc = rotuloEncerramento(l.encerra_em);
  const foto = l.fotos[0];
  const titulo = capitalizarTitulo(l.titulo);
  const local = [l.cidade, l.uf].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col overflow-hidden rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,.12)] transition-shadow hover:shadow-[0_7px_16px_rgba(0,0,0,.2)]">
      <div className="relative aspect-square w-full bg-neutral-100">
        {foto ? (
          <Image src={foto} alt={titulo} fill sizes="(min-width:1024px) 280px, (min-width:640px) 45vw, 90vw" className="object-cover" unoptimized />
        ) : (
          <div className="grid h-full place-items-center text-sm text-neutral-400">Imagem não disponível</div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-sm px-2 py-0.5 text-xs font-semibold shadow-sm ${
            enc.encerrado ? "bg-neutral-200 text-neutral-600" : enc.urgente ? "bg-[var(--laranja)] text-white" : "bg-white/95 text-neutral-800"
          }`}
        >
          {enc.urgente && <span aria-hidden>⚡ </span>}
          {enc.texto}
        </span>
        {l.parcelavel ? (
          <span className="absolute bottom-3 left-3 rounded-sm bg-[var(--azul)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Entrada 25% · até 30x
          </span>
        ) : l.sinistro && l.sinistro !== "sem sinistro" ? (
          <span className="absolute bottom-3 left-3 rounded-sm bg-neutral-900/85 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Recuperável · {l.sinistro}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] leading-snug text-neutral-800">{titulo}</h3>
        <p className="mt-1 text-sm">
          <span className="font-bold text-neutral-800">{l.leiloeiro}</span>
          {l.plataforma && <span className="text-neutral-500"> por {l.plataforma}</span>}
          {l.comitente && <span className="text-neutral-500"> · vende {l.comitente}</span>}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {l.ano && <span>{l.ano}</span>}
          {l.ano && local && <span> | </span>}
          {local && <span>{local}</span>}
          {l.visitas != null && <span> | {formatarMilhar(l.visitas)} visitas</span>}
          {l.lances ? <span> | {l.lances} lances</span> : null}
        </p>

        <div className="mt-3">
          {l.valorDe && <p className="text-xs text-neutral-500 line-through">1ª praça {formatarReais(l.valorDe)}</p>}
          <p className="flex flex-wrap items-baseline gap-2">
            {l.valor != null ? (
              <Preco valor={l.valor} />
            ) : (
              <span className="text-lg font-semibold text-neutral-700">Lance a definir</span>
            )}
            {l.descontoPct ? (
              <span className="rounded-sm bg-[var(--verde)] px-1.5 py-0.5 text-sm font-semibold text-white">{l.descontoPct}% OFF</span>
            ) : null}
          </p>
          <p className="text-xs text-neutral-600">
            {l.lance_atual != null ? "lance atual" : l.lance_2 != null ? "2ª praça" : "lance inicial"}
          </p>
          {l.parcelavel ? (
            <p className="mt-1 text-sm text-[var(--verde)]">
              entrada de 25% e <span className="font-semibold">até 30x</span> sem juros*
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-600">pagamento à vista</p>
          )}
          {l.encerra_em && !enc.encerrado && (
            <p className="mt-2 text-sm font-semibold text-[var(--verde)]">Encerra {formatarDataHora(l.encerra_em)}</p>
          )}
        </div>

        <Link
          href={`/login?leilao=${encodeURIComponent(l.id)}`}
          className="mt-auto flex items-center justify-center gap-2 rounded-sm border border-[var(--azul)] py-2 pt-2 text-sm font-semibold text-[var(--azul)] hover:bg-[var(--azul)]/5"
          style={{ marginTop: "0.9rem" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Acessar leilão
        </Link>
      </div>
    </article>
  );
}

function Preco({ valor }: { valor: number }) {
  const { inteiro, centavos } = partesReais(valor);
  return (
    <span className="text-2xl font-normal leading-none text-neutral-900">
      <span className="text-base">R$ </span>
      {inteiro}
      {centavos && <sup className="text-xs">{centavos}</sup>}
    </span>
  );
}

import Image from "next/image";
import { COMPARATIVO, type Cartao } from "@/lib/conversa/fluxo";

/** Resumo de lote que o funil mostra (sem link do leiloeiro). */
export interface LoteConversa {
  id: string;
  titulo: string;
  foto: string | null;
  local: string;
  valor: string;
  valorDe: string | null;
  descontoPct: number | null;
  parcelavel: boolean;
}

export interface DadosCartoes {
  lotes: LoteConversa[];
  preco: string;
  total: number;
}

/**
 * "Imagens" do funil desenhadas em HTML (ficam nítidas em qualquer tela e mudam junto com os dados):
 * mock do app, trecho da lei, lotes reais, comparativo de preço e preço final.
 */
export function CartaoConversa({ cartao, dados }: { cartao: Cartao; dados: DadosCartoes }) {
  switch (cartao) {
    case "app":
      return <CartaoApp dados={dados} />;
    case "lei":
      return <CartaoLei />;
    case "lotes":
      return <CartaoLotes lotes={dados.lotes} />;
    case "comparativo":
      return <CartaoComparativo />;
    case "preco":
      return <CartaoPreco preco={dados.preco} lotes={dados.lotes} />;
  }
}

function CartaoApp({ dados }: { dados: DadosCartoes }) {
  const lote = dados.lotes[0];
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[22px] border-4 border-neutral-800 bg-[var(--fundo)] text-[var(--texto)] shadow-xl">
      <div className="bg-[var(--amarelo)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--azul)] text-sm font-black text-white">V</span>
          <span className="text-sm font-bold">
            Veículo <span className="font-light">Sem Juros</span>
          </span>
          <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold">20 créditos</span>
        </div>
        <div className="mt-2 flex h-8 items-center rounded-sm bg-white px-2 text-xs text-neutral-500 shadow-sm">🔍 Marca, modelo ou cidade…</div>
      </div>
      <div className="flex gap-1.5 overflow-hidden px-3 py-2 text-[10px] font-semibold text-neutral-700">
        {["Todos", "⚡ Encerra hoje", "30x", "Carros", "Motos"].map((a, i) => (
          <span key={a} className={`whitespace-nowrap rounded-full px-2 py-1 ${i === 2 ? "bg-[var(--azul)] text-white" : "bg-white"}`}>{a}</span>
        ))}
      </div>
      <div className="px-3 pb-3">
        <p className="mb-1 text-[11px] text-neutral-600">{dados.total.toLocaleString("pt-BR")} leilões · ordenado por maior desconto</p>
        {lote ? <MiniLote lote={lote} /> : null}
      </div>
    </div>
  );
}

function MiniLote({ lote }: { lote: LoteConversa }) {
  return (
    <article className="overflow-hidden rounded-md bg-white text-[var(--texto)] shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-neutral-200">
        {lote.foto ? <Image src={lote.foto} alt={lote.titulo} fill sizes="300px" className="object-cover" unoptimized /> : null}
        {lote.parcelavel && (
          <span className="absolute bottom-2 left-2 rounded-sm bg-[var(--azul)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Entrada 25% · até 30x</span>
        )}
        {lote.descontoPct ? (
          <span className="absolute right-2 top-2 rounded-sm bg-[var(--verde)] px-1.5 py-0.5 text-[10px] font-bold text-white">{lote.descontoPct}% OFF</span>
        ) : null}
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-semibold leading-snug">{lote.titulo}</p>
        <p className="text-[10px] text-neutral-500">{lote.local}</p>
        {lote.valorDe && <p className="text-[10px] text-neutral-400 line-through">{lote.valorDe}</p>}
        <p className="text-base font-bold">{lote.valor}</p>
        <span className="mt-1 block rounded-sm bg-[var(--azul)] py-1 text-center text-[11px] font-semibold text-white">🔒 Acessar leilão</span>
      </div>
    </article>
  );
}

function CartaoLei() {
  return (
    <div className="rounded-md bg-white p-4 text-neutral-900">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Lei nº 13.105/2015 · Código de Processo Civil</p>
      <p className="mt-1 text-lg font-bold leading-tight">Art. 895</p>
      <p className="mt-1 text-sm text-neutral-600">O interessado em adquirir o bem penhorado em prestações poderá apresentar proposta por escrito.</p>
      <blockquote className="mt-3 rounded-sm border-l-4 border-[var(--amarelo)] bg-[#fffbd6] p-3 text-[15px] leading-snug">
        <span className="font-semibold">§ 1º</span> A proposta conterá, em qualquer hipótese, oferta de pagamento de pelo menos{" "}
        <mark className="bg-[var(--amarelo)] px-0.5 font-bold">vinte e cinco por cento do valor do lance à vista</mark> e o restante{" "}
        <mark className="bg-[var(--amarelo)] px-0.5 font-bold">parcelado em até 30 (trinta) meses</mark>, garantido por caução idônea, quando se tratar de
        móveis, e por hipoteca do próprio bem, quando se tratar de imóveis.
      </blockquote>
      <p className="mt-2 text-xs text-neutral-500">Fonte: texto da lei no portal do Planalto.</p>
    </div>
  );
}

function CartaoLotes({ lotes }: { lotes: LoteConversa[] }) {
  if (!lotes.length) return null;
  return (
    <ul className="grid gap-2">
      {lotes.map((l) => (
        <li key={l.id} className="flex gap-3 overflow-hidden rounded-md bg-white p-2 text-[var(--texto)]">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-sm bg-neutral-200">
            {l.foto ? <Image src={l.foto} alt={l.titulo} fill sizes="96px" className="object-cover" unoptimized /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{l.titulo}</p>
            <p className="text-xs text-neutral-500">{l.local}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              {l.valorDe && <span className="text-xs text-neutral-400 line-through">{l.valorDe}</span>}
              <span className="text-base font-bold">{l.valor}</span>
              {l.descontoPct ? <span className="text-xs font-bold text-[var(--verde)]">{l.descontoPct}% OFF</span> : null}
            </p>
            {l.parcelavel && (
              <span className="mt-1 inline-block rounded-sm bg-[var(--azul)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Entrada 25% · até 30x</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CartaoComparativo() {
  return (
    <div className="rounded-md bg-[#070b14] p-4 text-white">
      <p className="text-xl font-extrabold">Quanto te custaria:</p>
      <ul className="mt-3 grid gap-2">
        {COMPARATIVO.itens.map((i) => (
          <li key={i.rotulo} className="flex items-center gap-3 rounded-md bg-[#7a0a0a] px-3 py-2 text-sm">
            <span className="flex-1 leading-snug">{i.rotulo}</span>
            <span className="whitespace-nowrap font-semibold">→ {i.valor}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-extrabold">Total:</span>
        <span className="text-2xl font-extrabold text-neutral-300 line-through decoration-red-500 decoration-4">{COMPARATIVO.total}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between text-[var(--azul)]">
        <span className="text-lg font-extrabold">Com o Veículo Sem Juros</span>
        <span className="text-lg font-extrabold blur-[5px] select-none" aria-hidden>
          R$ 000
        </span>
      </div>
    </div>
  );
}

function CartaoPreco({ preco, lotes }: { preco: string; lotes: LoteConversa[] }) {
  return (
    <div className="rounded-md bg-white p-5 text-center text-neutral-900">
      <div className="mx-auto flex items-center justify-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--azul)] text-lg font-black text-white">V</span>
        <span className="text-lg font-bold">
          Veículo <span className="font-light">Sem Juros</span>
        </span>
      </div>
      {lotes.length > 0 && (
        <div className="mx-auto mt-4 grid max-w-[280px] grid-cols-3 gap-1.5" aria-hidden>
          {lotes.slice(0, 3).map((l) => (
            <span key={l.id} className="relative block aspect-square overflow-hidden rounded-sm bg-neutral-200">
              {l.foto ? <Image src={l.foto} alt="" fill sizes="90px" className="object-cover" unoptimized /> : null}
              {l.descontoPct ? (
                <span className="absolute bottom-1 left-1 rounded-sm bg-[var(--verde)] px-1 text-[9px] font-bold text-white">{l.descontoPct}% OFF</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
      <p className="mt-5 text-2xl font-black uppercase tracking-tight">Pagamento único</p>
      <p className="text-5xl font-black leading-none tracking-tighter">{preco}</p>
      <p className="mt-2 text-xs text-neutral-500">Acesso liberado por e-mail logo após a confirmação.</p>
    </div>
  );
}

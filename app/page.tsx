import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { CardLeilao } from "@/components/CardLeilao";
import { Rodape } from "@/components/Rodape";
import { usuarioAtual } from "@/lib/auth";
import { destaques, totalGeral } from "@/lib/leiloes/repositorio";

export const metadata: Metadata = {
  title: "Leilões de veículos com parcelamento em até 30x",
  description:
    "Buscador de leilões de veículos judiciais e de bancos e seguradoras. Carros, motos e caminhões com entrada de 25% e até 30 parcelas sem juros.",
};

const FAQ = [
  ["O Veículo Sem Juros é um leilão?", "Não. Somos um buscador: reunimos lotes de leiloeiros oficiais de todo o Brasil e analisamos as oportunidades. O lance é dado no site do leiloeiro."],
  ["Como funciona o parcelamento sem juros?", "Só leilão judicial admite parcelamento: entrada de 25% e até 30 parcelas, com correção pelo índice do tribunal. Filtre por “Parcela em até 30x” para ver só esses."],
  ["O que são os créditos?", "Cada busca com resultado e cada link de leilão desbloqueado consome 1 crédito. Busca sem resultado e reabrir um link já desbloqueado são grátis. Créditos não expiram."],
  ["Como tenho acesso?", "O acesso é liberado após a compra do plano. Fale com a gente no WhatsApp e receba seu login por e-mail."],
];

export default async function Home() {
  if (await usuarioAtual()) redirect("/busca");
  const [itens, total] = await Promise.all([destaques(12), totalGeral()]);

  return (
    <>
      <Cabecalho />
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              O carro do leilão, <span className="text-[var(--azul)]">parcelado em até 30x</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-neutral-600">
              Reunimos {total.toLocaleString("pt-BR")} leilões ativos de leiloeiros oficiais, bancos e seguradoras num só lugar, com análise de cada oportunidade e o filtro que importa: quais aceitam entrada de 25% e parcelamento.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-sm bg-[var(--azul)] px-6 py-3 font-semibold text-white hover:bg-[#2968c8]">Comece agora</Link>
              <a href="#como-funciona" className="rounded-sm border border-neutral-300 px-6 py-3 font-semibold text-neutral-700 hover:bg-neutral-50">Como funciona</a>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              ["🔎", "Busca unificada", "Marca, estado, preço, tipo de leilão e data em um clique."],
              ["⚡", "Encerra hoje", "Veja o que fecha nas próximas horas e não perca o lance."],
              ["🏷️", "1ª e 2ª praça", "Desconto real sobre a avaliação, direto no card."],
              ["🔒", "Link do leiloeiro", "Desbloqueie com 1 crédito e fica seu para sempre."],
            ].map(([icone, titulo, texto]) => (
              <li key={titulo} className="flex gap-3 rounded-md border border-neutral-200 p-4">
                <span className="text-xl" aria-hidden>{icone}</span>
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-neutral-600">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Leilões de veículo em destaque</h2>
          <Link href="/login" className="text-sm font-semibold text-[var(--azul)]">Ver todos →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {itens.map((l) => (
            <CardLeilao key={l.id} leilao={l} />
          ))}
        </div>

        <section id="como-funciona" className="mt-14 rounded-md bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">Solicite análise de qualquer leilão</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              ["1", "Encontre", "Busque por modelo ou filtre por marca, estado, preço e data. Cada busca com resultado usa 1 crédito."],
              ["2", "Desbloqueie", "Gaste 1 crédito para abrir o link do leiloeiro. O link fica guardado em Desbloqueados."],
              ["3", "Analise", "Peça a análise do lote: valores, praças, processo, débitos e condições de pagamento."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--azul)] font-bold text-white">{n}</span>
                <p className="mt-3 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-neutral-600">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Perguntas frequentes</h2>
          <div className="mt-4 divide-y divide-neutral-200 rounded-md bg-white shadow-sm">
            {FAQ.map(([p, r]) => (
              <details key={p} className="group px-5 py-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  {p}
                  <span className="text-neutral-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-2 text-sm text-neutral-600">{r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}

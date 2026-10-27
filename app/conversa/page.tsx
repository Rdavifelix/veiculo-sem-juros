import type { Metadata } from "next";
import { montarFluxo } from "@/lib/conversa/fluxo";
import { capitalizarTitulo, formatarReais } from "@/lib/formatar";
import { destaques, totalGeral } from "@/lib/leiloes/repositorio";
import { Chat } from "./Chat";
import type { LoteConversa } from "./Cartoes";

export const metadata: Metadata = {
  title: "Veículo Sem Juros",
  description: "Descubra como comprar veículos de leilão judicial com entrada de 25% e até 30 parcelas sem juros.",
  robots: { index: false, follow: false },
};

/** Destino do botão de compra: checkout → WhatsApp comercial → login. */
function destinoCompra() {
  const checkout = process.env.NEXT_PUBLIC_CHECKOUT_URL;
  if (checkout) return checkout;
  const zap = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "");
  if (zap) return `https://wa.me/${zap}?text=${encodeURIComponent("Olá! Quero meu acesso ao Veículo Sem Juros.")}`;
  return "/login";
}

/**
 * Funil de conversa (página pública, estilo WhatsApp, pensada para o celular): mesma estrutura do chat do site
 * modelo, com copy e dados próprios. Os números do roteiro vêm do buscador (total de lotes, maior desconto).
 */
export default async function PaginaConversa() {
  const [itens, total] = await Promise.all([destaques(60), totalGeral()]);
  const descontos = itens.map((l) => l.descontoPct ?? 0);
  const descontoMax = Math.max(0, Math.floor(Math.max(...descontos, 0) / 5) * 5) || 50;
  const preco = process.env.NEXT_PUBLIC_PRECO_ACESSO || "R$ 47,00";

  const lotes: LoteConversa[] = itens
    .filter((l) => l.parcelavel && l.descontoPct)
    .sort((a, b) => (b.descontoPct ?? 0) - (a.descontoPct ?? 0))
    // Sem títulos repetidos (o mesmo modelo costuma aparecer em vários lotes do mesmo leilão).
    .filter((l, i, arr) => arr.findIndex((o) => o.titulo === l.titulo) === i)
    .slice(0, 3)
    .map((l) => ({
      id: l.id,
      titulo: capitalizarTitulo(l.titulo),
      foto: l.fotos[0] ?? null,
      local: [l.cidade, l.uf].filter(Boolean).join(" · "),
      valor: formatarReais(l.valor),
      valorDe: l.valorDe ? formatarReais(l.valorDe) : null,
      descontoPct: l.descontoPct,
      parcelavel: l.parcelavel,
    }));

  const fluxo = montarFluxo({ total, descontoMax, preco, checkoutUrl: destinoCompra() });

  return (
    <main
      className="h-dvh w-full overflow-hidden bg-[#0f1b2d] text-white"
      style={{ backgroundImage: "url(/conversa/fundo.svg)", backgroundRepeat: "repeat", backgroundSize: "340px 340px", backgroundPosition: "center" }}
    >
      <Chat fluxo={fluxo} dados={{ lotes, preco, total }} />
    </main>
  );
}

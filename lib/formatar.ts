const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCentavos = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function formatarReais(v: number | null | undefined, centavos = false) {
  if (v == null) return "—";
  return (centavos ? brlCentavos : brl).format(v);
}

/** Separa inteiro e centavos para o estilo "R$ 78⁵⁶" do card. */
export function partesReais(v: number) {
  const inteiro = brl.format(Math.floor(v)).replace("R$", "").trim();
  const cent = Math.round((v - Math.floor(v)) * 100);
  return { inteiro, centavos: cent ? String(cent).padStart(2, "0") : null };
}

export function formatarMilhar(v: number) {
  return new Intl.NumberFormat("pt-BR", { notation: v >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 0 }).format(v);
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "Encerra hoje", "Amanhã" ou "26 de out" — como o badge de data do site modelo. */
export function rotuloEncerramento(iso: string | null, agora = new Date()) {
  if (!iso) return { texto: "Data a confirmar", urgente: false, encerrado: false };
  const d = new Date(iso);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dias = Math.floor((d.getTime() - hoje.getTime()) / 86_400_000);
  if (d < agora) return { texto: "Encerrado", urgente: false, encerrado: true };
  if (dias === 0) return { texto: "Encerra hoje", urgente: true, encerrado: false };
  if (dias === 1) return { texto: "Amanhã", urgente: true, encerrado: false };
  return { texto: `${d.getDate()} de ${MESES[d.getMonth()]}`, urgente: false, encerrado: false };
}

export function formatarDataHora(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function capitalizarTitulo(s: string) {
  if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s; // já tem caixa mista
  return s
    .toLowerCase()
    .replace(/(^|[\s(/-])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase())
    .replace(/\b(De|Da|Do|Com|Em|E|A|O)\b/g, (m) => m.toLowerCase());
}

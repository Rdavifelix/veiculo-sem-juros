/**
 * "Judicial" não garante parcelamento (CPC art. 895). Não parcelam: alienação antecipada criminal (art. 144-A
 * do CPP, pedida pelo Ministério Público), editais que exigem pagamento à vista ou em poucos dias, e os que
 * vedam parcelamento expressamente. Detecção por texto do edital/descrição/condições.
 */
const PADROES = [
  /aliena[çc][aã]o antecipada/i,
  /144-?\s?A/i,
  /c[óo]digo de processo penal/i,
  /vara criminal/i,
  /minist[ée]rio p[úu]blico/i,
  /somente [àa] vista|exclusivamente [àa] vista|apenas [àa] vista/i,
  /[àa] vista ou a prazo de at[ée] (?:sete|7|dez|10|quinze|15) dias/i,
  /n[ãa]o (?:ser[áa]|é|será) admitid[oa] (?:o )?parcelamento|vedado o parcelamento|sem parcelamento/i,
];

export function parcelamentoVedado(...textos: (string | null | undefined)[]) {
  const t = textos.filter(Boolean).join(" ");
  return PADROES.some((p) => p.test(t));
}

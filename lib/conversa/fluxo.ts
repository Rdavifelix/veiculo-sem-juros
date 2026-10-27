/**
 * Fluxo do funil /conversa — chat simulado estilo WhatsApp, no mesmo roteiro do site modelo
 * (gancho → objetivo → quem somos → a lei → como funciona → parcelamento → onde encontrar → produto →
 * prova → preço → garantia → pagamento), com copy e marca próprias.
 *
 * Texto aceita variáveis `{nome}` preenchidas em `montarFluxo` (total de lotes, preço, desconto máximo…).
 */

export type Cartao = "app" | "lei" | "lotes" | "comparativo" | "preco";

export type Mensagem =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagem"; src: string; alt: string }
  | { tipo: "video"; youtubeId: string; autoplay?: boolean }
  | { tipo: "cartao"; cartao: Cartao };

export interface Opcao {
  rotulo: string;
  /** Próximo bloco. */
  proximo: string;
  /** Guarda uma variável ao escolher (ex.: objetivo), usada nos textos seguintes. */
  variavel?: { nome: string; valor: string };
}

export type Entrada = { tipo: "botoes"; opcoes: Opcao[] } | { tipo: "redirecionar"; url: string } | { tipo: "fim" };

export interface Bloco {
  id: string;
  mensagens: Mensagem[];
  entrada: Entrada;
}

export interface Fluxo {
  inicio: string;
  blocos: Record<string, Bloco>;
}

export interface VariaveisFluxo {
  /** Lotes ativos no buscador (vem do repositório). */
  total: number;
  /** Maior desconto encontrado nos lotes em destaque, já arredondado (ex.: 65). */
  descontoMax: number;
  /** Preço anunciado, texto livre (ex.: "R$ 47,00"). */
  preco: string;
  /** Destino do botão de compra. */
  checkoutUrl: string;
}

const t = (texto: string): Mensagem => ({ tipo: "texto", texto });
const c = (cartao: Cartao): Mensagem => ({ tipo: "cartao", cartao });

/** Valores do cartão "quanto te custaria" (comparativo de preço). Ajuste livre. */
export const COMPARATIVO = {
  itens: [
    { rotulo: "Busca unificada em todos os leiloeiros oficiais, com filtro de parcelamento", valor: "R$ 297" },
    { rotulo: "Análise por IA de cada lote: edital, FIPE, preço de mercado e lance máximo", valor: "R$ 197" },
    { rotulo: "Agenda dos encerramentos com o seu teto de lance", valor: "R$ 97" },
  ],
  total: "R$ 591",
};

export function montarFluxo(v: VariaveisFluxo): Fluxo {
  const blocos: Bloco[] = [
    {
      id: "inicio",
      mensagens: [
        t(
          `Você sabia que dá pra comprar carro de leilão judicial com até ${v.descontoMax}% de desconto sobre a FIPE, pagando 25% de entrada e o resto em até 30 parcelas, sem juros e sem análise de crédito?`,
        ),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Quero saber mais", proximo: "objetivo" }] },
    },
    {
      id: "objetivo",
      mensagens: [t("Antes de te mostrar como funciona, me conta uma coisa:\nQual é o seu objetivo com um veículo hoje?")],
      entrada: {
        tipo: "botoes",
        opcoes: [
          { rotulo: "Comprar pra uso próprio", proximo: "quem", variavel: { nome: "objetivo", valor: "usar no dia a dia" } },
          { rotulo: "Comprar pra trabalhar", proximo: "quem", variavel: { nome: "objetivo", valor: "trabalhar" } },
          { rotulo: "Comprar e revender com lucro", proximo: "quem", variavel: { nome: "objetivo", valor: "revender" } },
        ],
      },
    },
    {
      id: "quem",
      mensagens: [
        t("Boa escolha. Então vamos lá 👇"),
        t("Antes de te mostrar as oportunidades que combinam com quem quer {objetivo}, é importante você saber com quem está falando."),
        t("Aqui é o time do Veículo Sem Juros. A gente acompanha leilões de veículos todos os dias e reúne, num só lugar, o que os leiloeiros oficiais do Brasil colocam à venda."),
        t("O que a maioria das pessoas não sabe: desde 2015 existe uma regra no Código de Processo Civil que permite comprar esses veículos parcelado, direto no leilão."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Que regra é essa?", proximo: "nao-e" }] },
    },
    {
      id: "nao-e",
      mensagens: [
        t("É o artigo 895 do CPC (Lei 13.105/2015). Tem pouco mais de dez anos e pouquíssima gente conhece."),
        t("Mas antes, preciso deixar uma coisa bem clara."),
        t("O que eu vou te mostrar NÃO tem nada a ver com:"),
        t("❌ Leilão de carro batido"),
        t("❌ Leilão de carro de enchente"),
        t("❌ Veículo com sinistro no documento"),
        t("É um tipo de leilão completamente diferente."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Me explica melhor", proximo: "como" }] },
    },
    {
      id: "como",
      mensagens: [
        t("Funciona assim: quando uma pessoa ou empresa não paga uma dívida na Justiça, os bens dela podem ser penhorados. Inclusive veículos."),
        t("Esses veículos vão a leilão judicial pra quitar a dívida. São carros que estavam em uso normal, não são carros destruídos."),
        t(`Por isso aparecem com descontos que chegam a ${v.descontoMax}% sobre a tabela FIPE.`),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "E como parcela no boleto?", proximo: "parcela" }] },
    },
    {
      id: "parcela",
      mensagens: [
        t("⚠️ Atenção pra uma coisa importante:"),
        t("O artigo 895 permite apresentar proposta de pagamento parcelado no leilão judicial: 25% de entrada e o restante em até 30 parcelas mensais."),
        t("Sem juros de financiamento, sem banco e sem análise de crédito: quem aprova a proposta é o juiz do processo."),
        t("As parcelas têm correção monetária e garantia sobre o próprio veículo. Tudo previsto em lei."),
        t("E se o veículo não estiver como descrito no edital, a mesma lei protege quem arrematou."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Como encontro esses veículos?", proximo: "onde" }] },
    },
    {
      id: "onde",
      mensagens: [
        t("Existem centenas de leiloeiros oficiais no Brasil, e cada um tem o próprio site. Só eles podem vender esses veículos da Justiça."),
        t("Imagina ter que abrir todos esses sites, todos os dias, pra procurar oportunidade? E ainda conferir se cada um é verdadeiro?"),
        t("Muita gente procura no Google e cai em site falso. Outros desistem depois de horas pulando de site em site."),
        t("Por isso, mais importante que conhecer a lei é saber onde encontrar esses veículos."),
        t("De forma prática e segura."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Como faço isso?", proximo: "produto" }] },
    },
    {
      id: "produto",
      mensagens: [
        t("Foi pra isso que criamos o Veículo Sem Juros."),
        c("app"),
        t(`Um buscador que reúne ${v.total.toLocaleString("pt-BR")} lotes de leiloeiros oficiais num só lugar, com o filtro que importa: quais aceitam entrada de 25% e parcelamento em até 30x.`),
        t("Você abre, filtra por marca, estado e preço, e em segundos encontra o veículo que procura."),
        t("E cada lote pode ter uma análise feita por inteligência artificial: edital, FIPE, preço de mercado e o lance máximo que vale a pena dar 🤖"),
        t("Agora que você já sabe o melhor caminho pra encontrar essas oportunidades, deixa eu te mostrar a lei que torna tudo isso possível."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Qual é a lei?", proximo: "lei" }] },
    },
    {
      id: "lei",
      mensagens: [
        t("Olha o que diz o § 1º do artigo 895 do CPC..."),
        c("lei"),
        t("Esses veículos só podem ser vendidos por leiloeiros oficiais, registrados na Junta Comercial de cada estado."),
        t("Mas você não precisa se preocupar com isso, porque a gente já reuniu tudo pra você..."),
        t("Olha alguns lotes que estão no ar agora:"),
        c("lotes"),
        t("Desconto real sobre a avaliação, direto no card, e o selo de quem aceita parcelamento."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: "Quanto custa isso?", proximo: "preco" }] },
    },
    {
      id: "preco",
      mensagens: [
        t("Pensa comigo:"),
        t("Quanto custaria ter alguém garimpando todos os sites de leiloeiro pra te entregar as melhores oportunidades, todos os dias?"),
        t("Com o acesso ao Veículo Sem Juros você recebe:"),
        c("comparativo"),
        t(`Mas você não vai pagar ${COMPARATIVO.total}.`),
        t("Nem R$ 400."),
        t("Nem R$ 200."),
        t("Seu acesso, com tudo isso, sai por apenas:"),
        c("preco"),
      ],
      entrada: {
        tipo: "botoes",
        opcoes: [
          { rotulo: "🔥 Quero o link para pagamento", proximo: "pagar" },
          { rotulo: "Quero saber a garantia", proximo: "garantia" },
        ],
      },
    },
    {
      id: "garantia",
      mensagens: [
        t("Você tem 7 dias de garantia incondicional. Se não gostar, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia."),
        t("Você pode tomar essa decisão com total segurança."),
        t("A única coisa que você tem a perder é continuar pagando juros de financiamento enquanto tem gente comprando pela metade do preço, parcelado no boleto."),
      ],
      entrada: { tipo: "botoes", opcoes: [{ rotulo: `🔥 Quero acessar por ${v.preco}`, proximo: "pagar" }] },
    },
    {
      id: "pagar",
      mensagens: [t("Perfeito! Estou te levando pra página de acesso 🚀")],
      entrada: { tipo: "redirecionar", url: v.checkoutUrl },
    },
  ];

  return { inicio: "inicio", blocos: Object.fromEntries(blocos.map((b) => [b.id, b])) };
}

/** Troca `{nome}` pelos valores escolhidos durante a conversa. */
export function preencher(texto: string, variaveis: Record<string, string>) {
  return texto.replace(/\{(\w+)\}/g, (_, nome: string) => variaveis[nome] ?? "");
}

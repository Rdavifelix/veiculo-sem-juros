# Modelo do produto — referência: BuscaAii (buscaaii.com.br)

Mapeado em 26/10/2026 navegando no site modelo com a conta do João (área pública + área logada).
Capturas em `docs/referencia-buscaaii/`. **Veículo Sem Juros = mesma estrutura, marca e copy próprias.**

## O que o produto É
**Não é um leilão.** É um **agregador/buscador de leilões de veículos** (judiciais e extrajudiciais,
~31 mil ativos, raspados de vários sites de leiloeiros) + **assessoria de análise** de cada leilão,
monetizado por **créditos** e por um **acompanhamento completo** vendido via webinário.
O nome "Veículo Sem Juros" conversa direto com o gancho do modelo: **só leilão judicial admite
parcelamento** (entrada 25%, até 30 parcelas) — é o filtro/argumento central.

## Mapa de telas

### Pública (sem login)
| Rota | Conteúdo |
|---|---|
| `/` | Hero (título + subtítulo + CTA "Comece agora" → login) · carrossel "Leilões de veículo em destaque" (card: data de encerramento/"Encerra hoje", foto, título, cidade, **1ª praça R$ / 2ª praça R$ com % de desconto**, tipo Judicial/Extrajudicial, botão Acessar) · "Leilões de imóveis em destaque" (vazio) · bloco "Solicite análise de qualquer leilão" · **FAQ** (11 perguntas, acordeão) · rodapé (Eventos, Ajuda, Privacidade + disclaimer legal) · botão flutuante WhatsApp |
| `/login` | E-mail + senha, "Esqueceu sua senha?". **Não existe cadastro público** (`/cadastro` = 404): o acesso é vendido fora do site |
| `/termos-de-uso`, `/politica-de-privacidade` | Texto legal (natureza consultiva, sem assessoria jurídica, sem direito de arrependimento) |

### Logada (nav: Home · Busca · Oportunidade do dia · Como usar · Fórum · Área de membros · Reportar problema · ícones: análises, notificações, perfil, sair)
1. **Gate de onboarding** (1ª entrada): vídeo + "informe 2 palavras-chave ditas no vídeo" → botão "Começar a usar a plataforma". Persistido por conta.
2. **`/busca`** — tela principal.
   - Banner carrossel (promo do webinário).
   - Abas **Buscar | Desbloqueados**; à direita "Como funciona?" + **saldo de créditos** + cota **N/20** (buscas do período).
   - Campo "Modelo do veículo (opcional)" + chips de filtro: **Marca** (lista com busca, ~centenas), **Estado** (27 UF), **Preço** (mín/máx), **Tipo de leilão** (Judicial / Extrajudicial / Não informado), **Data** (7/15/30 dias ou intervalo). Botão Buscar.
   - Resultados: "82 leilões encontrados em 31 mil ativos", **ordenado por maior lance**, grade 4 colunas, até 200 por busca, paginação. Card: badge de data ("Amanhã", "Encerra hoje", "03 de Nov"), foto (ou placeholder "Imagem não disponível"), título, linha de sinistro quando extrajudicial de seguradora ("RECUPERÁVEL | COLISÃO | dano FRONTAL | Média Monta | 137.005 km | Motor dá partida"), cidade, 1ª/2ª praça ou "LANCE", tipo (Judicial / Extra.(à vista)), ícone de alerta, botão **🔒 Acessar leilão**. Alguns cards trazem descrição completa do edital (comitente, placa mascarada, processo, vara, exequente).
   - **Modal de desbloqueio**: "Acessar este leilão? Ao confirmar, vamos gastar 1 crédito pra liberar o link deste leilão pra você. O link fica disponível pra sempre em Desbloqueados." Saldo atual → depois. Cancelar / Gastar 1 crédito.
   - Rodapé da lista: "Não encontrou o leilão que procurava? Avise a gente".
   - **Desbloqueados**: lista permanente (data do desbloqueio, marca, modelo, cidade, lance atual, encerra em, "Ver leilão"); leilão que saiu do ar vira "LEILÃO REMOVIDO / Link indisponível".
3. **Créditos** (popover "Como funciona"): 1 crédito = **buscar e obter resultados** (−1) ou **desbloquear link** (−1); grátis = busca sem resultado e reabrir já desbloqueado; **não expiram**. "Recarregar créditos" → modal **Comprar créditos**: 10 por R$ 27,00 (R$ 2,70/cr) · 30 por R$ 47,00 (R$ 1,57/cr); pagamento identificado pelo e-mail da conta. Popover separado "Análises disponíveis: análises do plano 0/0, usadas este mês" (cota mensal de análises, reset dia 1).
4. **`/oportunidade-do-dia`** — "Uma análise exclusiva por dia, baseada no seu perfil".
   - **Meu Perfil de Oportunidades** (quiz editável inline): faixa de investimento (5 faixas) · tipos de produto (carros/motos/vans/caminhonetes/caminhões/máquinas/outros) · objetivo (uso próprio/revenda/alavancagem/locação/outro) · marcas preferidas (opcional) · regiões (opcional) · preferência (prontos/margem revenda/maior desconto c/ regularização/indiferente) · prazo para arrematar · há quanto tempo acompanha nas redes · usa cartão de crédito? · renda mensal (4 faixas) · "receber notificações de novos leilões compatíveis".
   - **Sua análise de hoje**: card "Recomendação do dia — resgate gratuito expira em 2h" → "Liberar recomendação do dia".
   - **Análises anteriores**: cards (data, selo "BOA OPORTUNIDADE", veículo, estado, lance atual, encerra, "Ver análise").
   - **Modal de análise** (versão demonstração): Identificação do veículo (marca/modelo, cor, ano, câmbio, combustível, conservação; **placa/chassi/renavam ocultos** "disponível no acompanhamento completo") · Valores e datas (FIPE, avaliação, 1º e 2º leilão com abertura/encerramento/lance mínimo) · **Condições de pagamento** (à vista, parcelamento admite, entrada 25%, até 30 parcelas, juros 1% a.m., correção INPC, comissão 5%, carta fiança) · Riscos e pontos de atenção (nº processo oculto, andamento, débitos sub-rogados art. 130 CTN, observações, despesas adicionais) · Localização e visita prévia · Observações do analista · **Leiloeiro / site / link ocultos** → upsell "Saiba como acessar no webinário". Botões: Análise do veículo · Simular viabilidade · Andamento do processo.
   - CTA de webinário (segundas e quintas) "Garantir minha vaga".
5. **`/busca/como-usar`** — tutorial em 6 passos com componentes reais e dados de exemplo.
6. **`/forum`** — posts da comunidade ("Nova publicação"; vazio hoje).
7. **`/area-membros`** — cursos (1: "Universidade do Arremate", 3 módulos/14 aulas), página do curso com progresso, página da aula (`/area-membros/<curso>/aula/<slug>`): vídeo, descrição, "Marcar como concluída", anterior/próxima, sidebar com módulos. Progresso salvo no navegador.
8. **`/reportar-problema`** — rádio (algo não funciona / não encontrei um leilão / informação errada) + texto; envia tela/aparelho/versão.

### Stack observada
Next.js (App Router), Microsoft Clarity, GTM. Sem título nas páginas (SEO fraco — oportunidade nossa).

## Modelo de dados proposto (Supabase)
```
profiles            (id=auth.users, nome, whatsapp, onboarding_done_at, perfil_oportunidade jsonb)
credit_packages     (id, creditos, preco_centavos, ativo)
credit_ledger       (id, user_id, delta, motivo: compra|busca|desbloqueio|bonus|estorno, ref_id, created_at)   -- saldo = soma
purchases           (id, user_id, package_id, status, gateway, gateway_ref, paid_at)
auctions            (id, fonte, fonte_url [SÓ via unlock], titulo, marca, modelo, ano, cidade, uf, tipo judicial|extrajudicial|nd,
                     lance_1, lance_2, desconto_pct, lance_atual, encerra_em, fotos[], descricao, sinistro jsonb, status ativo|removido, raw jsonb)
searches            (id, user_id, filtros jsonb, total, custou_credito bool, created_at)
unlocks             (user_id, auction_id, created_at)  -- unique; reabrir é grátis
analyses            (id, auction_id, user_id, tipo recomendacao|solicitada, veredito, conteudo jsonb, liberada_em, expira_em)
analysis_requests   (id, user_id, auction_id, status aguardando|disponivel|cancelada, mes_ref)
courses / modules / lessons / lesson_progress
forum_posts / forum_comments
problem_reports     (user_id, tipo, texto, contexto jsonb)
notifications       (user_id, tipo, payload, lida_em)
```
Regras no banco: débito de crédito por RPC transacional (`gastar_credito`), unlock idempotente, RLS por `user_id`.

## Fora do site modelo que precisamos decidir
- **Fonte dos leilões**: raspagem própria dos leiloeiros (o modelo tem 31 mil) vs. parceria/API. É o maior esforço do projeto.
- **Venda do acesso**: o modelo não tem cadastro público; o acesso vem do funil (webinário/checkout). Decidir se teremos cadastro aberto.
- Quem produz as **análises** (manual pela equipe, IA, híbrido).
- Gateway de pagamento dos créditos (Asaas/Assiny já conhecidos da XPN).

## Fases sugeridas
1. **Esqueleto + auth + onboarding gate + busca sobre uma base semente** (import manual de leilões) + créditos/desbloqueio.
2. Oportunidade do dia (perfil + recomendação + análise).
3. Área de membros, fórum, reportar problema.
4. Coleta automática de leilões.

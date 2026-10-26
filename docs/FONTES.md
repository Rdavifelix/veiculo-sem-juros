# Fontes de leilões — levantamento e estratégia (26/10/2026)

Resposta à pergunta aberta de `MODELO.md`: **de onde vêm os leilões**. Decisão: **raspagem própria**, começando
pelas plataformas white-label e pelos dois maiores marketplaces, com cadastro manual só como complemento.
Não existe API/agregador comercial de leilões de veículos no Brasil para licenciar, e parceria com leiloeiro
individual não dá a cobertura que o modelo (BuscaAii, ~10 mil ativos) exige.

## Como o BuscaAii faz
A home pública do BuscaAii carrega os cards direto de um Supabase (tabela `ficha_leilao_veiculos`) e cada
registro traz `fonte` = URL do lote no site do leiloeiro. Nos destaques, as fontes eram **plataformas white-label**,
não leiloeiros grandes:

| Lote em destaque | `fonte` | Plataforma |
|---|---|---|
| Jeep Compass (Goiânia) | arrematabem.com.br/lote/1398 | **Leilotech** |
| Hyundai Creta (Casimiro de Abreu) | depaulaonline.com.br/oferta/... | **Suporte Leilões** |
| Nissan Kicks / Jeep Renegade | grupolance.com.br | **Grupo Lance** |

Ou seja: o grosso dos "31 mil ativos" vem de **centenas de leiloeiros pequenos que usam 3–4 sistemas iguais**.
Raspar o sistema uma vez cobre todos os clientes dele.

> Lição para nós: a tabela deles está legível por `anon` sem RLS. A nossa `auctions` expõe só o necessário e
> o campo `fonte_url` **nunca** sai do servidor sem desbloqueio (é o produto).

## Mapa das fontes

### A. Plataformas white-label (prioridade 1 — maior cobertura por esforço)
| Plataforma | Como identificar | Estrutura | Status |
|---|---|---|---|
| **Suporte Leilões** (suporteleiloes.com.br) | imagens em `static.suporteleiloes.com.br/<tenant>/` | versão clássica: `/busca?tipo=Veiculos&pagina=N` (SSR) → `/oferta/leilao/.../id-<bem>/<slug>` com 1ª/2ª praça, processo, autor/executado, fotos | **coletor pronto** (`fontes/suporteleiloes.mjs`). Há uma versão nova (Next.js, ex.: vixleiloes.com.br, rotas `/leiloes?categoria=Veículos`) que precisa de um segundo parser |
| **Leilotech** (leilotech.com.br) | `window.__TENANT__` no HTML, CDN `cdn.leilotech.workers.dev` | `/agenda` → `/leilao/<id>` → `/lote/<id>` (Laravel, JSON-LD Product; fotos e praças só via JS/Pusher) | **coletor pronto** (`fontes/leilotech.mjs`); fotos pendentes (JS). Tenants vistos: arrematabem, tesouroleiloes, magalhaesleiloes.leilao.br, toplance, oleiloes |
| **Grupo Lance** (grupolance.com.br) | próprio | SSR com query string (`veiculos=4&per-page=16&sort=data_termino`), JSON-LD; `/ajax/` bloqueado no robots | a fazer |
| **WordPress + plugin** (ex.: kronbergleiloes) | `wp-content` | varia por tema | caso a caso |

Como **descobrir tenants**: (1) busca web pelos fingerprints acima; (2) listas de leiloeiros oficiais das Juntas
Comerciais (JUCESP, JUCERJA…) → visitar o site de cada um e classificar pelo fingerprint; (3) fórum/comunidade
pedindo "não achei o leilão X" (o BuscaAii tem esse botão). Guardar em tabela `fontes` (dominio, plataforma, ativo, ultima_coleta).

### B. Marketplaces grandes com API JSON (prioridade 1 — volume extrajudicial)
| Fonte | Acesso | Volume ativo (26/10) | Status |
|---|---|---|---|
| **Superbid Exchange** | `GET offer-query.superbid.net/offers/?portalId=[2,15]&filter=product.productType.id:10;statusId:1` (10 = carros/motos, 11 = caminhões). Público, sem token. Traz localização, dados judiciais, **entrada mínima % e nº de parcelas** (`commercialCondition`) | ~2.6 mil carros/motos + ~900 caminhões | **coletor pronto**; o índice mistura ofertas de teste antigas com `statusId:1`, filtramos por `endDateTime >= agora`. URL do lote: `/oferta/<slug>-<id>` |
| **Sodré Santoro** | `POST /api/search-lots` (corpo Elasticsearch) só funciona de dentro do navegador (WAF). Campos ricos: sinistro, financiável, km, placa parcial, comitente | 936 veículos | **coletor pronto** (Playwright) |
| **Copart BR** | hCaptcha + anti-bot já na home | milhares (seguradoras) | não raspar; avaliar parceria/feed ou cadastro manual dos leilões-evento |
| **Mega Leilões, Zukerman, Leilões Judiciais, VIP, Palácio dos Leilões** | SSR + sitemap (`sitemap.xml` com lastmod/hourly) | judicial relevante (Zukerman, Mega, Leilões Judiciais) | a fazer, um parser cada; sitemap facilita descoberta e remoção |
| **Freitas, Parque dos Leilões, Lance no Leilão, Milan, Satto** | SSR; Milan/Superbid home dão 403 a curl (precisam de navegador) | médio | a fazer |

### C. Fontes oficiais (complemento, não substituem)
- Não há portal unificado do CNJ com lotes; a Resolução CNJ 236/2016 só exige leiloeiro credenciado por tribunal.
  Cada TJ publica editais em PDF no DJe — útil para **validar** processo/vara de um lote judicial, não para descobrir.
- Listas de leiloeiros credenciados por TJ (TJSP, TJRJ, TJCE…) e Juntas Comerciais servem para descobrir sites.

## Arquitetura proposta
```
fontes (dominio, plataforma, config jsonb, ativo, ultima_coleta, erro)
   └─ job de coleta (1x/dia por fonte; a cada 2h para fontes com encerramento no dia)
        → normaliza (lib.mjs) → upsert em auctions por (fonte, external_id)
        → lote que sumiu da fonte em 2 coletas seguidas ⇒ status 'removido'
        → auctions.raw guarda o bruto; reprocessar sem recoletar
```
- **Onde rodar**: GitHub Actions agendado ou Supabase Edge Function com `pg_cron`; Sodré (Playwright) roda melhor
  em Actions/VPS do que em Edge. Vercel Cron só para orquestrar, não para raspar (timeout).
- **Dedup entre fontes**: mesmo veículo pode aparecer no leiloeiro e num agregador; chave fraca = placa parcial +
  marca/modelo/ano + cidade; resolver depois, começar com `(fonte, external_id)`.
- **Enriquecimento IA** (decisão: análises por IA): o texto do edital em `raw`/`descricao` alimenta a extração
  estruturada (placa mascarada, processo, vara, débitos, parcelamento) e a "análise" vendida. Superbid já entrega
  `minAdvanceRate`/`maxInstallments` prontos — é o dado que sustenta o nome "sem juros".
- **Boas práticas**: 1 req/s por host, UA identificável, respeitar `robots.txt` (verificado: nenhum dos alvos proíbe
  as rotas usadas), só conteúdo público, sempre linkar a fonte (o leiloeiro ganha tráfego — argumento para parceria
  depois). Não usar a base do BuscaAii como fonte.

## Resultado do protótipo (`scripts/coleta/`, 26/10/2026)
| Coletor | Alvo | Lotes | Com data | Com valor | Com cidade | Com foto | Obs. |
|---|---|---|---|---|---|---|---|
| suporteleiloes | depaulaonline.com.br | 10 (todos do site) | 10 | 10 | 2 | 10 | 1ª/2ª praça, autor/executado ok; cidade depende de "Cidade/UF" na descrição |
| leilotech | arrematabem.com.br | 2 (site é mais imóveis) | 2 | 2 | 0 | 0 | fotos e praças exigem JS; valor = avaliação |
| superbid | API, carros/motos | 100 em 15 s | 100 | 100 | 100 | 71 | ~20% do índice "ativo" é homologação (loja demo), filtrado por nome |
| sodresantoro | API via Chromium | 96 em 10 s (864 abertos) | 96 | 96 | 96 | 96 | sinistro, km, comitente, financiável prontos |

Campos fracos em todas: `marca`/`modelo` por heurística de título (Sodré e Superbid já entregam separado),
`tipo` por palavras-chave quando a fonte não marca judicial, 2ª praça só nas fontes judiciais.

## Próximos passos
1. ~~Tabela `fontes` + migração `auctions`~~ feito em 26/10 (projeto `bjrjngzckbezajjrkfwb`, view `auctions_vitrine`).
2. ~~Job (Actions) rodando superbid + sodresantoro + tenants~~ feito: `.github/workflows/coleta.yml` 2x/dia, fontes
   em `scripts/coleta/fontes.json` (hoje 6: Superbid, Sodré, De Paula, Arremata Bem, Tesouro Leilões, Magalhães).
   **Pendente:** cadastrar o secret `SUPABASE_SERVICE_ROLE_KEY` no GitHub e disparar a primeira execução.
3. Ampliar `fontes.json` para ~20 tenants Suporte Leilões/Leilotech; parser da versão nova do Suporte Leilões e do
   Grupo Lance; depois sitemaps (Zukerman, Mega, Leilões Judiciais).
4. Descoberta de tenants a partir das listas de leiloeiros das Juntas Comerciais.
5. Quando a coleta passar de ~1 h ou precisar rodar de hora em hora: paralelizar em jobs por plataforma ou mover
   para VPS/Edge Function com `pg_cron` — `rodar-tudo.mjs` e `gravar.mjs` não mudam, só o agendador.

"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  preencher,
  type Fluxo,
  type Mensagem,
  type Opcao,
} from "@/lib/conversa/fluxo";
import { CartaoConversa, type DadosCartoes } from "./Cartoes";

type Item =
  | { chave: string; de: "host"; msg: Mensagem }
  | { chave: string; de: "visitante"; texto: string };

interface Estado {
  itens: Item[];
  variaveis: Record<string, string>;
  /** Bloco cuja entrada está visível (ou que precisa continuar após restaurar). */
  bloco: string | null;
  /** Mensagens do bloco já exibidas (para retomar sem repetir). */
  exibidas: number;
}

const CHAVE_STORAGE = "vsj_conversa_v1";
/** Emulação de digitação como no modelo: ~300 caracteres/s, entre 0,6 s e 1,5 s. */
const VELOCIDADE = 300;
const ATRASO_MIN = 600;
const ATRASO_MAX = 1500;

function atrasoDe(m: Mensagem) {
  if (m.tipo !== "texto") return 1000;
  return Math.min(
    ATRASO_MAX,
    Math.max(ATRASO_MIN, (m.texto.length / VELOCIDADE) * 1000),
  );
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chat simulado (um bloco por vez: bolhas do atendimento com "digitando…", depois os botões de resposta).
 * Lembra o progresso no `localStorage` para quem volta à página, como o "remember user" do modelo.
 */
export function Chat({ fluxo, dados }: { fluxo: Fluxo; dados: DadosCartoes }) {
  const [estado, setEstado] = useState<Estado>({
    itens: [],
    variaveis: {},
    bloco: null,
    exibidas: 0,
  });
  const [digitando, setDigitando] = useState(false);
  const [entradaVisivel, setEntradaVisivel] = useState(false);
  const [pronto, setPronto] = useState(false);
  const rolagem = useRef<HTMLDivElement>(null);
  const execucao = useRef(0);

  const rolarParaFim = useCallback(() => {
    const el = rolagem.current;
    if (el)
      requestAnimationFrame(() =>
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }),
      );
  }, []);

  /** Mostra as mensagens de um bloco uma a uma e, no fim, libera a entrada. */
  const rodarBloco = useCallback(
    async (id: string, aPartirDe = 0) => {
      const bloco = fluxo.blocos[id];
      if (!bloco) return;
      const minha = ++execucao.current;
      setEntradaVisivel(false);
      for (let i = aPartirDe; i < bloco.mensagens.length; i++) {
        const m = bloco.mensagens[i];
        setDigitando(true);
        rolarParaFim();
        await esperar(atrasoDe(m));
        if (execucao.current !== minha) return;
        setDigitando(false);
        setEstado((e) => ({
          ...e,
          bloco: id,
          exibidas: i + 1,
          itens: [...e.itens, { chave: `${id}-${i}`, de: "host", msg: m }],
        }));
        rolarParaFim();
        await esperar(150);
      }
      if (execucao.current !== minha) return;
      setEstado((e) => ({ ...e, bloco: id, exibidas: bloco.mensagens.length }));
      if (bloco.entrada.tipo === "redirecionar") {
        await esperar(900);
        if (execucao.current !== minha) return;
        window.location.assign(bloco.entrada.url);
        return;
      }
      setEntradaVisivel(true);
      rolarParaFim();
    },
    [fluxo, rolarParaFim],
  );

  // Restaura a conversa salva ou começa do início (fora do corpo do efeito para não disparar render em cascata).
  useEffect(() => {
    const iniciar = () => {
      let salvo: Estado | null = null;
      try {
        const bruto = window.localStorage.getItem(CHAVE_STORAGE);
        if (bruto) salvo = JSON.parse(bruto) as Estado;
      } catch {
        salvo = null;
      }
      setPronto(true);
      if (salvo?.bloco && fluxo.blocos[salvo.bloco]) {
        setEstado(salvo);
        const bloco = fluxo.blocos[salvo.bloco];
        if (
          salvo.exibidas >= bloco.mensagens.length &&
          bloco.entrada.tipo === "botoes"
        ) {
          setEntradaVisivel(true);
          requestAnimationFrame(() =>
            rolagem.current?.scrollTo({ top: rolagem.current.scrollHeight }),
          );
        } else if (bloco.entrada.tipo === "redirecionar") {
          // Quem voltou do checkout vê o fim da conversa e pode recomeçar.
          setEntradaVisivel(true);
        } else {
          void rodarBloco(salvo.bloco, salvo.exibidas);
        }
        return;
      }
      void rodarBloco(fluxo.inicio);
    };
    const t = setTimeout(iniciar, 0);
    return () => clearTimeout(t);
  }, [fluxo, rodarBloco]);

  // Persiste cada mudança.
  useEffect(() => {
    if (!pronto || !estado.bloco) return;
    try {
      window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
    } catch {
      // Navegação privada ou armazenamento bloqueado: a conversa só não é lembrada.
    }
  }, [estado, pronto]);

  function escolher(o: Opcao) {
    if (!entradaVisivel) return;
    setEntradaVisivel(false);
    setEstado((e) => ({
      ...e,
      variaveis: o.variavel
        ? { ...e.variaveis, [o.variavel.nome]: o.variavel.valor }
        : e.variaveis,
      itens: [
        ...e.itens,
        {
          chave: `${e.bloco}-r-${e.itens.length}`,
          de: "visitante",
          texto: o.rotulo,
        },
      ],
    }));
    rolarParaFim();
    void rodarBloco(o.proximo);
  }

  function recomecar() {
    execucao.current++;
    try {
      window.localStorage.removeItem(CHAVE_STORAGE);
    } catch {
      // sem armazenamento: nada a limpar
    }
    setEstado({ itens: [], variaveis: {}, bloco: null, exibidas: 0 });
    setEntradaVisivel(false);
    void rodarBloco(fluxo.inicio);
  }

  const blocoAtual = estado.bloco ? fluxo.blocos[estado.bloco] : null;
  const entrada = entradaVisivel && blocoAtual ? blocoAtual.entrada : null;

  // Agrupa itens em "trechos": sequência de bolhas do atendimento (um avatar por trecho) ou uma resposta.
  const trechos: Item[][] = [];
  for (const it of estado.itens) {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && ultimo[0].de === "host" && it.de === "host") ultimo.push(it);
    else trechos.push([it]);
  }
  const digitandoNoTrecho =
    digitando &&
    trechos.length > 0 &&
    trechos[trechos.length - 1][0].de === "host";

  return (
    <div
      ref={rolagem}
      className="conversa-rolagem h-full w-full overflow-y-auto scroll-smooth"
    >
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-2 px-3 pb-6 pt-10 sm:px-5">
        {trechos.map((trecho, idx) => {
          if (trecho[0].de === "visitante") {
            const r = trecho[0];
            return (
              <div
                key={r.chave}
                className="conversa-entrada ml-7 flex justify-end sm:ml-[50px]"
              >
                <div className="max-w-full whitespace-pre-wrap rounded-[6px] bg-[#114d34] px-[15px] py-[7px] text-white">
                  {r.texto}
                </div>
              </div>
            );
          }
          const ultimoTrecho = idx === trechos.length - 1;
          return (
            <div
              key={trecho[0].chave}
              className="flex items-end gap-1 sm:gap-2"
            >
              <Avatar />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {trecho.map((it) =>
                  it.de === "host" ? (
                    <BolhaHost
                      key={it.chave}
                      msg={it.msg}
                      variaveis={estado.variaveis}
                      dados={dados}
                    />
                  ) : null,
                )}
                {ultimoTrecho && digitandoNoTrecho && <Digitando />}
              </div>
            </div>
          );
        })}

        {digitando && !digitandoNoTrecho && (
          <div className="flex items-end gap-1 sm:gap-2">
            <Avatar />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Digitando />
            </div>
          </div>
        )}

        {entrada?.tipo === "botoes" && (
          <div className="conversa-entrada flex justify-end gap-1 sm:gap-2">
            <div className="h-6 w-6 shrink-0 sm:h-10 sm:w-10" aria-hidden />
            <div className="flex w-full flex-wrap justify-end gap-2">
              {entrada.opcoes.map((o) => (
                <button
                  key={o.rotulo}
                  type="button"
                  onClick={() => escolher(o)}
                  className="max-w-full cursor-pointer rounded-[6px] bg-[#21c063] px-4 py-2 text-left font-semibold text-white transition-[filter] duration-200 hover:brightness-90 active:brightness-75"
                >
                  {preencher(o.rotulo, estado.variaveis)}
                </button>
              ))}
            </div>
          </div>
        )}

        {entrada?.tipo === "redirecionar" && (
          <div className="conversa-entrada flex justify-end gap-2">
            <a
              href={entrada.url}
              className="rounded-[6px] bg-[#21c063] px-4 py-2 font-semibold text-white transition-[filter] duration-200 hover:brightness-90"
            >
              Abrir página de acesso
            </a>
            <button
              type="button"
              onClick={recomecar}
              className="rounded-[6px] bg-[#1e293b] px-4 py-2 font-semibold text-white hover:brightness-110"
            >
              Recomeçar
            </button>
          </div>
        )}
        <div className="h-5 shrink-0" />
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <figure className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full sm:h-10 sm:w-10">
      <Image
        src="/conversa/avatar.svg"
        alt="Atendimento Veículo Sem Juros"
        fill
        sizes="40px"
        className="object-cover"
        unoptimized
      />
    </figure>
  );
}

function Digitando() {
  return (
    <div
      className="conversa-entrada flex h-10 w-16 items-center justify-center gap-1 rounded-[6px] bg-[#1e293b]"
      aria-label="Digitando…"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="conversa-pontinho h-2 w-2 rounded-full bg-white"
        />
      ))}
    </div>
  );
}

function BolhaHost({
  msg,
  variaveis,
  dados,
}: {
  msg: Mensagem;
  variaveis: Record<string, string>;
  dados: DadosCartoes;
}) {
  if (msg.tipo === "texto") {
    return (
      <div className="conversa-entrada max-w-full self-start rounded-[6px] bg-[#1e293b] px-4 py-2 text-white">
        <p className="whitespace-pre-wrap">{preencher(msg.texto, variaveis)}</p>
      </div>
    );
  }
  if (msg.tipo === "imagem") {
    return (
      <div className="conversa-entrada w-full max-w-[400px] rounded-[6px] bg-[#1e293b] p-4">
        <Image
          src={msg.src}
          alt={msg.alt}
          width={800}
          height={800}
          className="h-auto w-full rounded-[6px]"
          unoptimized
        />
      </div>
    );
  }
  if (msg.tipo === "video") {
    return (
      <div className="conversa-entrada w-full max-w-[400px] rounded-[6px] bg-[#1e293b] p-4">
        <iframe
          className="aspect-[9/16] w-full rounded-[6px]"
          src={`https://www.youtube.com/embed/${msg.youtubeId}${msg.autoplay ? "?autoplay=1&mute=1" : ""}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Vídeo"
        />
      </div>
    );
  }
  return (
    <div className="conversa-entrada w-full max-w-[400px] rounded-[6px] bg-[#1e293b] p-3">
      <CartaoConversa cartao={msg.cartao} dados={dados} />
    </div>
  );
}

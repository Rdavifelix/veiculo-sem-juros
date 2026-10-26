import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { idsDesbloqueados } from "@/lib/creditos";
import { detalheLeilao } from "@/lib/leiloes/detalhe";

/**
 * Serve o edital/documento do lote pelo nosso domínio, só para quem desbloqueou.
 * Faz streaming do PDF do leiloeiro (não armazenamos); só aceita PDF e até 25 MB.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.redirect(new URL(`/login?next=/leilao/${id}`, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  const desbloqueados = await idsDesbloqueados();
  if (!desbloqueados.has(id)) return new NextResponse("Desbloqueie o leilão para ver os documentos.", { status: 403 });

  const l = await detalheLeilao(id);
  const doc = l?.documentos[Number(n)];
  if (!doc) return new NextResponse("Documento não encontrado.", { status: 404 });

  const origem = await fetch(doc.url, {
    headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!origem || !origem.ok || !origem.body) return new NextResponse("O leiloeiro não devolveu o documento agora. Tente de novo.", { status: 502 });

  const tipo = origem.headers.get("content-type") ?? "application/pdf";
  const tamanho = Number(origem.headers.get("content-length") ?? 0);
  if (!/pdf|octet-stream/i.test(tipo) || tamanho > 25 * 1024 * 1024) return new NextResponse("Documento em formato não suportado.", { status: 415 });

  const nome = `${doc.nome.replace(/[^\p{L}\p{N} _.-]/gu, "").trim() || "documento"}.pdf`;
  return new NextResponse(origem.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${nome}"`,
      "cache-control": "private, max-age=3600",
      "x-robots-tag": "noindex",
    },
  });
}

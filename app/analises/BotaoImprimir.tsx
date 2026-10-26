"use client";

/** "Baixar PDF": usa a impressão do navegador (Salvar como PDF). A página tem CSS de impressão que esconde o resto. */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-sm border border-[var(--azul)] px-3 py-1.5 text-sm font-semibold text-[var(--azul)] hover:bg-[var(--azul)]/5 print:hidden"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      Baixar PDF
    </button>
  );
}

export function Rodape() {
  return (
    <footer className="mt-12 border-t border-neutral-200 bg-white print:hidden">
      <div className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-neutral-600">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <span>Termos de uso</span>
          <span>Política de privacidade</span>
          <span>Ajuda</span>
          <span>Reportar problema</span>
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-neutral-500">
          O Veículo Sem Juros é um buscador de leilões públicos de veículos. Não realizamos leilões, não recebemos lances
          nem pagamentos: cada lote pertence ao leiloeiro oficial indicado, e o acesso ao link original é liberado com
          créditos. As análises têm natureza informativa e não constituem assessoria jurídica.
        </p>
        <p className="mt-4 text-xs text-neutral-400">© {new Date().getFullYear()} Veículo Sem Juros</p>
      </div>
    </footer>
  );
}

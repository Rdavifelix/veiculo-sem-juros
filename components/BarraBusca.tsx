import type { Faceta, Filtros } from "@/lib/leiloes/tipos";
import type { Carteira } from "@/lib/creditos";

const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

function Chip({ rotulo, ativo, children }: { rotulo: string; ativo?: string | null; children: React.ReactNode }) {
  return (
    <details className="group relative" name="chip">
      <summary
        className={`flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
          ativo ? "border-[var(--azul)] bg-[var(--azul)]/5 font-semibold text-[var(--azul)]" : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
        }`}
      >
        {ativo ?? rotulo}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-open:rotate-180" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-md border border-neutral-200 bg-white p-3 shadow-lg">{children}</div>
    </details>
  );
}

const opcao = "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-neutral-50";

/**
 * Barra de busca do modelo: campo de modelo + Buscar, chips Marca · Estado · Preço · Tipo de leilão · Data,
 * e a cota do período. É um <form> que faz POST para a Server Action `buscar` (cobra 1 crédito se houver resultado).
 */
export function BarraBusca({ filtros, marcas, carteira, acao }: { filtros: Filtros; marcas: Faceta[]; carteira: Carteira; acao: (f: FormData) => void }) {
  const pct = Math.min(100, Math.round((carteira.cotaUsadas / carteira.cotaLimite) * 100));
  return (
    <form action={acao} className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]">
      <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-neutral-400" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          name="q"
          defaultValue={filtros.q}
          placeholder="Modelo do veículo (opcional). Ex: Corolla, Civic, HB20"
          className="h-11 min-w-0 flex-1 text-base outline-none placeholder:text-neutral-400"
        />
        <button type="submit" className="h-11 shrink-0 rounded-md bg-[var(--azul)] px-6 text-sm font-semibold text-white hover:bg-[#2968c8]">
          Buscar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <Chip rotulo="Marca" ativo={filtros.marca ? capitalizar(filtros.marca) : null}>
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            <label className={opcao}><input type="radio" name="marca" value="" defaultChecked={!filtros.marca} /> Todas</label>
            {marcas.map((m) => (
              <label key={m.valor} className={opcao}>
                <input type="radio" name="marca" value={m.valor} defaultChecked={filtros.marca?.toLowerCase() === m.valor} /> {m.rotulo}
                <span className="ml-auto text-xs text-neutral-400">{m.total}</span>
              </label>
            ))}
          </div>
        </Chip>

        <Chip rotulo="Estado" ativo={filtros.uf ?? null}>
          <select name="uf" defaultValue={filtros.uf ?? ""} className="h-10 w-full rounded-sm border border-neutral-300 px-2 text-sm">
            <option value="">Todos os estados</option>
            {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Chip>

        <Chip rotulo="Preço" ativo={filtros.preco ? rotuloPreco(filtros.preco) : null}>
          <div className="space-y-0.5">
            {(
              [
                ["", "Qualquer valor"],
                ["ate20", "Até R$ 20 mil"],
                ["20a50", "R$ 20 mil a R$ 50 mil"],
                ["50a100", "R$ 50 mil a R$ 100 mil"],
                ["acima100", "Acima de R$ 100 mil"],
              ] as const
            ).map(([v, r]) => (
              <label key={v} className={opcao}><input type="radio" name="preco" value={v} defaultChecked={(filtros.preco ?? "") === v} /> {r}</label>
            ))}
          </div>
        </Chip>

        <Chip rotulo="Tipo de leilão" ativo={filtros.tipo === "judicial" ? "Judicial" : filtros.tipo === "extrajudicial" ? "Extrajudicial" : null}>
          <div className="space-y-0.5">
            <label className={opcao}><input type="radio" name="tipo" value="" defaultChecked={!filtros.tipo} /> Todos</label>
            <label className={opcao}><input type="radio" name="tipo" value="judicial" defaultChecked={filtros.tipo === "judicial"} /> Judicial <span className="text-xs text-neutral-500">(parcela em até 30x)</span></label>
            <label className={opcao}><input type="radio" name="tipo" value="extrajudicial" defaultChecked={filtros.tipo === "extrajudicial"} /> Extrajudicial <span className="text-xs text-neutral-500">(à vista)</span></label>
          </div>
        </Chip>

        <Chip rotulo="Data" ativo={filtros.encerra === "hoje" ? "Encerra hoje" : filtros.encerra === "7dias" ? "Próximos 7 dias" : null}>
          <div className="space-y-0.5">
            <label className={opcao}><input type="radio" name="encerra" value="" defaultChecked={!filtros.encerra} /> Qualquer data</label>
            <label className={opcao}><input type="radio" name="encerra" value="hoje" defaultChecked={filtros.encerra === "hoje"} /> Encerra hoje</label>
            <label className={opcao}><input type="radio" name="encerra" value="7dias" defaultChecked={filtros.encerra === "7dias"} /> Próximos 7 dias</label>
          </div>
        </Chip>

        <Chip rotulo="Categoria" ativo={filtros.categoria ? rotuloCategoria(filtros.categoria) : null}>
          <div className="space-y-0.5">
            {(
              [
                ["", "Todas"],
                ["carro", "Carros"],
                ["moto", "Motos"],
                ["caminhao", "Caminhões e pesados"],
              ] as const
            ).map(([v, r]) => (
              <label key={v} className={opcao}><input type="radio" name="categoria" value={v} defaultChecked={(filtros.categoria ?? "") === v} /> {r}</label>
            ))}
          </div>
        </Chip>

        {carteira.plano.buscas_ilimitadas ? (
          <div className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-neutral-700" title="Seu plano tem buscas ilimitadas">
            <span className="text-[var(--verde)]">∞</span> buscas ilimitadas
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2 text-sm" title={`${carteira.cotaUsadas} buscas pagas neste mês de ${carteira.cotaLimite}`}>
            <span className={`font-semibold ${pct >= 80 ? "text-red-600" : "text-neutral-700"}`}>
              {carteira.cotaUsadas}/{carteira.cotaLimite}
            </span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
              <span className={`block h-full rounded-full ${pct >= 80 ? "bg-red-500" : "bg-[var(--azul)]"}`} style={{ width: `${Math.max(4, pct)}%` }} />
            </span>
          </div>
        )}
      </div>
    </form>
  );
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function rotuloPreco(p: NonNullable<Filtros["preco"]>) {
  return { ate20: "Até R$ 20 mil", "20a50": "R$ 20–50 mil", "50a100": "R$ 50–100 mil", acima100: "+ R$ 100 mil" }[p];
}
function rotuloCategoria(c: NonNullable<Filtros["categoria"]>) {
  return { carro: "Carros", moto: "Motos", caminhao: "Caminhões", outro: "Outros" }[c];
}

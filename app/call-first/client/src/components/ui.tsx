import type { ReactNode } from 'react';
import { Badge, Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';

export const COR_INTENCAO: Record<string, string> = {
  compra_imediata: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  avaliando: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  suporte: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  spam: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const ROTULO_INTENCAO: Record<string, string> = {
  compra_imediata: 'Compra imediata',
  avaliando: 'Avaliando',
  suporte: 'Suporte',
  spam: 'Spam',
};

export function IntencaoBadge({ intencao }: { intencao: string | null | undefined }) {
  const chave = intencao ?? '';
  return (
    <Badge variant="outline" className={`border-0 ${COR_INTENCAO[chave] ?? ''}`}>
      {ROTULO_INTENCAO[chave] ?? 'Sem classificação'}
    </Badge>
  );
}

export function PageHeader({ trilha, titulo, descricao, icone }: { trilha: string; titulo: string; descricao?: string; icone?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">{trilha}</div>
      <h1 className="mt-1 flex items-center gap-2 text-2xl md:text-3xl font-bold text-foreground">
        {icone}
        {titulo}
      </h1>
      {descricao && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{descricao}</p>}
    </div>
  );
}

type Tom = 'azul' | 'verde' | 'ambar' | 'vermelho' | 'violeta' | 'cinza';

const BORDA: Record<Tom, string> = {
  azul: 'border-l-sky-500',
  verde: 'border-l-emerald-500',
  ambar: 'border-l-amber-500',
  vermelho: 'border-l-rose-500',
  violeta: 'border-l-violet-500',
  cinza: 'border-l-slate-400',
};

export function KpiCard({
  titulo,
  valor,
  detalhe,
  origem,
  tom,
  icone,
  carregando,
}: {
  titulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  origem: string;
  tom: Tom;
  icone?: ReactNode;
  carregando?: boolean;
}) {
  return (
    <Card className={`border-l-4 ${BORDA[tom]} shadow-sm`}>
      <CardContent className="p-4 flex flex-col gap-1 h-full">
        <div className="flex items-start justify-between text-sm text-muted-foreground">
          <span>{titulo}</span>
          <span className="opacity-70">{icone}</span>
        </div>
        {carregando ? <Skeleton className="h-8 w-20 my-1" /> : <div className="text-3xl font-bold text-foreground">{valor}</div>}
        {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
        <div className="mt-auto pt-3 text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground/80">{origem}</div>
      </CardContent>
    </Card>
  );
}

export function ErroBox({ erro }: { erro: string }) {
  return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">Erro ao consultar: {erro}</div>;
}

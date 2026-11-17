import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  BarChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ArrowRight, CheckCircle2, Flame, Inbox, ListOrdered, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { ErroBox, KpiCard, PageHeader } from '../components/ui';
import { FonteDecisao } from '../components/FonteDecisao';
import { useVersao } from '../lib/versao';

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export function VisaoGeralPage() {
  const navigate = useNavigate();
  const { versao } = useVersao();
  const params = useMemo(() => ({ versao: sql.int(versao) }), [versao]);

  const kpis = useAnalyticsQuery('kpis', params);
  const fora = useAnalyticsQuery('fora_da_fila', {});
  const k = kpis.data?.[0];
  const carregando = kpis.loading;

  const recebidos = n(k?.recebidos);
  const naFila = n(k?.na_fila);
  const compra = n(k?.compra_imediata);
  const foraFila = n(k?.compra_fora_fila);
  const contatados = n(k?.contatados);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader trilha={`Operação comercial · dia de referência ${k?.data_referencia ?? '…'}`} titulo="Visão do Gestor" />

      {/* Hero: a frase do dia em números */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0b2a6b] via-[#1346a8] to-[#1d63d8] p-6 md:p-8 text-white shadow-lg">
        <div className="text-[11px] font-semibold tracking-[0.2em] uppercase text-sky-100/80">300 leads · 20 conversas · quais 20?</div>
        {carregando ? (
          <Skeleton className="mt-3 h-10 w-2/3 bg-white/20" />
        ) : (
          <h2 className="mt-2 text-2xl md:text-4xl font-bold">
            {naFila} leads na fila hoje · {compra} de compra imediata
          </h2>
        )}
        <p className="mt-3 max-w-3xl text-sm md:text-base text-sky-50/90">
          De <b>{recebidos}</b> leads recebidos, a IA classificou a intenção e extraiu produto, licenças, prazo e orçamento. A fila reúne
          as <b>{naFila}</b> maiores notas; <b>{foraFila}</b> leads de compra imediata ficaram de fora por falta de capacidade e{' '}
          <b>{contatados}</b> já foram contatados.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="bg-white text-[#0b2a6b] hover:bg-sky-50" onClick={() => void navigate('/fila')}>
            Ver minha fila <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => void navigate('/agente')}>
            <Sparkles className="mr-1 h-4 w-4" /> Perguntar ao agente
          </Button>
        </div>
      </section>

      {kpis.error && <ErroBox erro={kpis.error} />}

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard titulo="Recebidos" valor={recebidos} detalhe={`${n(k?.unicos)} únicos após deduplicação`} origem="bronze.leads" tom="azul" icone={<Inbox className="h-4 w-4" />} carregando={carregando} />
        <KpiCard titulo="Classificados" valor={n(k?.classificados)} detalhe="ai_classify + regra de spam" origem="silver.leads_ia" tom="violeta" icone={<Sparkles className="h-4 w-4" />} carregando={carregando} />
        <KpiCard titulo="Na fila" valor={naFila} detalhe="capacidade: 4 vendedores × 5" origem="gold.fila_do_dia" tom="verde" icone={<ListOrdered className="h-4 w-4" />} carregando={carregando} />
        <KpiCard titulo="Contatados" valor={contatados} detalhe={`de ${naFila} leads na fila`} origem="gold.feedback_contatos" tom="cinza" icone={<CheckCircle2 className="h-4 w-4" />} carregando={carregando} />
        <KpiCard titulo="Compra imediata" valor={compra} detalhe={`${foraFila} ficaram fora da fila`} origem="gold.leads_classificados" tom="vermelho" icone={<Flame className="h-4 w-4" />} carregando={carregando} />
        <KpiCard titulo="Acurácia da IA" valor={`${n(k?.acuracia_ia).toLocaleString('pt-BR')}%`} detalhe="vs. gabarito · meta ≥ 85%" origem="gabarito/intencao.csv" tom="ambar" icone={<Target className="h-4 w-4" />} carregando={carregando} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm min-w-0">
          <CardHeader>
            <CardTitle>Funil do dia</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart queryKey="funil" parameters={params} xKey="etapa" yKey="leads" orientation="horizontal" height={280} />
          </CardContent>
        </Card>
        <Card className="shadow-sm min-w-0">
          <CardHeader>
            <CardTitle>Intenção por canal</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              queryKey="intencao_canal"
              parameters={{}}
              xKey="canal"
              yKey={['compra_imediata', 'avaliando', 'suporte', 'spam']}
              stacked
              showLegend
              height={280}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-rose-500" /> Compra imediata fora da fila
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fora.loading && <Skeleton className="h-24 w-full" />}
          {fora.error && <ErroBox erro={fora.error} />}
          {fora.data && fora.data.length === 0 && <div className="text-sm text-muted-foreground">Nenhum lead quente ficou de fora.</div>}
          {fora.data && fora.data.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fora.data.map((l) => (
                    <TableRow key={String(l.lead_id)}>
                      <TableCell className="font-medium">{String(l.nome ?? '')}</TableCell>
                      <TableCell>{String(l.empresa ?? '—')}</TableCell>
                      <TableCell>{String(l.canal ?? '')}</TableCell>
                      <TableCell className="text-right">{n(l.nota)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{String(l.motivo ?? '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FonteDecisao />
    </div>
  );
}

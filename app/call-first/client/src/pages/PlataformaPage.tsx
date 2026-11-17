import { Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { Layers } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { FonteDecisao } from '../components/FonteDecisao';

const PESOS = [
  { componente: 'Intenção (50%)', fonte: 'ai_classify', regra: 'compra_imediata 100 · avaliando 40 · suporte/spam 0' },
  { componente: 'Perfil (25%)', fonte: 'empresas + histórico', regra: 'grande 100 · médio 60 · pequeno 30 · sem cadastro 20 · +20 se já é cliente' },
  { componente: 'Sinais (15%)', fonte: 'ai_extract', regra: '+40 orçamento aprovado · +30 prazo · +30 quantidade' },
  { componente: 'Recência (10%)', fonte: 'recebido_em', regra: '100 no dia · 50 no dia seguinte · 25 em 2 dias · 0 depois' },
];

const TABELAS = [
  ['bronze.leads / empresas / oportunidades', 'Streaming tables (Auto Loader) com _arquivo e _rescued_data'],
  ['silver.leads', 'E-mail e CNPJ normalizados, deduplicado por e-mail, expectations'],
  ['silver.leads_ia', 'Streaming table: ai_classify + ai_extract só em leads novos'],
  ['gold.leads_classificados', 'Todos os leads com nota, componentes, motivo e próximo passo'],
  ['gold.fila_do_dia', 'Top 20 por nota, 5 por vendedor em rodízio'],
  ['gold.feedback_contatos', 'Gravada pelo botão "Marcar como contatado"'],
];

export function PlataformaPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        trilha="Plataforma → Governança"
        titulo="Da fonte à decisão"
        icone={<Layers className="h-6 w-6" />}
        descricao="Tudo roda dentro do Databricks, no catálogo call_first_v2, governado pelo Unity Catalog."
      />
      <FonteDecisao />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Regra da nota (0–100)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PESOS.map((p) => (
              <div key={p.componente} className="rounded-md border p-3">
                <div className="flex justify-between text-sm font-semibold text-foreground">
                  <span>{p.componente}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.fonte}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{p.regra}</div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">Travas: spam → “Descartar”; suporte → “Encaminhar ao suporte” (nota 0, fora da fila).</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tabelas do medalhão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TABELAS.map(([tabela, desc]) => (
              <div key={tabela} className="rounded-md border p-3">
                <div className="font-mono text-xs font-semibold text-foreground">call_first_v2.{tabela}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

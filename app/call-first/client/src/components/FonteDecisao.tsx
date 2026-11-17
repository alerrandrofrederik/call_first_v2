import { ChevronRight, Layers } from 'lucide-react';
import { Card, CardContent } from '@databricks/appkit-ui/react';

const ETAPAS = [
  { titulo: 'Fontes', itens: ['leads_*.csv (site, LinkedIn, eventos)', 'empresas_*.csv (cadastro)', 'oportunidades_*.csv (CRM)'] },
  { titulo: 'Ingestão', itens: ['Volume bronze.raw no Unity Catalog', 'Auto Loader (read_files)', 'Cada arquivo lido uma vez'] },
  { titulo: 'Spark Declarative Pipelines', itens: ['Bronze → Silver → Gold', 'Dedup por e-mail · CNPJ validado', 'Expectations de qualidade'] },
  { titulo: 'AI Functions', itens: ['ai_classify → intenção', 'ai_extract → produto, licenças, prazo', 'Só leads novos (incremental)'] },
  { titulo: 'Nota e fila', itens: ['Nota 0–100 explicável', '20 maiores notas', '5 leads por vendedor'] },
  { titulo: 'App + Genie', itens: ['Databricks Apps (AppKit)', 'Agente Genie em português', 'Contatado → gold.feedback'] },
];

export function FonteDecisao() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Da fonte à decisão</div>
            <div className="text-xs text-muted-foreground">O que a plataforma faz por trás desta tela</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {ETAPAS.map((etapa, i) => (
            <div key={etapa.titulo} className="relative rounded-lg border p-3">
              <div className="h-6 w-6 rounded bg-[#0b1736] text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{etapa.titulo}</div>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {etapa.itens.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              {i < ETAPAS.length - 1 && (
                <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

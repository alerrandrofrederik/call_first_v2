import { useState } from 'react';
import { Button, Card, CardContent, GenieChat } from '@databricks/appkit-ui/react';
import { Bot, Copy, Flame, ListChecks, Radio, Swords, Target } from 'lucide-react';
import { PageHeader } from '../components/ui';

const SUGESTOES = [
  { icone: <Flame className="h-4 w-4" />, titulo: 'Leads quentes de hoje', pergunta: 'Quantos leads de compra imediata chegaram hoje?' },
  { icone: <Target className="h-4 w-4" />, titulo: 'Quem ficou de fora', pergunta: 'Quais leads de compra imediata ficaram fora da fila de hoje?' },
  { icone: <Radio className="h-4 w-4" />, titulo: 'Melhor canal', pergunta: 'Qual canal trouxe mais leads de compra imediata nesta semana?' },
  { icone: <Swords className="h-4 w-4" />, titulo: 'Concorrência', pergunta: 'Quais leads citaram concorrente?' },
  { icone: <ListChecks className="h-4 w-4" />, titulo: 'Andamento da fila', pergunta: 'Quantos leads da fila cada vendedor já contatou?' },
];

export function AgentePage() {
  const [copiada, setCopiada] = useState<string | null>(null);

  const copiar = async (pergunta: string) => {
    try {
      await navigator.clipboard.writeText(pergunta);
      setCopiada(pergunta);
    } catch {
      setCopiada(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        trilha="Inteligência → Agente · AI/BI Genie"
        titulo="Agente Comercial"
        icone={<Bot className="h-6 w-6" />}
        descricao="Pergunte em português sobre os leads, a fila e os contatos. O agente consulta as tabelas Gold governadas pelo Unity Catalog e mostra o SQL que usou."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">Perguntas do roteiro</div>
          {SUGESTOES.map((sug) => (
            <Card key={sug.pergunta} className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {sug.icone} {sug.titulo}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{sug.pergunta}</p>
                <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => void copiar(sug.pergunta)}>
                  <Copy className="mr-1 h-3 w-3" /> {copiada === sug.pergunta ? 'Copiada! Cole no chat' : 'Copiar pergunta'}
                </Button>
              </CardContent>
            </Card>
          ))}
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
            {['Genie', 'SQL Warehouse', 'Unity Catalog'].map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {chip}
              </span>
            ))}
          </div>
        </div>

        <Card className="shadow-sm min-w-0">
          <CardContent className="p-0 h-[640px]">
            <GenieChat alias="default" placeholder="Pergunte sobre leads, fila, canais… (ex.: quais leads de compra imediata ficaram fora da fila?)" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

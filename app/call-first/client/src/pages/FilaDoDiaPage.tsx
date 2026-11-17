import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { Building2, Check, ListOrdered, PhoneCall, Quote } from 'lucide-react';
import { ErroBox, IntencaoBadge, PageHeader } from '../components/ui';
import { useVersao } from '../lib/versao';

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const s = (v: string | number | boolean | null | undefined) => (v === null || v === undefined ? '' : String(v));

const COMPONENTES: { chave: 'c_intencao' | 'c_perfil' | 'c_sinais' | 'c_recencia'; rotulo: string; peso: string }[] = [
  { chave: 'c_intencao', rotulo: 'Intenção', peso: '50%' },
  { chave: 'c_perfil', rotulo: 'Perfil', peso: '25%' },
  { chave: 'c_sinais', rotulo: 'Sinais', peso: '15%' },
  { chave: 'c_recencia', rotulo: 'Recência', peso: '10%' },
];

function Entidade({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{rotulo}:</span>
      <span className="font-medium text-foreground">{valor}</span>
    </span>
  );
}

export function FilaDoDiaPage() {
  const { versao, incrementar } = useVersao();
  const [vendedor, setVendedor] = useState('Todos');
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const vendedores = useAnalyticsQuery('vendedores', {});
  const params = useMemo(() => ({ vendedor: sql.string(vendedor), versao: sql.int(versao) }), [vendedor, versao]);
  const fila = useAnalyticsQuery('fila', params);

  const marcarContatado = async (leadId: string, dono: string) => {
    setSalvando(leadId);
    setErroAcao(null);
    try {
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, vendedor: vendedor === 'Todos' ? dono : vendedor }),
      });
      if (!resp.ok) {
        const corpo: unknown = await resp.json().catch(() => null);
        const msg = corpo && typeof corpo === 'object' && 'error' in corpo ? String(corpo.error) : `HTTP ${resp.status}`;
        setErroAcao(msg);
      } else {
        incrementar();
      }
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : 'Falha de rede');
    } finally {
      setSalvando(null);
    }
  };

  const linhas = fila.data ?? [];
  const contatados = linhas.filter((l) => n(l.contatado) === 1).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        trilha="Operação → Fila do dia"
        titulo="Fila do Dia"
        icone={<ListOrdered className="h-6 w-6" />}
        descricao="Os 20 leads de maior nota, 5 por vendedor. Cada card mostra por que o lead está na fila e o que fazer na ligação."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 w-60">
          <Label htmlFor="vendedor">Vendedor</Label>
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger id="vendedor">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os vendedores</SelectItem>
              {(vendedores.data ?? []).map((v) => (
                <SelectItem key={s(v.vendedor)} value={s(v.vendedor)}>
                  {s(v.vendedor)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!fila.loading && linhas.length > 0 && (
          <div className="text-sm text-muted-foreground pb-2">
            {contatados} de {linhas.length} contatados
          </div>
        )}
      </div>

      {fila.error && <ErroBox erro={fila.error} />}
      {erroAcao && <ErroBox erro={erroAcao} />}
      {fila.loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      )}
      {!fila.loading && !fila.error && linhas.length === 0 && (
        <div className="text-sm text-muted-foreground">Nenhum lead na fila para este filtro.</div>
      )}

      <div className="space-y-4">
        {linhas.map((l) => {
          const leadId = s(l.lead_id);
          const contatado = n(l.contatado) === 1;
          return (
            <Card key={leadId} className={`shadow-sm ${contatado ? 'opacity-70' : ''}`}>
              <CardContent className="p-5 grid gap-5 md:grid-cols-[1fr_260px]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">#{n(l.posicao)}</span>
                    <span className="text-lg font-semibold text-foreground">{s(l.nome)}</span>
                    <IntencaoBadge intencao={s(l.intencao)} />
                    <Badge variant="secondary">{s(l.vendedor)}</Badge>
                    {contatado && (
                      <Badge className="bg-emerald-600 text-white">
                        <Check className="mr-1 h-3 w-3" /> Contatado
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" /> {s(l.empresa) || 'Empresa não identificada'}
                      {s(l.porte) && ` · ${s(l.porte)}`}
                    </span>
                    {s(l.cargo) && <span>{s(l.cargo)}</span>}
                    <span>canal: {s(l.canal)}</span>
                    <span>{s(l.telefone)}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{s(l.motivo)}</div>
                  <div className="flex flex-wrap gap-2">
                    <Entidade rotulo="Produto" valor={s(l.produto)} />
                    <Entidade rotulo="Licenças" valor={s(l.qtd_licencas)} />
                    <Entidade rotulo="Prazo" valor={s(l.prazo)} />
                    <Entidade rotulo="Orçamento" valor={n(l.orcamento_aprovado) === 1 ? 'aprovado' : ''} />
                    <Entidade rotulo="Concorrente" valor={s(l.concorrente_citado)} />
                  </div>
                  <blockquote className="flex gap-2 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                    <Quote className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{s(l.mensagem)}</span>
                  </blockquote>
                </div>

                <div className="flex flex-col gap-3 md:border-l md:pl-5">
                  <div>
                    <div className="text-xs text-muted-foreground">Nota de prioridade</div>
                    <div className="text-4xl font-bold text-foreground">{n(l.nota)}</div>
                  </div>
                  <div className="space-y-1.5">
                    {COMPONENTES.map((c) => (
                      <div key={c.chave}>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {c.rotulo} <span className="opacity-60">({c.peso})</span>
                          </span>
                          <span>{n(l[c.chave])}</span>
                        </div>
                        <Progress value={n(l[c.chave])} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md bg-sky-50 dark:bg-sky-950/40 p-2 text-xs text-sky-900 dark:text-sky-200">
                    <b>Próximo passo:</b> {s(l.proximo_passo)}
                  </div>
                  <Button
                    disabled={contatado || salvando === leadId}
                    onClick={() => void marcarContatado(leadId, s(l.vendedor))}
                    variant={contatado ? 'secondary' : 'default'}
                  >
                    <PhoneCall className="mr-1 h-4 w-4" />
                    {contatado ? 'Contatado' : salvando === leadId ? 'Salvando…' : 'Marcar como contatado'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

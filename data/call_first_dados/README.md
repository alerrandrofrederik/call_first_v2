# Call First V2 · dados sintéticos

Gerados por `gerar_csvs.py` (seed 42, data de referência 2026-11-17). Para o dia do workshop:
`python gerar_csvs.py --data AAAA-MM-DD` (mesma estrutura, datas atualizadas).

## Onde subir
Todos os arquivos de `raw/` vão para a **mesma pasta** no Volume. O Auto Loader separa as fontes pelo nome do arquivo (`leads_*`, `empresas_*`, `oportunidades_*`).

| Arquivo local | Destino no Volume |
|---|---|
| `raw/empresas_*.csv` | `/Volumes/call_first_v2/bronze/raw/` (antes da demo) |
| `raw/oportunidades_*.csv` | `/Volumes/call_first_v2/bronze/raw/` (antes da demo) |
| `raw/leads_DEMO.csv` | `/Volumes/call_first_v2/bronze/raw/` (**ao vivo**) |
| `gabarito/*.csv` | `/Volumes/call_first_v2/bronze/gabarito/` (fora do `raw`) |

> O `gerar_csvs.py` ainda grava em subpastas (`raw/leads/`, `raw/empresas/`, `raw/historico/`). Depois de gerar, mova os arquivos para `raw/`.

## O que tem em `leads_DEMO.csv` (300 linhas)
- **290 leads únicos** por e-mail normalizado. Intenção após deduplicação: 33 compra_imediata · 117 avaliando · 60 suporte · 80 spam.
  Com 20 vagas na fila, **13 leads de compra imediata ficam de fora**: é a resposta da pergunta final ao agente.
- **Mensagem herói** (L…-0258): 200 licenças do Atlas Gestão até dezembro, orçamento aprovado, Diretor Financeiro, migrando do OmniERP. Chega às **17h48**: por ordem de chegada seria o 258º.
- **5 pegadinhas** (coluna `pegadinha` do gabarito): P1 suporte que cita "comprar", P2 spam com "urgente/proposta/preço", P3 cliente pedindo cross-sell, P4 demo em evento sem urgência, P5 compra em inglês.
- **Duplicados (10 linhas)**: 6 reenvios com e-mail em outra caixa ou com espaços, 3 duplos cliques (segundos de diferença) e 1 reenvio em que o lead **evolui de avaliando para compra** (a deduplicação precisa manter a mensagem mais recente).
- **CNPJ**: com máscara, sem máscara e com espaços; 124 vazios; **3 inválidos** (dígito verificador).
- **3 datas malformadas** em `recebido_em` (vão para `_rescued_data` com schema hint `recebido_em TIMESTAMP`).
- **6 mensagens com menos de 5 caracteres** (viram spam sem chamar a IA).
- Canais com perfis diferentes: indicação e LinkedIn concentram compra; site e Google Ads concentram suporte e spam.

## Outros arquivos
- `empresas_*.csv`: 181 empresas (porte, segmento, funcionários, UF); CNPJ com e sem máscara.
- `oportunidades_*.csv`: 183 oportunidades (ganha/perdida/aberta), base para `ja_cliente` e cross-sell.
- `gabarito/intencao.csv`: intenção esperada por linha (CA-04, CA-05) + observações dos casos planejados.
- `gabarito/entidades.csv`: entidades esperadas das 33 mensagens de compra (CA-06).

Empresas, pessoas, concorrentes e CNPJs são fictícios.

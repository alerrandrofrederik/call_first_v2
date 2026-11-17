# Call First V2

Priorização de leads com engenharia de dados + IA no Databricks (Medalhão → `ai_classify`/`ai_extract` → Data App + Genie). Escopo completo no [PRD.md](PRD.md).

## Pré-requisitos

| Ferramenta | Instalação | Versão usada |
|---|---|---|
| uv | `powershell -c "irm https://astral.sh/uv/install.ps1 \| iex"` | 0.6.9 |
| Databricks CLI | `winget install Databricks.DatabricksCLI` | 1.22.1 |
| GitHub CLI | `winget install GitHub.cli` | — |
| Claude Code | `irm https://claude.ai/install.ps1 \| iex` | — |

## Passo a passo do zero até o estado atual

### 1. Projeto Python, Git e GitHub

```powershell
# Cria o projeto Python (versão fixada em .python-version)
uv init call_first_v2 --python 3.12
cd call_first_v2

# Inicializa o Git e faz o primeiro commit
git init
git add .
git commit -m "Initial commit"

# Cria o repositório público no GitHub, associa o remoto e faz o push
gh repo create call_first_v2 --public --source=. --remote=origin --push

# Cria o ambiente virtual (.venv, já ignorado no .gitignore)
uv venv
.venv\Scripts\activate      # opcional: dá para rodar tudo com `uv run`
```

> `uv sync` e `uv add <pacote>` geram o `uv.lock` quando o projeto tiver dependências.

### 2. Dados sintéticos

Os CSVs ficam em `data/call_first_dados/`. Detalhes dos casos de teste estão em [data/call_first_dados/README.md](data/call_first_dados/README.md).

```powershell
cd data\call_first_dados
uv run gerar_csvs.py --data 2026-11-17   # seed fixa: a mesma data gera os mesmos arquivos
cd ..\..

git add data
git commit -m "add dados"
git push
```

### 3. Autenticação no Databricks

```powershell
databricks --version
databricks auth login --host https://dbc-302cbd09-e572.cloud.databricks.com --profile pessoal
databricks auth profiles                       # deve mostrar "pessoal ... YES"
databricks current-user me --profile pessoal
```

> ⚠️ O perfil `DEFAULT` aponta para **outro** workspace. Passe sempre `--profile pessoal`.

### 4. Skills do Databricks para o Claude Code

Este comando instala as skills em `.claude/skills/`, no escopo deste projeto.

```powershell
databricks aitools install --agents claude-code --scope project --skills-only --experimental
claude
```

### 5. Bundle: `databricks.yml`

O projeto é um **Declarative Automation Bundle**: pipeline, jobs e app do PRD ficam declarados como código em `resources/*.yml` e sobem com um único deploy.

Este é o momento certo de criar o bundle:
- logo depois da autenticação, porque o host e o perfil já estão validados;
- **antes** de criar qualquer recurso no workspace.

O target `dev` aponta para o workspace `pessoal`.

```yaml
# databricks.yml
bundle:
  name: call_first_v2

variables:
  catalog:         { default: call_first_v2 }
  warehouse_id:    { default: a50e6a998ebe9440 }
  raw_volume_path: { default: /Volumes/call_first_v2/bronze/raw }

include:
  - resources/*.yml

targets:
  dev:
    mode: development
    default: true
    workspace:
      host: https://dbc-302cbd09-e572.cloud.databricks.com
      profile: pessoal
```

```powershell
mkdir resources                              # pipeline/job/app entram aqui (*.pipeline.yml, *.job.yml, *.app.yml)
databricks bundle validate --strict -t dev   # "Validation OK!"
databricks bundle deploy -t dev              # quando houver recursos em resources/
```

> `.databricks/` é o estado local do bundle e já está no `.gitignore`.

### 6. Unity Catalog: catálogo, schemas e volume

Os comandos abaixo são equivalentes ao que já existe no workspace. Esses objetos também podem ser criados pela UI.

```powershell
databricks catalogs create call_first_v2 --profile pessoal
databricks schemas create bronze call_first_v2 --profile pessoal
databricks schemas create silver call_first_v2 --profile pessoal
databricks schemas create gold   call_first_v2 --profile pessoal
databricks volumes create call_first_v2 bronze raw MANAGED --profile pessoal
```

### 7. Upload dos CSVs para o Volume

Os comandos abaixo são equivalentes ao upload que já foi feito.

```powershell
databricks fs cp data\call_first_dados\raw\empresas_2026-11-17.csv      dbfs:/Volumes/call_first_v2/bronze/raw/ --profile pessoal
databricks fs cp data\call_first_dados\raw\oportunidades_2026-11-17.csv dbfs:/Volumes/call_first_v2/bronze/raw/ --profile pessoal
databricks fs cp data\call_first_dados\raw\leads_DEMO.csv               dbfs:/Volumes/call_first_v2/bronze/raw/ --profile pessoal

databricks fs ls dbfs:/Volumes/call_first_v2/bronze/raw/ --profile pessoal
```

### 8. Checagem do ambiente

```powershell
databricks warehouses list               --profile pessoal
databricks catalogs list                 --profile pessoal
databricks schemas list call_first_v2    --profile pessoal
databricks volumes list call_first_v2 bronze --profile pessoal
databricks apps list                     --profile pessoal
databricks genie list-spaces             --profile pessoal
```

### 9. Teste das AI Functions

As AI Functions rodam direto no SQL, sem endpoint para gerenciar. O teste usa a **mensagem herói** (lead `L20261117-0258`). Rode no **SQL Editor** do workspace ou pela CLI:

```powershell
databricks experimental aitools tools query "<SQL abaixo>" --profile pessoal
```

**`ai_classify`: classifica a intenção a partir de rótulos com descrição (PRD 2.5)**

```sql
SELECT ai_classify(
  'Boa tarde, sou Diretor Financeiro da Metalúrgica Bandeirantes. Precisamos de 200 licenças do Atlas Gestão até dezembro, o orçamento já está aprovado. Hoje usamos o OmniERP e queremos migrar. Podemos agendar uma reunião?',
  '{
    "compra_imediata": "Pede preço, proposta, quantidade de licenças, prazo ou reunião comercial",
    "avaliando":       "Quer conhecer, comparar ou ver demo, sem urgência",
    "suporte":         "Já é cliente e relata problema ou dúvida de uso",
    "spam":            "Sem relação com compra"
  }',
  map('version', '2.1')
) AS intencao;
```

Resultado obtido:

```json
{"error_message": null, "metadata": {"version": "2.1"}, "response": [{"value": "compra_imediata"}]}
```

Para pegar só o rótulo: `intencao:response[0].value::string` → `compra_imediata` ✅

**`ai_extract`: transforma o texto em campos**

```sql
SELECT ai_extract(
  'Boa tarde, sou Diretor Financeiro da Metalúrgica Bandeirantes. Precisamos de 200 licenças do Atlas Gestão até dezembro, o orçamento já está aprovado. Hoje usamos o OmniERP e queremos migrar. Podemos agendar uma reunião?',
  '{
    "produto":            {"type": "string",  "description": "Produto Atlas citado"},
    "qtd_licencas":       {"type": "integer", "description": "Quantidade de licenças ou usuários"},
    "prazo":              {"type": "string",  "description": "Prazo ou data desejada"},
    "orcamento_aprovado": {"type": "boolean", "description": "Mencionou orçamento aprovado"},
    "cargo":              {"type": "string",  "description": "Cargo de quem escreveu"}
  }',
  map('version', '2.1')
) AS entidades;
```

Resultado obtido:

| Campo | Valor extraído | Esperado (CA-06) |
|---|---|---|
| `produto` | Atlas Gestão | ✅ Atlas Gestão |
| `qtd_licencas` | 200 | ✅ 200 |
| `prazo` | até dezembro | ✅ dezembro |
| `orcamento_aprovado` | true | ✅ true |
| `cargo` | Diretor Financeiro | ✅ |


> No `ai_extract` 2.1, cada campo vem dentro de `{"value": ...}`. O caminho correto é `entidades:response.qtd_licencas.value::int` (já corrigido no PRD).

## Implementação (PRD M0 → M5)

### M0 · Setup

O arquivo [src/setup/00_setup.sql](src/setup/00_setup.sql) roda uma vez no SQL Warehouse e cria:
- as funções `silver.cnpj_dv` e `silver.cnpj_valido`, que validam o dígito verificador do CNPJ;
- o volume `bronze.gabarito`;
- a tabela `gold.vendedores`, com os 4 vendedores;
- a tabela `gold.feedback_contatos`, que o app usa.

```powershell
# rode os statements no SQL Editor, ou um a um com:
databricks experimental aitools tools query "<statement>" --profile pessoal

# gabarito (fora do raw, não é lido pelo Auto Loader)
databricks fs cp data\call_first_dados\gabarito\intencao.csv  dbfs:/Volumes/call_first_v2/bronze/gabarito/ --profile pessoal
databricks fs cp data\call_first_dados\gabarito\entidades.csv dbfs:/Volumes/call_first_v2/bronze/gabarito/ --profile pessoal
```

Teste: `cnpj_valido` acusa exatamente os **3 CNPJs inválidos** planejados nos dados ✅

### M1 · Bronze (RF-01, RF-02)

- O pipeline SDP serverless está em [resources/call_first.pipeline.yml](resources/call_first.pipeline.yml).
- O código está em [src/pipeline/01_bronze.sql](src/pipeline/01_bronze.sql): três streaming tables com Auto Loader (`STREAM read_files`), que separam as fontes por `fileNamePattern`.

```powershell
databricks bundle validate --strict -t dev
databricks bundle deploy -t dev
databricks bundle run call_first_pipeline -t dev
```

| Critério | Resultado |
|---|---|
| CA-01: `leads_DEMO.csv` gera exatamente 300 registros; rodar de novo gera 0 | ✅ 300 → 300 na segunda execução |
| CA-02: as 3 datas malformadas vão para `_rescued_data` | ✅ leads 0035, 0223, 0255 |
| Empresas / oportunidades | 181 / 183 linhas |

### M2 · Silver (RF-03 a RF-06)

[src/pipeline/02_silver.sql](src/pipeline/02_silver.sql):
- `silver.leads`: e-mail e CNPJ normalizados (`cnpj_ok` vem da função `cnpj_valido`) e deduplicação por e-mail, ficando a mensagem mais recente. Tem expectations de qualidade.
- `silver.empresas`: base cadastral com CNPJ normalizado.
- `silver.historico_empresa`: oportunidades agregadas por empresa (`ja_cliente`, produtos já comprados).
- `silver.leads_enriquecidos`: lead + empresa + histórico.

### M3 · IA + Gold (RF-07 a RF-12)

- [src/pipeline/03_ia.sql](src/pipeline/03_ia.sql): `silver.leads_ia` é uma **streaming table**, então cada lead novo passa pela IA uma única vez (CA-11).
  - Mensagem com menos de 5 caracteres vira spam sem chamar a IA.
  - `ai_extract` só roda em `compra_imediata` e `avaliando`.
- [src/pipeline/04_gold.sql](src/pipeline/04_gold.sql):
  - `gold.leads_classificados`: nota 0–100 com os 4 componentes, motivo e próximo passo.
  - `gold.fila_do_dia`: top 20, com 5 leads por vendedor em rodízio.

```powershell
databricks bundle deploy -t dev
databricks bundle run call_first_pipeline -t dev
# critérios de aceite: rode os blocos de src/validacao/ca_checks.sql
```

| Critério | Resultado |
|---|---|
| CA-03: 0 e-mails duplicados na Silver | ✅ 0 (300 → 290 únicos) |
| CA-04: acurácia do `ai_classify` ≥ 85% | ✅ **98,0%** |
| CA-05: ≥ 4 de 5 pegadinhas | ✅ **5 de 5** |
| CA-06: herói 0258 → Atlas Gestão, 200, dezembro, orçamento true | ✅ e está em **1º na fila, nota 100** |
| CA-07: nenhum spam/suporte na fila | ✅ |
| CA-08: 20 leads, 5 por vendedor, com os 4 componentes | ✅ |
| CA-11: nova execução sem arquivo novo não chama a IA | ✅ `silver.leads_ia` continua com 300 linhas |

> ⚠️ **Erros da IA (6 de 300):** todos na mesma mensagem de spam, "Gostaria de anunciar no blog de vocês, qual o valor do post patrocinado?", que a IA classificou como `compra_imediata` porque a mensagem pergunta preço. Eles não entram na fila (nota 65), mas aparecem em "fora da fila", que mostra 19 leads em vez dos 13 do gabarito. Ajuste sugerido: deixar mais clara a descrição dos rótulos `compra_imediata` e `spam` e fazer full refresh de `silver.leads_ia`.

### M4 · Genie + Data App (RF-13 a RF-16)

**Genie Space** "Call First · Agente Comercial" (id `01f1e2bdc05010c2a60659fdfad9c0fe`), definido em [genie/space.json](genie/space.json):

```powershell
$env:MSYS_NO_PATHCONV=1   # só no Git Bash
databricks workspace mkdirs /Workspace/Users/<você>/genie_spaces --profile pessoal
databricks genie create-space a50e6a998ebe9440 "<conteúdo de genie/space.json>" --title "Call First · Agente Comercial" --parent-path /Workspace/Users/<você>/genie_spaces --profile pessoal
```

CA-10 ✅: as 5 perguntas do roteiro foram respondidas corretamente, tanto pela Conversation API quanto pela tela do app.

**Data App** em AppKit, na pasta [app/call-first](app/call-first). Tem bundle próprio e roda como service principal, com o Genie em nome do usuário:
- **Visão do Gestor:** hero com a frase do dia, 6 KPIs com a tabela de origem, funil, intenção × canal, lista de compra imediata fora da fila e a faixa "Da fonte à decisão".
- **Fila do Dia:** filtro por vendedor; cards com nota, os 4 componentes, entidades extraídas, mensagem e próximo passo; botão **Marcar como contatado**, que faz `POST /api/feedback` → `gold.feedback_contatos`.
- **Agente:** chat Genie com as 5 perguntas do roteiro.
- **Plataforma:** regra da nota e tabelas do medalhão.

```powershell
cd app\call-first
npm install
# tipos das consultas (precisa do warehouse)
$env:DATABRICKS_CONFIG_PROFILE="pessoal"; $env:DATABRICKS_WAREHOUSE_ID="a50e6a998ebe9440"
npx @databricks/appkit generate-types --wait
databricks apps validate --profile pessoal
databricks apps deploy --skip-validation --profile pessoal
```

As permissões do service principal do app estão em [src/setup/01_grants_app.sql](src/setup/01_grants_app.sql): leitura das camadas e do gabarito, escrita só no feedback.

URL: https://call-first-1835011522269435.aws.databricksapps.com

CA-09 ✅: marquei o lead 0258 como contatado na tela. A linha apareceu em `gold.feedback_contatos`, o contador foi para "1 de 20" e o agente respondeu "Ana Ribeiro já contatou 1 lead".

## Estado atual (2026-11-17)

| Item | Status |
|---|---|
| Databricks CLI v1.22.1 + perfil `pessoal` (OAuth) | ✅ |
| Bundle `databricks.yml` (target `dev` → `pessoal`) | ✅ |
| M0 · Setup | ✅ |
| M1 · Bronze (CA-01, CA-02) | ✅ |
| M2 · Silver (CA-03) | ✅ |
| M3 · IA + Gold (CA-04 a CA-08, CA-11) | ✅ acurácia 98%, com 6 erros conhecidos de spam |
| M4 · Genie + Data App (CA-09, CA-10) | ✅ app no ar |
| Job com gatilho de chegada de arquivo (CA-12) | ⏳ |
| M5 · Validação e ensaio | ⏳ (backtest pendente: falta histórico com desfecho) |

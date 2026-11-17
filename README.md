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

> ⚠️ No `ai_extract` 2.1, cada campo vem dentro de `{"value": ...}`. O caminho correto é `entidades:response.qtd_licencas.value::int`, e não `entidades:response:qtd_licencas::int` como está no PRD.

## Estado atual (2026-11-17)

| Item | Status |
|---|---|
| Databricks CLI v1.22.1 + perfil `pessoal` (OAuth) | ✅ |
| Skills Databricks em `.claude/skills/` | ✅ |
| Bundle `databricks.yml` (target `dev` → `pessoal`), validado | ✅ (seção 5) |
| Catálogo `call_first_v2` com schemas `bronze` / `silver` / `gold` | ✅ |
| Volume `call_first_v2.bronze.raw` com os 3 CSVs | ✅ |
| SQL Warehouse "Serverless Starter Warehouse" (sobe sob demanda) | ✅ |
| Databricks Apps e Genie API acessíveis | ✅ |
| `.venv` criado, ainda sem dependências | ⚠️ |
| PRD ainda cita `/Volumes/call_first/landing/raw/`; o caminho real é `/Volumes/call_first_v2/bronze/raw/` | ⚠️ |
| Teste das AI Functions (`ai_classify` / `ai_extract`, versão 2.1) | ✅ (seção 9) |

## Próximos passos

```powershell
# Dependências locais
uv add databricks-sdk

# Leitura do volume via SQL
databricks experimental aitools tools query "SELECT * FROM read_files('/Volumes/call_first_v2/bronze/raw/leads_DEMO.csv', format => 'csv', header => true) LIMIT 5" --profile pessoal
```

Depois disso, o próximo passo é a **M2 · Bronze**: declarar o pipeline (Auto Loader lendo `${var.raw_volume_path}`) em `resources/` e rodar `databricks bundle deploy -t dev`.

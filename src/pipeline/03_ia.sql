-- =====================================================================
-- Call First V2 · IA (RF-07, RF-08)
-- Streaming table: cada lead NOVO passa pela IA uma única vez (CA-11).
-- Mensagens com menos de 5 caracteres viram spam sem chamar a IA.
-- ai_extract só roda para compra_imediata e avaliando.
-- =====================================================================

CREATE OR REFRESH STREAMING TABLE call_first_v2.silver.leads_ia
COMMENT 'Intenção (ai_classify) e entidades (ai_extract) por lead, calculadas uma vez'
AS
WITH classificado AS (
  SELECT
    lead_id,
    mensagem,
    CASE
      WHEN mensagem IS NULL OR length(trim(mensagem)) < 5 THEN 'spam'
      ELSE ai_classify(
        mensagem,
        '{
          "compra_imediata": "Pede preço, proposta, quantidade de licenças, prazo ou reunião comercial",
          "avaliando":       "Quer conhecer o produto, comparar opções ou ver uma demonstração, sem urgência",
          "suporte":         "Já é cliente e relata problema, dúvida de uso ou pede ajuda técnica",
          "spam":            "Sem relação com compra: propaganda, teste, texto sem sentido"
        }',
        map('version', '2.1')
      ):response[0].value::string
    END AS intencao,
    mensagem IS NOT NULL AND length(trim(mensagem)) >= 5 AS usou_ia
  FROM STREAM(call_first_v2.bronze.leads)
),
extraido AS (
  SELECT
    *,
    CASE WHEN intencao IN ('compra_imediata', 'avaliando') THEN
      ai_extract(
        mensagem,
        '{
          "produto":            {"type": "string",  "description": "Produto Atlas citado (Atlas Gestão, Atlas BI, Atlas Fiscal, Atlas CRM ou Atlas Estoque)"},
          "qtd_licencas":       {"type": "integer", "description": "Quantidade de licenças ou usuários"},
          "prazo":              {"type": "string",  "description": "Prazo ou data desejada"},
          "orcamento_aprovado": {"type": "boolean", "description": "Mencionou orçamento aprovado"},
          "cargo":              {"type": "string",  "description": "Cargo de quem escreveu"},
          "concorrente_citado": {"type": "string",  "description": "Sistema concorrente mencionado"}
        }',
        map('version', '2.1')
      )
    END AS entidades_raw
  FROM classificado
)
SELECT
  lead_id,
  intencao,
  nullif(trim(entidades_raw:response.produto.value::string), '')            AS produto,
  entidades_raw:response.qtd_licencas.value::int                           AS qtd_licencas,
  nullif(trim(entidades_raw:response.prazo.value::string), '')              AS prazo,
  coalesce(entidades_raw:response.orcamento_aprovado.value::boolean, false) AS orcamento_aprovado,
  nullif(trim(entidades_raw:response.cargo.value::string), '')              AS cargo,
  nullif(trim(entidades_raw:response.concorrente_citado.value::string), '') AS concorrente_citado,
  usou_ia,
  '2.1'               AS versao_ia,
  current_timestamp() AS classificado_em
FROM extraido;

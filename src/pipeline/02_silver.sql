-- =====================================================================
-- Call First V2 · Silver (RF-03 a RF-06)
-- Normaliza e-mail e CNPJ, deduplica leads e une lead + empresa + histórico.
-- =====================================================================

-- Leads limpos e deduplicados pelo e-mail normalizado (fica a mensagem mais recente)
CREATE OR REFRESH MATERIALIZED VIEW call_first_v2.silver.leads (
  CONSTRAINT email_presente   EXPECT (email IS NOT NULL) ON VIOLATION DROP ROW,
  CONSTRAINT cnpj_valido      EXPECT (cnpj IS NULL OR cnpj_ok),
  CONSTRAINT recebido_em_ok   EXPECT (recebido_em IS NOT NULL)
)
COMMENT 'Leads normalizados e deduplicados por e-mail (RF-03, RF-04)'
AS
WITH normalizado AS (
  SELECT
    lead_id,
    trim(nome)                                              AS nome,
    nullif(lower(trim(email)), '')                          AS email,
    telefone,
    nullif(regexp_replace(cnpj, '[^0-9]', ''), '')          AS cnpj,
    lower(trim(canal))                                      AS canal,
    campanha,
    trim(mensagem)                                          AS mensagem,
    recebido_em,
    _arquivo
  FROM call_first_v2.bronze.leads
),
ranqueado AS (
  SELECT
    *,
    count(*)     OVER (PARTITION BY email)                                                AS qtd_envios,
    row_number() OVER (PARTITION BY email ORDER BY recebido_em DESC NULLS LAST, lead_id DESC) AS rn
  FROM normalizado
)
SELECT
  lead_id, nome, email, telefone, cnpj,
  call_first_v2.silver.cnpj_valido(cnpj) AS cnpj_ok,
  canal, campanha, mensagem, recebido_em, qtd_envios, _arquivo
FROM ranqueado
WHERE rn = 1;

-- Empresas com CNPJ normalizado (uma linha por CNPJ)
CREATE OR REFRESH MATERIALIZED VIEW call_first_v2.silver.empresas
COMMENT 'Base cadastral com CNPJ só com dígitos'
AS
SELECT cnpj, razao_social, porte, segmento, num_funcionarios, uf
FROM (
  SELECT
    regexp_replace(cnpj, '[^0-9]', '') AS cnpj,
    razao_social, porte, segmento, num_funcionarios, uf,
    row_number() OVER (PARTITION BY regexp_replace(cnpj, '[^0-9]', '') ORDER BY _ingerido_em DESC) AS rn
  FROM call_first_v2.bronze.empresas
)
WHERE rn = 1;

-- Histórico comercial agregado por empresa
CREATE OR REFRESH MATERIALIZED VIEW call_first_v2.silver.historico_empresa
COMMENT 'Oportunidades agregadas por CNPJ: base para ja_cliente e cross-sell'
AS
SELECT
  regexp_replace(cnpj, '[^0-9]', '')                         AS cnpj,
  count(*)                                                   AS oportunidades,
  count_if(status = 'ganha')                                 AS ganhas,
  count_if(status = 'aberta')                                AS abertas,
  count_if(status = 'ganha') > 0                             AS ja_cliente,
  array_sort(collect_set(CASE WHEN status = 'ganha' THEN produto END)) AS produtos_cliente
FROM call_first_v2.bronze.oportunidades
GROUP BY 1;

-- Lead + empresa + histórico (RF-05)
CREATE OR REFRESH MATERIALIZED VIEW call_first_v2.silver.leads_enriquecidos
COMMENT 'Lead unido à empresa (por CNPJ) e ao histórico comercial'
AS
SELECT
  l.*,
  e.razao_social            AS empresa,
  e.porte,
  e.segmento,
  e.num_funcionarios,
  e.uf,
  coalesce(h.ja_cliente, false) AS ja_cliente,
  coalesce(h.ganhas, 0)         AS oportunidades_ganhas,
  h.produtos_cliente
FROM call_first_v2.silver.leads l
LEFT JOIN call_first_v2.silver.empresas          e ON l.cnpj = e.cnpj
LEFT JOIN call_first_v2.silver.historico_empresa h ON l.cnpj = h.cnpj;

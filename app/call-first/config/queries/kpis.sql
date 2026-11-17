-- @param versao INT
-- Indicadores do dia (Visão do Gestor)
WITH fila AS (SELECT lead_id FROM call_first_v2.gold.fila_do_dia),
gabarito AS (
  SELECT lead_id, intencao_esperada
  FROM read_files('/Volumes/call_first_v2/bronze/gabarito/intencao.csv', format => 'csv', header => true)
)
SELECT
  (SELECT count(*) FROM call_first_v2.bronze.leads)                                               AS recebidos,
  (SELECT count(*) FROM call_first_v2.gold.leads_classificados)                                   AS unicos,
  (SELECT count(*) FROM call_first_v2.gold.leads_classificados WHERE intencao IS NOT NULL)        AS classificados,
  (SELECT count(*) FROM fila)                                                                     AS na_fila,
  (SELECT count(DISTINCT c.lead_id) FROM call_first_v2.gold.feedback_contatos c
     JOIN fila f ON c.lead_id = f.lead_id)                                                        AS contatados,
  (SELECT count(*) FROM call_first_v2.gold.leads_classificados WHERE intencao = 'compra_imediata') AS compra_imediata,
  (SELECT count(*) FROM call_first_v2.gold.leads_classificados l
     WHERE l.intencao = 'compra_imediata' AND l.lead_id NOT IN (SELECT lead_id FROM fila))        AS compra_fora_fila,
  (SELECT round(100 * avg(CASE WHEN ia.intencao = g.intencao_esperada THEN 1.0 ELSE 0.0 END), 1)
     FROM call_first_v2.silver.leads_ia ia JOIN gabarito g ON ia.lead_id = g.lead_id)             AS acuracia_ia,
  (SELECT cast(max(data_referencia) AS STRING) FROM call_first_v2.gold.leads_classificados)       AS data_referencia
WHERE :versao >= 0

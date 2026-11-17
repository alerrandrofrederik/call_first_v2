-- @param versao INT
-- Funil do dia: recebidos → únicos → comerciais → na fila → contatados
SELECT etapa, leads FROM (
  SELECT 1 AS ordem, 'Recebidos' AS etapa, count(*) AS leads FROM call_first_v2.bronze.leads
  UNION ALL SELECT 2, 'Únicos', count(*) FROM call_first_v2.gold.leads_classificados
  UNION ALL SELECT 3, 'Compra + avaliando', count(*) FROM call_first_v2.gold.leads_classificados
    WHERE intencao IN ('compra_imediata', 'avaliando')
  UNION ALL SELECT 4, 'Na fila', count(*) FROM call_first_v2.gold.fila_do_dia
  UNION ALL SELECT 5, 'Contatados', count(DISTINCT c.lead_id) FROM call_first_v2.gold.feedback_contatos c
    JOIN call_first_v2.gold.fila_do_dia f ON c.lead_id = f.lead_id
)
WHERE :versao >= 0
ORDER BY ordem

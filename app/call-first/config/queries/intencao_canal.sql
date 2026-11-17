-- Distribuição de intenção por canal (barras empilhadas)
SELECT
  canal,
  count_if(intencao = 'compra_imediata') AS compra_imediata,
  count_if(intencao = 'avaliando')       AS avaliando,
  count_if(intencao = 'suporte')         AS suporte,
  count_if(intencao = 'spam')            AS spam
FROM call_first_v2.gold.leads_classificados
GROUP BY canal
ORDER BY compra_imediata DESC

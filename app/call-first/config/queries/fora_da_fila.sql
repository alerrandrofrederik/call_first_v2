-- Leads de compra imediata que ficaram fora da fila do dia
SELECT l.lead_id, l.nome, l.empresa, l.canal, l.nota, l.motivo
FROM call_first_v2.gold.leads_classificados l
LEFT ANTI JOIN call_first_v2.gold.fila_do_dia f ON l.lead_id = f.lead_id
WHERE l.intencao = 'compra_imediata'
ORDER BY l.nota DESC

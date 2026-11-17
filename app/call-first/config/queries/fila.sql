-- @param vendedor STRING
-- @param versao INT
-- Fila do dia (5 leads por vendedor) com status de contato
SELECT
  f.posicao, f.vendedor, f.lead_id, f.nome, f.empresa, f.cargo, f.canal, f.porte,
  f.intencao, f.nota,
  f.nota_componentes.intencao  AS c_intencao,
  f.nota_componentes.perfil    AS c_perfil,
  f.nota_componentes.sinais    AS c_sinais,
  f.nota_componentes.recencia  AS c_recencia,
  f.produto, f.qtd_licencas, f.prazo,
  CASE WHEN f.orcamento_aprovado THEN 1 ELSE 0 END AS orcamento_aprovado,  -- 0/1: booleanos chegam como texto no JSON
  f.concorrente_citado,
  f.motivo, f.proximo_passo, f.mensagem, f.email, f.telefone,
  cast(f.recebido_em AS STRING) AS recebido_em,
  CASE WHEN c.lead_id IS NOT NULL THEN 1 ELSE 0 END AS contatado
FROM call_first_v2.gold.fila_do_dia f
LEFT JOIN (SELECT DISTINCT lead_id FROM call_first_v2.gold.feedback_contatos) c ON f.lead_id = c.lead_id
WHERE (:vendedor = 'Todos' OR f.vendedor = :vendedor)
  AND :versao >= 0
ORDER BY f.posicao

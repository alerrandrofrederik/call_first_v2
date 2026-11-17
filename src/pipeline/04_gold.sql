-- =====================================================================
-- Call First V2 · Gold (RF-09 a RF-12)
-- nota = 0,50 × intenção + 0,25 × perfil + 0,15 × sinais + 0,10 × recência
-- Travas: spam e suporte → nota 0 (fora da fila).
-- Recência relativa à data de referência (dia mais recente de leads).
-- =====================================================================

CREATE OR REFRESH MATERIALIZED VIEW call_first_v2.gold.leads_classificados
COMMENT 'Todos os leads com intenção, entidades, nota explicável, motivo e próximo passo (RF-12)'
AS
WITH ref AS (
  SELECT max(to_date(recebido_em)) AS data_referencia FROM call_first_v2.silver.leads
),
base AS (
  SELECT
    l.lead_id, l.nome, l.email, l.telefone, l.cnpj, l.cnpj_ok, l.empresa, l.canal, l.campanha,
    l.porte, l.segmento, l.uf, l.ja_cliente, l.produtos_cliente, l.mensagem, l.recebido_em, l.qtd_envios,
    ia.intencao, ia.produto, ia.qtd_licencas, ia.prazo, ia.orcamento_aprovado, ia.cargo, ia.concorrente_citado,
    ia.versao_ia,
    ref.data_referencia,
    CASE ia.intencao WHEN 'compra_imediata' THEN 100 WHEN 'avaliando' THEN 40 ELSE 0 END AS c_intencao,
    least(100,
      CASE l.porte WHEN 'grande' THEN 100 WHEN 'médio' THEN 60 WHEN 'pequeno' THEN 30 ELSE 20 END
      + CASE WHEN l.ja_cliente THEN 20 ELSE 0 END)                                    AS c_perfil,
    least(100,
      CASE WHEN ia.orcamento_aprovado THEN 40 ELSE 0 END
      + CASE WHEN ia.prazo IS NOT NULL THEN 30 ELSE 0 END
      + CASE WHEN ia.qtd_licencas IS NOT NULL THEN 30 ELSE 0 END)                     AS c_sinais,
    CASE datediff(ref.data_referencia, to_date(l.recebido_em))
      WHEN 0 THEN 100 WHEN 1 THEN 50 WHEN 2 THEN 25 ELSE 0 END                         AS c_recencia
  FROM call_first_v2.silver.leads_enriquecidos l
  LEFT JOIN call_first_v2.silver.leads_ia ia ON l.lead_id = ia.lead_id
  CROSS JOIN ref
)
SELECT
  *,
  CASE WHEN intencao IN ('compra_imediata', 'avaliando')
       THEN cast(round(0.50 * c_intencao + 0.25 * c_perfil + 0.15 * c_sinais + 0.10 * c_recencia) AS INT)
       ELSE 0 END                                                                     AS nota,
  named_struct('intencao', c_intencao, 'perfil', c_perfil, 'sinais', c_sinais, 'recencia', c_recencia) AS nota_componentes,
  concat_ws(' · ',
    CASE WHEN qtd_licencas IS NOT NULL AND produto IS NOT NULL THEN concat('Pediu ', qtd_licencas, ' licenças do ', produto)
         WHEN qtd_licencas IS NOT NULL THEN concat('Pediu ', qtd_licencas, ' licenças')
         WHEN produto IS NOT NULL THEN concat('Interesse no ', produto) END,
    CASE WHEN prazo IS NOT NULL THEN concat('prazo: ', prazo) END,
    CASE WHEN orcamento_aprovado THEN 'orçamento aprovado' END,
    CASE WHEN concorrente_citado IS NOT NULL THEN concat('usa ', concorrente_citado) END,
    CASE WHEN porte IS NOT NULL THEN concat('empresa ', porte) END,
    CASE WHEN ja_cliente THEN 'já é cliente (cross-sell)' END
  )                                                                                   AS motivo,
  CASE
    WHEN intencao = 'spam'    THEN 'Descartar'
    WHEN intencao = 'suporte' THEN 'Encaminhar ao suporte'
    WHEN intencao = 'compra_imediata' AND orcamento_aprovado THEN 'Ligar hoje e enviar proposta'
    WHEN intencao = 'compra_imediata' THEN 'Ligar hoje e agendar reunião comercial'
    WHEN intencao = 'avaliando' THEN 'Enviar material e oferecer demonstração'
    ELSE 'Revisar manualmente'
  END                                                                                 AS proximo_passo,
  current_timestamp()                                                                 AS processado_em
FROM base;

-- Fila do dia: 20 maiores notas, 5 por vendedor em rodízio (RF-11)
CREATE OR REFRESH MATERIALIZED VIEW call_first_v2.gold.fila_do_dia
COMMENT 'Os 20 leads de maior nota do dia, distribuídos entre os 4 vendedores'
AS
WITH ranqueado AS (
  SELECT
    *,
    row_number() OVER (ORDER BY nota DESC, recebido_em DESC, lead_id) AS posicao
  FROM call_first_v2.gold.leads_classificados
  WHERE intencao IN ('compra_imediata', 'avaliando') AND nota > 0
)
SELECT
  r.data_referencia AS data,
  r.posicao,
  v.vendedor,
  r.* EXCEPT (data_referencia, posicao)
FROM ranqueado r
JOIN call_first_v2.gold.vendedores v ON v.ordem = pmod(r.posicao - 1, 4) + 1
WHERE r.posicao <= 20;

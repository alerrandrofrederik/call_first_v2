-- =====================================================================
-- Call First V2 · Critérios de aceite (PRD 3.1)
-- Rodar no SQL Warehouse depois do pipeline.
-- =====================================================================

-- CA-01: leads_DEMO.csv gera exatamente 300 registros na Bronze
SELECT 'CA-01' AS ca, count(*) AS valor, count(*) = 300 AS ok FROM call_first_v2.bronze.leads;

-- CA-02: as 3 linhas malformadas ficam em _rescued_data
SELECT 'CA-02' AS ca, count(*) AS valor, count(*) = 3 AS ok
FROM call_first_v2.bronze.leads WHERE _rescued_data IS NOT NULL;

-- CA-03: 0 e-mails duplicados na Silver
SELECT 'CA-03' AS ca, count(*) - count(DISTINCT email) AS valor, count(*) = count(DISTINCT email) AS ok
FROM call_first_v2.silver.leads;

-- CA-04: acurácia do ai_classify vs gabarito >= 85%
SELECT 'CA-04' AS ca,
       round(100 * avg(CASE WHEN ia.intencao = g.intencao_esperada THEN 1.0 ELSE 0.0 END), 1) AS valor,
       avg(CASE WHEN ia.intencao = g.intencao_esperada THEN 1.0 ELSE 0.0 END) >= 0.85 AS ok
FROM call_first_v2.silver.leads_ia ia
JOIN read_files('/Volumes/call_first_v2/bronze/gabarito/intencao.csv', format => 'csv', header => true) g
  ON ia.lead_id = g.lead_id;

-- CA-05: pelo menos 4 de 5 pegadinhas corretas
SELECT 'CA-05' AS ca,
       count_if(ia.intencao = g.intencao_esperada) AS valor,
       count_if(ia.intencao = g.intencao_esperada) >= 4 AS ok
FROM call_first_v2.silver.leads_ia ia
JOIN read_files('/Volumes/call_first_v2/bronze/gabarito/intencao.csv', format => 'csv', header => true) g
  ON ia.lead_id = g.lead_id
WHERE g.pegadinha IS NOT NULL;

-- CA-06: mensagem das 200 licenças
SELECT 'CA-06' AS ca,
       concat_ws(' | ', produto, cast(qtd_licencas AS STRING), prazo, cast(orcamento_aprovado AS STRING)) AS valor,
       produto = 'Atlas Gestão' AND qtd_licencas = 200 AND lower(prazo) LIKE '%dezembro%' AND orcamento_aprovado AS ok
FROM call_first_v2.silver.leads_ia WHERE lead_id = 'L20261117-0258';

-- CA-07: nenhum spam ou suporte na fila
SELECT 'CA-07' AS ca, count_if(intencao IN ('spam', 'suporte')) AS valor, count_if(intencao IN ('spam', 'suporte')) = 0 AS ok
FROM call_first_v2.gold.fila_do_dia;

-- CA-08: 20 leads, 5 por vendedor, todos com os 4 componentes
SELECT 'CA-08' AS ca,
       concat(count(*), ' leads / ', count(DISTINCT vendedor), ' vendedores / min ', min(n), ' max ', max(n)) AS valor,
       count(*) = 20 AND min(n) = 5 AND max(n) = 5 AND count_if(nota_componentes IS NULL) = 0 AS ok
FROM (SELECT *, count(*) OVER (PARTITION BY vendedor) AS n FROM call_first_v2.gold.fila_do_dia);

-- CA-11: segunda execução sem arquivo novo não chama a IA (silver.leads_ia continua com 300)
SELECT 'CA-11' AS ca, count(*) AS valor, count(*) = 300 AS ok FROM call_first_v2.silver.leads_ia;

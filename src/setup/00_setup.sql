-- =====================================================================
-- Call First V2 · M0 · Setup (rodar uma vez no SQL Warehouse)
-- Objetos fora do pipeline: funções de CNPJ, volume do gabarito,
-- vendedores e tabela de feedback do app.
-- =====================================================================

-- 1. Dígito verificador de CNPJ (pesos 2..9 da direita para a esquerda)
CREATE OR REPLACE FUNCTION call_first_v2.silver.cnpj_dv(base STRING)
RETURNS INT
COMMENT 'Calcula um dígito verificador de CNPJ para a base informada (12 ou 13 dígitos)'
RETURN
  CASE
    WHEN pmod(aggregate(sequence(1, length(base)), 0,
           (acc, i) -> acc + cast(substr(base, i, 1) AS INT) * (2 + pmod(length(base) - i, 8))), 11) < 2
    THEN 0
    ELSE 11 - pmod(aggregate(sequence(1, length(base)), 0,
           (acc, i) -> acc + cast(substr(base, i, 1) AS INT) * (2 + pmod(length(base) - i, 8))), 11)
  END;

-- 2. CNPJ válido: 14 dígitos, não repetidos e com os 2 dígitos verificadores corretos
CREATE OR REPLACE FUNCTION call_first_v2.silver.cnpj_valido(cnpj STRING)
RETURNS BOOLEAN
COMMENT 'TRUE quando o CNPJ (só dígitos) tem 14 dígitos e dígitos verificadores válidos'
RETURN
  cnpj IS NOT NULL
  AND cnpj RLIKE '^[0-9]{14}$'
  AND NOT cnpj RLIKE '^([0-9])\\1{13}$'
  AND call_first_v2.silver.cnpj_dv(substr(cnpj, 1, 12)) = cast(substr(cnpj, 13, 1) AS INT)
  AND call_first_v2.silver.cnpj_dv(substr(cnpj, 1, 13)) = cast(substr(cnpj, 14, 1) AS INT);

-- 3. Volume do gabarito (fora do raw, não é lido pelo Auto Loader)
CREATE VOLUME IF NOT EXISTS call_first_v2.bronze.gabarito
COMMENT 'Gabarito de intenção e entidades para validar as AI Functions (CA-04 a CA-06)';

-- 4. Vendedores (4 × 5 leads por dia)
CREATE TABLE IF NOT EXISTS call_first_v2.gold.vendedores (
  ordem    INT    COMMENT 'Ordem no rodízio da fila (1 a 4)',
  vendedor STRING COMMENT 'Nome do vendedor'
) COMMENT 'Time comercial: usado para distribuir a fila do dia';

INSERT OVERWRITE call_first_v2.gold.vendedores VALUES
  (1, 'Ana Ribeiro'),
  (2, 'Bruno Carvalho'),
  (3, 'Camila Duarte'),
  (4, 'Diego Martins');

-- 5. Feedback do app ("Marcar como contatado")
CREATE TABLE IF NOT EXISTS call_first_v2.gold.feedback_contatos (
  lead_id      STRING    COMMENT 'Lead contatado',
  vendedor     STRING    COMMENT 'Vendedor que fez o contato',
  contatado_em TIMESTAMP COMMENT 'Momento em que o lead foi marcado como contatado',
  resultado    STRING    COMMENT 'Resultado do contato (opcional)'
) COMMENT 'Feedback gravado pelo Data App (RF-14)';

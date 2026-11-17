-- =====================================================================
-- Call First V2 · Bronze (RF-01, RF-02)
-- Auto Loader: cada arquivo do Volume raw é lido uma única vez.
-- As 3 fontes ficam na mesma pasta e são separadas pelo nome do arquivo.
-- Linhas malformadas vão para _rescued_data sem parar o pipeline.
-- =====================================================================

CREATE OR REFRESH STREAMING TABLE call_first_v2.bronze.leads
COMMENT 'Leads como vieram do formulário/LinkedIn/eventos (leads_*.csv)'
AS SELECT
  *,
  _metadata.file_path  AS _arquivo,
  current_timestamp()  AS _ingerido_em
FROM STREAM read_files(
  '${raw_volume_path}',
  format          => 'csv',
  header          => true,
  fileNamePattern => 'leads_*.csv',
  schemaHints     => 'lead_id STRING, telefone STRING, cnpj STRING, mensagem STRING, recebido_em TIMESTAMP'
);

CREATE OR REFRESH STREAMING TABLE call_first_v2.bronze.empresas
COMMENT 'Base cadastral de empresas (empresas_*.csv)'
AS SELECT
  *,
  _metadata.file_path  AS _arquivo,
  current_timestamp()  AS _ingerido_em
FROM STREAM read_files(
  '${raw_volume_path}',
  format          => 'csv',
  header          => true,
  fileNamePattern => 'empresas_*.csv',
  schemaHints     => 'cnpj STRING'
);

CREATE OR REFRESH STREAMING TABLE call_first_v2.bronze.oportunidades
COMMENT 'Histórico de oportunidades exportado do CRM (oportunidades_*.csv)'
AS SELECT
  *,
  _metadata.file_path  AS _arquivo,
  current_timestamp()  AS _ingerido_em
FROM STREAM read_files(
  '${raw_volume_path}',
  format          => 'csv',
  header          => true,
  fileNamePattern => 'oportunidades_*.csv',
  schemaHints     => 'oportunidade_id STRING, cnpj STRING, valor DOUBLE, data DATE'
);

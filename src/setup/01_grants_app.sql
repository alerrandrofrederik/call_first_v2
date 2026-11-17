-- =====================================================================
-- Call First V2 · Permissões do service principal do Data App (call-first)
-- Leitura das camadas + gabarito; escrita só na tabela de feedback.
-- Troque o client id se o app for recriado:
--   databricks apps get call-first --profile pessoal | grep service_principal_client_id
-- =====================================================================
GRANT USE CATALOG ON CATALOG call_first_v2 TO `db568679-de77-4a13-b191-bb49bb0bd51c`;
GRANT USE SCHEMA, SELECT ON SCHEMA call_first_v2.bronze TO `db568679-de77-4a13-b191-bb49bb0bd51c`;
GRANT USE SCHEMA, SELECT ON SCHEMA call_first_v2.silver TO `db568679-de77-4a13-b191-bb49bb0bd51c`;
GRANT USE SCHEMA, SELECT ON SCHEMA call_first_v2.gold   TO `db568679-de77-4a13-b191-bb49bb0bd51c`;
GRANT READ VOLUME ON VOLUME call_first_v2.bronze.gabarito TO `db568679-de77-4a13-b191-bb49bb0bd51c`;
GRANT MODIFY ON TABLE call_first_v2.gold.feedback_contatos TO `db568679-de77-4a13-b191-bb49bb0bd51c`;

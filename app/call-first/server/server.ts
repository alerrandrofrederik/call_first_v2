import {
  analytics,
  createApp,
  createWorkspaceClient,
  genie,
  getWarehouseId,
  server,
} from '@databricks/appkit';

const FEEDBACK_TABLE = 'call_first_v2.gold.feedback_contatos';

const appkit = await createApp({
  plugins: [server(), analytics({}), genie()],
  onPluginsReady(kit) {
    kit.server.extend((app) => {
      // RF-14: "Marcar como contatado" grava uma linha na tabela de feedback (Delta)
      // (o server plugin já aplica express.json globalmente)
      app.post('/api/feedback', async (req, res) => {
        const body: unknown = req.body;
        const leadId =
          typeof body === 'object' && body !== null && 'lead_id' in body ? String(body.lead_id) : '';
        const vendedor =
          typeof body === 'object' && body !== null && 'vendedor' in body ? String(body.vendedor) : '';

        if (!/^L\d{8}-\d{4}$/.test(leadId) || vendedor.length === 0 || vendedor.length > 100) {
          res.status(400).json({ error: 'lead_id ou vendedor inválido' });
          return;
        }

        try {
          const client = createWorkspaceClient();
          const warehouseId = await getWarehouseId();
          const result = await client.statementExecution.executeStatement({
            warehouse_id: warehouseId,
            statement: `INSERT INTO ${FEEDBACK_TABLE} (lead_id, vendedor, contatado_em, resultado)
                        VALUES (:lead_id, :vendedor, current_timestamp(), 'contatado')`,
            parameters: [
              { name: 'lead_id', value: leadId, type: 'STRING' },
              { name: 'vendedor', value: vendedor, type: 'STRING' },
            ],
            wait_timeout: '30s',
          });
          const state = result.status?.state;
          if (state !== 'SUCCEEDED') {
            res.status(502).json({ error: `Falha ao gravar feedback (${state ?? 'desconhecido'})` });
            return;
          }
          res.json({ ok: true });
        } catch (err) {
          console.error('feedback error', err);
          res.status(500).json({ error: 'Erro ao gravar feedback' });
        }
      });
    });
  },
});

void appkit;

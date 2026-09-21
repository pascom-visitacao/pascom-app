-- Novo valor de status do pedido: "concluido" (o card do painel passa a
-- ler external_requests.status como fonte única). Precisa de migration
-- própria porque um valor novo de enum não pode ser usado na mesma
-- transação em que é criado (o trigger/backfill vêm na migration seguinte).
alter type request_status add value if not exists 'concluido';

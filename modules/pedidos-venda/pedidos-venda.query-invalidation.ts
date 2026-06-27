import type { QueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: QueryClient, queryKey: readonly unknown[]) => {
  void queryClient.invalidateQueries({ queryKey });
};

export const pedidosVendaQueryKeys = {
  list: ['pedidos_venda_list'] as const,
  stats: ['pedidos_venda_stats'] as const,
  draftCount: ['pedidos_venda_draft_count'] as const,
  details: (id?: string) => ['pedido_venda_detalhes', id] as const,
  estoqueList: ['estoque_list'] as const,
  estoqueStats: ['estoque_stats'] as const,
  contasReceber: ['contas-receber'] as const,
};

export const invalidatePedidosVendaOverview = (queryClient: QueryClient) => {
  invalidate(queryClient, pedidosVendaQueryKeys.list);
  invalidate(queryClient, pedidosVendaQueryKeys.stats);
  invalidate(queryClient, pedidosVendaQueryKeys.draftCount);
};

export const invalidatePedidoVendaDetails = (queryClient: QueryClient, id?: string) => {
  if (id) invalidate(queryClient, pedidosVendaQueryKeys.details(id));
};

export const invalidatePedidosVendaStock = (queryClient: QueryClient) => {
  invalidate(queryClient, pedidosVendaQueryKeys.estoqueList);
  invalidate(queryClient, pedidosVendaQueryKeys.estoqueStats);
};

export const invalidatePedidoVendaFinancial = (queryClient: QueryClient) => {
  invalidate(queryClient, pedidosVendaQueryKeys.contasReceber);
};

export const invalidatePedidoVendaFullChange = (queryClient: QueryClient, id?: string) => {
  invalidatePedidoVendaDetails(queryClient, id);
  invalidatePedidosVendaOverview(queryClient);
  invalidatePedidosVendaStock(queryClient);
  invalidatePedidoVendaFinancial(queryClient);
};

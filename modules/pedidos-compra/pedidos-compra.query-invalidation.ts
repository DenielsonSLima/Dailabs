import type { QueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: QueryClient, queryKey: readonly unknown[]) => {
  void queryClient.invalidateQueries({ queryKey });
};

export const pedidosCompraQueryKeys = {
  list: ['pedidos_compra_list'] as const,
  stats: ['pedidos_compra_stats'] as const,
  draftCount: ['pedidos_compra_draft_count'] as const,
  details: (id?: string) => ['pedido_compra_detalhes', id] as const,
  estoqueList: ['estoque_list'] as const,
  estoqueStats: ['estoque_stats'] as const,
  contasPagar: ['contas-pagar'] as const,
};

export const invalidatePedidosCompraOverview = (queryClient: QueryClient) => {
  invalidate(queryClient, pedidosCompraQueryKeys.list);
  invalidate(queryClient, pedidosCompraQueryKeys.stats);
  invalidate(queryClient, pedidosCompraQueryKeys.draftCount);
};

export const invalidatePedidoCompraDetails = (queryClient: QueryClient, id?: string) => {
  if (id) invalidate(queryClient, pedidosCompraQueryKeys.details(id));
};

export const invalidatePedidosCompraStock = (queryClient: QueryClient) => {
  invalidate(queryClient, pedidosCompraQueryKeys.estoqueList);
  invalidate(queryClient, pedidosCompraQueryKeys.estoqueStats);
};

export const invalidatePedidoCompraFinancial = (queryClient: QueryClient) => {
  invalidate(queryClient, pedidosCompraQueryKeys.contasPagar);
};

export const invalidatePedidoCompraFullChange = (queryClient: QueryClient, id?: string) => {
  invalidatePedidoCompraDetails(queryClient, id);
  invalidatePedidosCompraOverview(queryClient);
  invalidatePedidosCompraStock(queryClient);
  invalidatePedidoCompraFinancial(queryClient);
};

import type { QueryClient } from '@tanstack/react-query';

const invalidate = (queryClient: QueryClient, queryKey: readonly unknown[]) => {
  void queryClient.invalidateQueries({ queryKey });
};

export const marketingQueryKeys = {
  campanhas: ['mkt_campanhas'] as const,
  integracoes: ['mkt_integracoes'] as const,
  templates: ['mkt_templates'] as const,
};

export const invalidateMarketingCampanhas = (queryClient: QueryClient) => {
  invalidate(queryClient, marketingQueryKeys.campanhas);
};

export const invalidateMarketingIntegracoes = (queryClient: QueryClient) => {
  invalidate(queryClient, marketingQueryKeys.integracoes);
};

export const invalidateMarketingTemplates = (queryClient: QueryClient) => {
  invalidate(queryClient, marketingQueryKeys.templates);
};

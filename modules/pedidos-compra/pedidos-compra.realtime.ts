import { supabase } from '../../lib/supabase';

const TABLE = 'cmp_pedidos';
const PAYMENTS_TABLE = 'cmp_pedidos_pagamentos';

export const PedidosCompraRealtime = {
  subscribe(onUpdate: (payload: any) => void) {
    const channel = supabase
      .channel('nexus:cmp_pedidos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        console.debug('[Realtime] Mudança detectada em pedidos:', payload.eventType);
        onUpdate(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: PAYMENTS_TABLE }, (payload) => {
        console.debug('[Realtime] Mudança detectada em pagamentos:', payload.eventType);
        onUpdate(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[Realtime] Inscrito com sucesso nos canais de pedidos de compra');
        }
      });

    return channel;
  }
};

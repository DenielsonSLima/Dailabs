import { supabase } from '../../lib/supabase';

const TABLE = 'venda_pedidos';
const PAYMENTS_TABLE = 'venda_pedidos_pagamentos';

export const PedidosVendaRealtime = {
  subscribe(onUpdate: () => void) {
    return supabase
      .channel('venda_pedidos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: PAYMENTS_TABLE }, () => {
        onUpdate();
      })
      .subscribe();
  }
};


import { supabase } from '../../lib/supabase';
import {
  IPedidoCompra,
  IPedidoFiltros,
  IPedidoPagamento,
  IPedidoCompraResponse,
  PedidoCompraSchema,
  PedidoPagamentoSchema
} from './pedidos-compra.types';

const TABLE = 'cmp_pedidos';

export const PedidosCompraService = {
  async getAll(filtros: IPedidoFiltros, aba: string): Promise<IPedidoCompraResponse> {
    const page = filtros.page || 1;
    const limit = filtros.limit || 9;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const baseSelect = `
        *,
        fornecedor:parceiros(nome, documento, cidade, uf),
        corretor:cad_corretores(nome, sobrenome),
        forma_pagamento:cad_formas_pagamento(id, nome),
        veiculos:est_veiculos!est_veiculos_pedido_id_fkey(
          id,
          status,
          valor_custo,
          valor_custo_servicos,
          placa,
          fotos,
          socios,
          montadora:cad_montadoras(nome, logo_url),
          modelo:cad_modelos(nome),
          versao:cad_versoes(nome)
        )
      `;

    const selectStr = aba === 'EFETIVADOS'
      ? `${baseSelect}, filter_v:est_veiculos!est_veiculos_pedido_id_fkey!inner(status)`
      : baseSelect;

    let query = supabase
      .from(TABLE)
      .select(selectStr, { count: 'exact' });

    if (aba === 'RASCUNHO') query = query.eq('status', 'RASCUNHO');
    if (aba === 'EFETIVADOS') {
      query = query.eq('status', 'CONCLUIDO').neq('filter_v.status', 'VENDIDO');
    }

    if (filtros.dataInicio) query = query.gte('data_compra', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_compra', `${filtros.dataFim}T23:59:59`);
    if (filtros.corretorId) query = query.eq('corretor_id', filtros.corretorId);
    if (filtros.busca) query = query.ilike('numero_pedido', `%${filtros.busca}%`);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const resultado = (data || []) as unknown as IPedidoCompra[];
    const totalCount = count || 0;

    return {
      data: resultado,
      count: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    };
  },

  async getDashboardStats(filtros: IPedidoFiltros, aba: string): Promise<IPedidoCompra[]> {
    const baseSelect = `
        id,
        valor_negociado,
        status,
        forma_pagamento:cad_formas_pagamento(id, nome),
        veiculos:est_veiculos!est_veiculos_pedido_id_fkey(valor_custo, valor_custo_servicos, status)
      `;

    const selectStr = aba === 'EFETIVADOS'
      ? `${baseSelect}, filter_v:est_veiculos!est_veiculos_pedido_id_fkey!inner(status)`
      : baseSelect;

    let query = supabase
      .from(TABLE)
      .select(selectStr);

    if (aba === 'RASCUNHO') query = query.eq('status', 'RASCUNHO');
    if (aba === 'EFETIVADOS') {
      query = query.eq('status', 'CONCLUIDO').neq('filter_v.status', 'VENDIDO');
    }

    if (filtros.dataInicio) query = query.gte('data_compra', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_compra', `${filtros.dataFim}T23:59:59`);
    if (filtros.corretorId) query = query.eq('corretor_id', filtros.corretorId);
    if (filtros.busca) query = query.ilike('numero_pedido', `%${filtros.busca}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as IPedidoCompra[];
  },

  async getById(id: string): Promise<IPedidoCompra> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        fornecedor:parceiros!fornecedor_id(*),
        veiculos:est_veiculos!pedido_id(
          *,
          montadora:cad_montadoras(*),
          modelo:cad_modelos(*),
          versao:cad_versoes(*)
        ),
        forma_pagamento:cad_formas_pagamento!forma_pagamento_id(id, nome),
        pagamentos:cmp_pedidos_pagamentos!pedido_id(
          *,
          forma_pagamento:cad_formas_pagamento(*),
          conta_bancaria:fin_contas_bancarias(*)
        ),
        corretor:cad_corretores!corretor_id(*),
        titulos:fin_titulos!pedido_id(
          *,
          categoria:fin_categorias(*),
          transacoes:fin_transacoes!titulo_id(
            *,
            conta:fin_contas_bancarias!conta_origem_id(*),
            forma:cad_formas_pagamento!forma_pagamento_id(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as IPedidoCompra;
  },

  async save(payload: Partial<IPedidoCompra>): Promise<IPedidoCompra> {
    const { pagamentos = [], ...pedido } = payload as any;

    // Validate: use partial for updates, full for inserts
    const schema = pedido.id ? PedidoCompraSchema.partial() : PedidoCompraSchema;
    let validatedPedido = schema.parse(pedido);

    let pedidoId = pedido.id;

    if (pedidoId) {
      // Filter out keys that were not in the original payload to prevent Zod defaults from leaking in
      const payloadKeys = Object.keys(pedido);
      const dataToUpdate = Object.fromEntries(
        Object.entries(validatedPedido).filter(([key]) => payloadKeys.includes(key))
      );

      const { error } = await supabase
        .from(TABLE)
        .update(dataToUpdate)
        .eq('id', pedidoId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(validatedPedido)
        .select()
        .single();
      if (error) throw error;
      pedidoId = data.id;
    }

    if (pagamentos.length > 0) {
      const validatedPagamentos = pagamentos.map((p: any) =>
        PedidoPagamentoSchema.parse({ ...p, pedido_id: pedidoId })
      );

      const { error: pError } = await supabase
        .from('cmp_pedidos_pagamentos')
        .upsert(validatedPagamentos);
      if (pError) throw pError;
    }

    return this.getById(pedidoId);
  },

  async savePayment(payment: Partial<IPedidoPagamento>): Promise<void> {
    const validated = PedidoPagamentoSchema.parse(payment);
    const { error } = await supabase
      .from('cmp_pedidos_pagamentos')
      .upsert(validated);
    if (error) throw error;
  },

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('cmp_pedidos_pagamentos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async confirmOrder(payload: any): Promise<any[]> {
    const { data, error } = await supabase.rpc('confirmar_pedido_compra', {
      p_pedido_id: payload.pedido?.id || payload.id || payload
    });
    if (error) throw error;
    return data || [];
  },

  async reopenOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ status: 'RASCUNHO' })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('excluir_pedido_compra', { p_pedido_id: id });
    if (error) throw error;
  },

  async getDraftCount(): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'RASCUNHO');

    if (error) throw error;
    return count || 0;
  },

  async unlinkVehicle(vehicleId: string): Promise<void> {
    const { error } = await supabase
      .from('est_veiculos')
      .update({ pedido_id: null })
      .eq('id', vehicleId);
    if (error) throw error;
  }
};

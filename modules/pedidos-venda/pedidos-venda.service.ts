
import { supabase } from '../../lib/supabase';
import {
  IPedidoVenda,
  IVendaFiltros,
  IVendaPagamento,
  VendaTab,
  IPedidoVendaResponse,
  PedidoVendaSchema,
  VendaPagamentoSchema
} from './pedidos-venda.types';
import { FinanceiroService } from '../financeiro/financeiro.service';

const TABLE = 'venda_pedidos';
const PAYMENTS_TABLE = 'venda_pedidos_pagamentos';

export const PedidosVendaService = {
  async getAll(filtros: IVendaFiltros, tab: VendaTab): Promise<IPedidoVendaResponse> {
    const page = filtros.page || 1;
    const limit = filtros.limit || 9;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(TABLE)
      .select(`
        *,
        cliente:parceiros(nome, documento, cidade, uf),
        veiculo:est_veiculos(
          id,
          valor_custo,
          valor_custo_servicos,
          valor_venda,
          placa,
          fotos,
          socios,
          motorizacao,
          combustivel,
          transmissao,
          ano_fabricacao,
          ano_modelo,
          chassi,
          km,
          montadora:cad_montadoras(nome, logo_url),
          modelo:cad_modelos(nome),
          versao:cad_versoes(nome, motorizacao, combustivel, transmissao, ano_fabricacao, ano_modelo),
          tipo_veiculo:cad_tipos_veiculos(nome)
        )
      `, { count: 'exact' });

    // Filtros por Aba
    if (tab === 'RASCUNHO') {
      query = query.eq('status', 'RASCUNHO');
    } else if (tab === 'MES_ATUAL') {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.eq('status', 'CONCLUIDO').gte('data_venda', first);
    }

    // Filtros Avançados
    if (filtros.busca) query = query.ilike('numero_venda', `%${filtros.busca}%`);
    if (filtros.dataInicio) query = query.gte('data_venda', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_venda', `${filtros.dataFim}T23:59:59`);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.corretorId) query = query.eq('corretor_id', filtros.corretorId);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []) as IPedidoVenda[],
      count: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  async getDashboardStats(filtros: IVendaFiltros, tab: VendaTab): Promise<IPedidoVenda[]> {
    let query = supabase
      .from(TABLE)
      .select(`
        id,
        valor_venda,
        status,
        veiculo:est_veiculos(valor_custo, valor_custo_servicos, valor_venda, socios)
      `);

    if (tab === 'RASCUNHO') {
      query = query.eq('status', 'RASCUNHO');
    } else if (tab === 'MES_ATUAL') {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.eq('status', 'CONCLUIDO').gte('data_venda', first);
    }

    if (filtros.busca) query = query.ilike('numero_venda', `%${filtros.busca}%`);
    if (filtros.dataInicio) query = query.gte('data_venda', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_venda', `${filtros.dataFim}T23:59:59`);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.corretorId) query = query.eq('corretor_id', filtros.corretorId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as IPedidoVenda[];
  },

  async getById(id: string): Promise<IPedidoVenda> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        cliente:parceiros(*),
        forma_pagamento:cad_formas_pagamento(*),
        veiculo:est_veiculos(
          *,
          montadora:cad_montadoras(*),
          modelo:cad_modelos(*),
          versao:cad_versoes(*),
          tipo_veiculo:cad_tipos_veiculos(*)
        ),
        pagamentos:venda_pedidos_pagamentos(
          *,
          forma_pagamento:cad_formas_pagamento(*),
          conta_bancaria:fin_contas_bancarias(banco_nome, conta, agencia, titular)
        ),
        corretor:cad_corretores(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as IPedidoVenda;
  },

  async save(payload: Partial<IPedidoVenda>): Promise<IPedidoVenda> {
    const { pagamentos = [], ...pedido } = payload as any;

    // Validate with Zod
    // Se tiver ID, permite atualização parcial. Se não, exige campos obrigatórios.
    // Validate: use partial for updates, full for inserts
    const schema = pedido.id ? PedidoVendaSchema.partial() : PedidoVendaSchema;
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
        VendaPagamentoSchema.parse({ ...p, pedido_id: pedidoId })
      );

      const { error: pError } = await supabase
        .from(PAYMENTS_TABLE)
        .upsert(validatedPagamentos);
      if (pError) throw pError;
    }

    return this.getById(pedidoId);
  },

  async savePayment(payment: Partial<IVendaPagamento>): Promise<void> {
    const validated = payment.id
      ? VendaPagamentoSchema.partial().parse(payment)
      : VendaPagamentoSchema.parse(payment);
    const { error } = await supabase
      .from(PAYMENTS_TABLE)
      .upsert(validated);
    if (error) throw error;
  },

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from(PAYMENTS_TABLE)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async confirmSale(payload: { pedido: IPedidoVenda, condicao?: any, contaBancariaId?: string }): Promise<void> {
    const { error } = await supabase.rpc('confirmar_venda_pedido', {
      p_pedido_id: payload.pedido.id,
      p_conta_id: payload.contaBancariaId || null
    });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('excluir_pedido_venda', { p_venda_id: id });
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

  async getConsignacaoFormaPagamento(): Promise<string | null> {
    const { data, error } = await supabase
      .from('cad_formas_pagamento')
      .select('id')
      .ilike('nome', '%consignação%')
      .maybeSingle();

    if (error) return null;
    return data?.id || null;
  },

  async getTitulosByPedidoId(pedidoId: string): Promise<any[]> {
    // Delega ao FinanceiroService com tipo VENDA para usar coluna venda_pedido_id
    return FinanceiroService.getTitulosByPedidoId(pedidoId, 'VENDA');
  }
};

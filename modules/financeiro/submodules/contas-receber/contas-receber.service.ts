import { supabase } from '../../../../lib/supabase';
import { ReceberTab, IReceberFiltros, IReceberResponse, ReceberResponseSchema } from './contas-receber.types';

const TABLE = 'fin_titulos';

export const ContasReceberService = {
  async getAll(tab: ReceberTab, filtros: IReceberFiltros): Promise<IReceberResponse> {
    const page = filtros.page || 1;
    const limit = filtros.limit || 9;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(TABLE)
      .select(`
        *,
        parceiro:parceiros(nome, documento),
        categoria:fin_categorias(nome),
        veiculo:est_veiculos(
          placa,
          modelo:cad_modelos(nome),
          montadora:cad_montadoras(nome)
        ),
        transacoes:fin_transacoes(
          id,
          valor,
          tipo,
          tipo_transacao,
          conta_origem_id,
          data_pagamento,
          conta:fin_contas_bancarias(titular, conta, agencia, banco_nome)
        )
      `, { count: 'exact' })
      .eq('tipo', 'RECEBER')
      .neq('status', 'CANCELADO')
      .or('categoria_id.not.is.null,pedido_id.not.is.null,venda_pedido_id.not.is.null');

    const hoje = new Date().toISOString().split('T')[0];

    if (tab === 'EM_ABERTO') {
      query = query.neq('status', 'PAGO');
    } else if (tab === 'PAGOS') {
      query = query.eq('status', 'PAGO');
    }
    // Para 'TODOS', não adicionamos filtro de status (já removemos CANCELADO acima)

    if (filtros.busca) {
      query = query.or(`descricao.ilike.%${filtros.busca}%, documento_ref.ilike.%${filtros.busca}%`);
    }
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.dataInicio) query = query.gte('data_vencimento', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_vencimento', filtros.dataFim);

    const { data, error, count } = await query
      .order('data_vencimento', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);

    const rawResponse = {
      data: data || [],
      count: count || 0,
      currentPage: page,
      totalPages
    };

    return ReceberResponseSchema.parse(rawResponse) as IReceberResponse;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('excluir_titulo', { p_id: id });
    if (error) {
      console.error('Erro ao excluir título via RPC:', error);
      throw error;
    }
  },

  async getKpis() {
    const { data, error } = await supabase.rpc('rpc_kpi_contas_receber');

    if (error) {
      console.error('Erro ao buscar KPIs de contas a receber:', error);
      throw error;
    }

    return data;
  },

  subscribe(onUpdate: () => void) {
    return supabase
      .channel('fin_contas_receber_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => onUpdate())
      .subscribe();
  }
};

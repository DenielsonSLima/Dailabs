import { supabase } from '../../../../lib/supabase';
import { ITituloVariavel, VariaveisTab, IVariaveisFiltros } from './despesas-variaveis.types';
import { FinanceiroService } from '../../financeiro.service';
import { ILancarDespesaPayload } from '../../financeiro.types';

const TABLE = 'fin_titulos';

export const DespesasVariaveisService = {
  async getAll(tab: VariaveisTab, filtros: IVariaveisFiltros): Promise<ITituloVariavel[]> {
    let query = supabase
      .from(TABLE)
      .select(`
        *,
        parceiro:parceiros(nome),
        categoria:fin_categorias(id, nome)
      `)
      .eq('tipo', 'PAGAR')
      .eq('origem_tipo', 'DESPESA_VARIAVEL')
      .neq('status', 'CANCELADO');

    const getLocalDateStrings = () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = d.getMonth();
      const mesInicio = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(y, m + 1, 0).getDate();
      const mesFim = `${y}-${String(m + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      const proximoY = m === 11 ? y + 1 : y;
      const proximoM = m === 11 ? 0 : m + 1;
      const proximoMesInicio = `${proximoY}-${String(proximoM + 1).padStart(2, '0')}-01`;
      return { mesInicio, mesFim, proximoMesInicio };
    };

    if (tab === 'MES_ATUAL') {
      const { mesInicio, mesFim } = getLocalDateStrings();
      query = query.gte('data_vencimento', mesInicio).lte('data_vencimento', mesFim);
    } else if (tab === 'FUTUROS') {
      const { proximoMesInicio } = getLocalDateStrings();
      query = query.gte('data_vencimento', proximoMesInicio);
    } else if (tab === 'PAGO') {
      query = query.eq('status', 'PAGO');
    } else if (tab === 'PENDENTES') {
      query = query.neq('status', 'PAGO');
    }

    if (filtros.busca) {
      query = query.or(`descricao.ilike.%${filtros.busca}%, documento_ref.ilike.%${filtros.busca}%`);
    }
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.dataInicio) query = query.gte('data_vencimento', filtros.dataInicio);
    if (filtros.dataFim) query = query.lte('data_vencimento', filtros.dataFim);

    const { data, error } = await query.order('data_vencimento', { ascending: true });

    if (error) throw error;
    return data as any as ITituloVariavel[];
  },

  async save(payload: {
    descricao: string;
    valor_total: number;
    categoria_id: string;
    qtd_parcelas: number;
    data_vencimento: string;
    dias_intervalo: number;
    pago_avista: boolean;
    conta_id?: string;
    forma_pagamento_id?: string;
    documento_ref?: string;
  }): Promise<void> {
    await FinanceiroService.lancarDespesa({
      ...payload,
      natureza: 'VARIAVEL'
    });
  },

  async update(id: string, payload: {
    descricao: string;
    valor_total: number;
    categoria_id: string;
    data_vencimento: string;
    grupo_id?: string;
    documento_ref?: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('atualizar_titulo', {
      p_id: id,
      p_descricao: payload.descricao,
      p_valor_total: payload.valor_total,
      p_categoria_id: payload.categoria_id,
      p_data_vencimento: payload.data_vencimento,
      p_documento_ref: payload.documento_ref || null
    });
    if (error) {
      console.error('Erro ao atualizar título via RPC:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('excluir_titulo', { p_id: id });
    if (error) {
      console.error('Erro ao excluir título via RPC:', error);
      throw error;
    }
  },

  async getKpis(tab: VariaveisTab, filtros: IVariaveisFiltros) {
    const { data, error } = await supabase.rpc('get_despesas_variaveis_kpis', {
      p_tab: tab,
      p_busca: filtros.busca || null,
      p_categoria_id: filtros.categoriaId || null,
      p_data_inicio: filtros.dataInicio || null,
      p_data_fim: filtros.dataFim || null,
      p_hoje: new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.error('Erro ao buscar KPIs de despesas variáveis:', error);
      throw error;
    }

    return data;
  },

  subscribe(onUpdate: () => void) {
    return supabase
      .channel('fin_despesas_variaveis_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => onUpdate())
      .subscribe();
  }
};

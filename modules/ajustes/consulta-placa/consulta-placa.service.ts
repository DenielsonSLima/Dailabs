import { supabase } from '../../../lib/supabase';

export interface VeiculoConsultaReponse {
  user: {
    first_name: string;
    email: string;
    cellphone: string;
    notification: string;
  };
  balance: string;
  error: boolean;
  message: string;
  tax: string;
  valor_consulta: number;
  api_limit_for: string;
  homolog: boolean;
  data: {
    resultados: {
      anoFabricacao: number;
      anoModelo: string;
      categoria: string;
      chassi: string;
      codigoFipe: string;
      combustivel: string;
      cor: string;
      extra: any;
      historico: {
        mes: string;
        valor: number;
      }[];
      marca: string;
      mesReferencia: string;
      modelo: string;
      principal: boolean;
      url: string;
      valor: number;
    }[];
    data?: {
      anoFabricacao: number;
      anoModelo: string;
      categoria: string;
      chassi?: string;
      codigoFipe: string;
      combustivel: string;
      cor?: string;
      extra: any;
      historico: {
        mes: string;
        valor: number;
      }[];
      marca: string;
      mesReferencia: string;
      modelo: string;
      principal: boolean;
      url: string;
      valor: number;
    }[];
    veiculo?: {
      chassi?: string;
      combustivel?: string;
      cor?: string;
      tipo_veiculo?: string;
      uf?: string;
      municipio?: string;
    };
  };
}

export interface FipeUsageStats {
  used: number;
  limit: number;
  remaining: number;
}

export const consultaPlacaService = {
  /**
   * Obtém as estatísticas de uso da organização atual
   */
  async fetchUsageStats(): Promise<FipeUsageStats> {
    const { data, error } = await supabase.rpc('rpc_get_fipe_usage_stats');
    if (error) {
      console.error('Erro ao buscar estatísticas de Fipe:', error);
      return { used: 0, limit: 100, remaining: 100 };
    }
    return data as FipeUsageStats;
  },

  async consultar(placa: string): Promise<VeiculoConsultaReponse> {
    const limpaPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    try {
      // Chamada para a Edge Function no Supabase
      // A função cuida do Cache e do Registro de Uso automaticamente
      const { data, error } = await supabase.functions.invoke('consulta-veiculo', {
        body: { placa: limpaPlaca }
      });

      if (error) {
        console.error('Erro ao invocar função consulta-veiculo:', error);
        
        // Se for um erro da Edge Function, tentamos extrair a mensagem do corpo da resposta
        // Em versões recentes do @supabase/supabase-js, o erro pode vir com o corpo parseado
        // ou precisamos checar o context.
        let errorMessage = error.message;

        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            if (body && body.message) errorMessage = body.message;
          } catch (e) {
            console.error('Erro ao parsear corpo do erro:', e);
          }
        }

        // Mapeamento de erros amigáveis baseados na mensagem final
        if (errorMessage.includes('LIMITE_MENSAL_ATINGIDO')) {
          throw new Error('Você atingiu o limite de 100 consultas mensais da sua loja.');
        }
        if (errorMessage.includes('SALDO_SISTEMA_INSUFICIENTE')) {
          throw new Error('O sistema está em manutenção de saldo. Tente novamente mais tarde.');
        }
        
        throw new Error(errorMessage || 'Falha ao consultar a placa.');
      }

      // Se a função retornou erro no corpo
      if (data.error) {
        throw new Error(data.message || 'Erro na consulta do veículo');
      }

      return data as VeiculoConsultaReponse;
    } catch (error: any) {
      console.error('Erro no consultaPlacaService:', error);
      throw error;
    }
  }
};

import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE';
export type CampanhaStatus = 'RASCUNHO' | 'ATIVO' | 'PAUSADO' | 'ENCERRADO';
export type IntegracaoStatus = 'CONECTADO' | 'DESCONECTADO' | 'ERRO';

export interface IMktTemplate {
  id: string;
  organization_id: string | null;
  nome: string;
  descricao: string | null;
  platform: Platform;
  objetivo: string;
  orcamento_diario: number;
  duracao_dias: number;
  regiao_config: RegiaoConfig;
  publico_config: Record<string, unknown>;
  is_padrao: boolean;
  ativo: boolean;
  created_at: string;
}

export interface RegiaoConfig {
  tipo: 'RAIO' | 'ESTADO' | 'CIDADE' | 'NACIONAL' | 'PERSONALIZADO';
  raio_km?: number;
  estado?: string;
  cidades?: string[];
}

export interface IMktCampanha {
  id: string;
  organization_id: string;
  veiculo_id: string | null;
  nome: string;
  platform: Platform;
  template_id: string | null;
  objetivo: string | null;
  orcamento_diario: number | null;
  regiao_config: RegiaoConfig | null;
  status: CampanhaStatus;
  data_inicio: string | null;
  data_fim: string | null;
  url_externa: string | null;
  metricas: Record<string, unknown> | null;
  observacoes: string | null;
  creative_url: string | null;
  created_at: string;
  veiculo?: {
    id: string;
    modelo?: { nome: string } | null;
    montadora?: { nome: string } | null;
    ano_modelo: number | null;
    valor_venda: number | null;
    fotos?: { url: string }[];
  } | null;
}

export interface IMktIntegracao {
  id: string;
  organization_id: string;
  platform: Platform;
  account_name: string | null;
  ad_account_id: string | null;
  business_manager_id: string | null;
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  access_token: string | null;
  token_expires_at: string | null;
  saldo_disponivel: number | null;
  moeda: string;
  status: IntegracaoStatus;
  created_at: string;
  updated_at: string;
}

export interface INovoAnuncioPayload {
  veiculo_id: string | null;
  template_id: string | null;
  platform: Platform;
  nome: string;
  objetivo: string;
  orcamento_diario: number;
  duracao_dias: number;
  regiao_config: RegiaoConfig;
  observacoes?: string;
  imagem_url?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const MarketingAdsService = {
  // ── Templates ──────────────────────────────────────────────────────────────

  async getTemplates(): Promise<IMktTemplate[]> {
    const { data, error } = await supabase
      .from('mkt_templates')
      .select('*')
      .eq('ativo', true)
      .order('is_padrao', { ascending: false })
      .order('nome');

    if (error) throw error;
    return (data || []) as IMktTemplate[];
  },

  async createTemplate(payload: Omit<IMktTemplate, 'id' | 'created_at'>): Promise<IMktTemplate> {
    const { data, error } = await supabase
      .from('mkt_templates')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as IMktTemplate;
  },

  async updateTemplate(id: string, payload: Partial<IMktTemplate>): Promise<IMktTemplate> {
    const { data, error } = await supabase
      .from('mkt_templates')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as IMktTemplate;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('mkt_templates')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
  },

  // ── Campanhas ──────────────────────────────────────────────────────────────

  async getCampanhas(): Promise<IMktCampanha[]> {
    const { data, error } = await supabase
      .from('mkt_campanhas')
      .select(`
        *,
        veiculo:est_veiculos (
          id,
          ano_modelo,
          valor_venda,
          modelo:cad_modelos ( nome ),
          montadora:cad_montadoras ( nome ),
          fotos:est_fotos_veiculos ( url )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as IMktCampanha[];
  },

  async createCampanha(payload: INovoAnuncioPayload): Promise<IMktCampanha> {
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + payload.duracao_dias);

    const { data, error } = await supabase
      .from('mkt_campanhas')
      .insert({
        veiculo_id: payload.veiculo_id,
        template_id: payload.template_id,
        nome: payload.nome,
        platform: payload.platform,
        objetivo: payload.objetivo,
        orcamento_diario: payload.orcamento_diario,
        regiao_config: payload.regiao_config,
        observacoes: payload.observacoes,
        status: 'RASCUNHO',
        data_inicio: new Date().toISOString(),
        data_fim: dataFim.toISOString(),
        metricas: {},
        creative_url: payload.imagem_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as IMktCampanha;
  },

  async updateCampanhaStatus(id: string, status: CampanhaStatus): Promise<void> {
    const { error } = await supabase
      .from('mkt_campanhas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteCampanha(id: string): Promise<void> {
    const { error } = await supabase
      .from('mkt_campanhas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getCreativesByVeiculo(veiculoId: string): Promise<{ id: string; url: string; tipo: 'FEED' | 'STORY'; created_at: string }[]> {
    const { data, error } = await supabase
      .from('mkt_creatives')
      .select('*')
      .eq('veiculo_id', veiculoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as { id: string; url: string; tipo: 'FEED' | 'STORY'; created_at: string }[];
  },

  // ── Integrações ────────────────────────────────────────────────────────────

  async getIntegracoes(): Promise<IMktIntegracao[]> {
    const { data, error } = await supabase
      .from('mkt_meta_integrations')
      .select('*')
      .order('platform');

    if (error) throw error;
    return (data || []) as IMktIntegracao[];
  },

  async saveIntegracao(payload: Partial<IMktIntegracao>): Promise<IMktIntegracao> {
    const existing = await this.getIntegracoes();
    const found = existing.find(i => i.platform === payload.platform);

    if (found) {
      const { data, error } = await supabase
        .from('mkt_meta_integrations')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', found.id)
        .select()
        .single();
      if (error) throw error;
      return data as IMktIntegracao;
    }

    const { data, error } = await supabase
      .from('mkt_meta_integrations')
      .insert({ ...payload, status: 'CONECTADO' })
      .select()
      .single();
    if (error) throw error;
    return data as IMktIntegracao;
  },

  async desconectarIntegracao(id: string): Promise<void> {
    const { error } = await supabase
      .from('mkt_meta_integrations')
      .update({
        status: 'DESCONECTADO',
        access_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Gera URL de impulsionamento no Facebook Ads Manager com parâmetros pré-preenchidos.
   * Como não temos aprovação da API completa, redirecionamos para a plataforma nativa.
   */
  gerarUrlFacebook(config: {
    ad_account_id?: string;
    page_id?: string;
    titulo?: string;
    descricao?: string;
    imagem_url?: string;
    orcamento?: number;
    duracao?: number;
  }): string {
    const base = 'https://www.facebook.com/ads/create';
    const params = new URLSearchParams();
    if (config.ad_account_id) params.set('act', config.ad_account_id);
    return `${base}?${params.toString()}`;
  },

  /**
   * Gera URL do Google Ads para nova campanha com parâmetros básicos.
   */
  gerarUrlGoogle(config: {
    orcamento?: number;
    descricao?: string;
  }): string {
    return 'https://ads.google.com/aw/campaigns/new/subtype';
  },

  /**
   * Gera URL do Instagram via Meta (usa a mesma infraestrutura do Facebook Ads).
   */
  gerarUrlInstagram(config: {
    ad_account_id?: string;
    imagem_url?: string;
  }): string {
    return 'https://www.facebook.com/ads/create?placement_type=instagram_feed';
  },

  /**
   * Gera URL de destino para impulsionar com base na plataforma escolhida.
   */
  gerarUrlImpulsionamento(platform: Platform, config: {
    ad_account_id?: string;
    page_id?: string;
    titulo?: string;
    descricao?: string;
    imagem_url?: string;
    orcamento?: number;
    duracao?: number;
  }): string {
    switch (platform) {
      case 'FACEBOOK': return this.gerarUrlFacebook(config);
      case 'INSTAGRAM': return this.gerarUrlInstagram(config);
      case 'GOOGLE': return this.gerarUrlGoogle(config);
      default: return '#';
    }
  },

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  },

  getPlatformColor(platform: Platform): string {
    switch (platform) {
      case 'FACEBOOK': return '#1877F2';
      case 'INSTAGRAM': return '#E4405F';
      case 'GOOGLE': return '#4285F4';
      default: return '#64748b';
    }
  },

  getStatusColor(status: CampanhaStatus): string {
    switch (status) {
      case 'ATIVO': return 'emerald';
      case 'PAUSADO': return 'amber';
      case 'ENCERRADO': return 'slate';
      case 'RASCUNHO': return 'blue';
      default: return 'slate';
    }
  },

  getStatusLabel(status: CampanhaStatus): string {
    switch (status) {
      case 'ATIVO': return 'Ativo';
      case 'PAUSADO': return 'Pausado';
      case 'ENCERRADO': return 'Encerrado';
      case 'RASCUNHO': return 'Rascunho';
      default: return status;
    }
  },
};

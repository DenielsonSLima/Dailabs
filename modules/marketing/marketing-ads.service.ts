import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE';
export type CampanhaStatus = 'RASCUNHO' | 'ATIVO' | 'PAUSADO' | 'ENCERRADO';
export type IntegracaoStatus = 'CONECTADO' | 'DESCONECTADO' | 'ERRO';
export type MarketingProvider = 'META' | 'GOOGLE';

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

export interface PublicoConfig {
  perfil: string;
  faixa_etaria_min: number;
  faixa_etaria_max: number;
  interesses: string[];
  resultado_esperado: string;
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
  publico_config?: PublicoConfig;
  resultado_esperado?: string;
  observacoes?: string;
  imagem_url?: string;
}

export interface IMarketingOAuthConfig {
  provider: MarketingProvider;
  authorizationUrl: string | null;
  redirectUri: string;
  scopes: string[];
  missingEnv: string[];
}

const getRuntimeOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');

const createOAuthState = (provider: MarketingProvider, platform: Platform) => {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `marketing:${provider}:${platform}:${randomPart}`;
};

const getFirstEnv = (keys: string[]) => {
  for (const key of keys) {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (value) return value;
  }
  return null;
};

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

  getProviderFromPlatform(platform: Platform): MarketingProvider {
    return platform === 'GOOGLE' ? 'GOOGLE' : 'META';
  },

  findIntegracaoForPlatform(integracoes: IMktIntegracao[], platform: Platform): IMktIntegracao | undefined {
    if (platform === 'GOOGLE') {
      return integracoes.find(i => i.platform === 'GOOGLE' && i.status === 'CONECTADO')
        ?? integracoes.find(i => i.platform === 'GOOGLE');
    }

    return integracoes.find(i => (i.platform === 'FACEBOOK' || i.platform === 'INSTAGRAM') && i.status === 'CONECTADO')
      ?? integracoes.find(i => i.platform === 'FACEBOOK' || i.platform === 'INSTAGRAM');
  },

  countConnectedProviders(integracoes: IMktIntegracao[]): number {
    const hasMeta = integracoes.some(i => (i.platform === 'FACEBOOK' || i.platform === 'INSTAGRAM') && i.status === 'CONECTADO');
    const hasGoogle = integracoes.some(i => i.platform === 'GOOGLE' && i.status === 'CONECTADO');
    return Number(hasMeta) + Number(hasGoogle);
  },

  buildOAuthAuthorizationUrl(platform: Platform, persistState = true): IMarketingOAuthConfig {
    const provider = this.getProviderFromPlatform(platform);
    const origin = getRuntimeOrigin();
    const state = createOAuthState(provider, platform);

    if (persistState && typeof window !== 'undefined') {
      window.sessionStorage.setItem('marketing_oauth_state', state);
      window.sessionStorage.setItem('marketing_oauth_platform', platform);
    }

    if (provider === 'META') {
      const appId = getFirstEnv(['VITE_META_APP_ID', 'VITE_FACEBOOK_APP_ID']);
      const redirectUri = getFirstEnv(['VITE_META_REDIRECT_URI', 'VITE_FACEBOOK_REDIRECT_URI'])
        ?? `${origin}/marketing/oauth/meta/callback`;
      const loginConfigId = getFirstEnv(['VITE_META_LOGIN_CONFIG_ID', 'VITE_FACEBOOK_LOGIN_CONFIG_ID']);
      const scopes = ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'instagram_basic'];

      if (!appId) {
        return { provider, authorizationUrl: null, redirectUri, scopes, missingEnv: ['VITE_META_APP_ID'] };
      }

      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
        auth_type: 'rerequest',
      });
      if (loginConfigId) {
        params.set('config_id', loginConfigId);
      } else {
        params.set('scope', scopes.join(','));
      }

      return {
        provider,
        authorizationUrl: `https://www.facebook.com/dialog/oauth?${params.toString()}`,
        redirectUri,
        scopes,
        missingEnv: [],
      };
    }

    const clientId = getFirstEnv(['VITE_GOOGLE_ADS_CLIENT_ID', 'VITE_GOOGLE_CLIENT_ID']);
    const redirectUri = getFirstEnv(['VITE_GOOGLE_ADS_REDIRECT_URI', 'VITE_GOOGLE_REDIRECT_URI'])
      ?? `${origin}/marketing/oauth/google/callback`;
    const scopes = ['https://www.googleapis.com/auth/adwords'];

    if (!clientId) {
      return { provider, authorizationUrl: null, redirectUri, scopes, missingEnv: ['VITE_GOOGLE_ADS_CLIENT_ID'] };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });

    return {
      provider,
      authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      redirectUri,
      scopes,
      missingEnv: [],
    };
  },

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

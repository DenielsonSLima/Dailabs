import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MarketingAdsService,
  Platform,
  IMktCampanha,
} from './marketing-ads.service';
import {
  invalidateMarketingCampanhas,
  invalidateMarketingIntegracoes,
  marketingQueryKeys,
} from './marketing.query-invalidation';
import PlataformaConnect from './components/PlataformaConnect';
import CampanhaCard from './components/CampanhaCard';
import MarketingConnectModal from './components/MarketingConnectModal';
import MarketingIntegrationHelp from './components/MarketingIntegrationHelp';

const PLATFORMS: Platform[] = ['FACEBOOK', 'INSTAGRAM', 'GOOGLE'];

const AnuncioHubPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'campanhas' | 'conexoes' | 'ajuda'>('campanhas');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);
  const [authorizingPlatform, setAuthorizingPlatform] = useState<Platform | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: campanhas = [], isLoading: loadingCampanhas } = useQuery({
    queryKey: marketingQueryKeys.campanhas,
    queryFn: () => MarketingAdsService.getCampanhas(),
  });

  const { data: integracoes = [], isLoading: loadingIntegracoes } = useQuery({
    queryKey: marketingQueryKeys.integracoes,
    queryFn: () => MarketingAdsService.getIntegracoes(),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const pausarMutation = useMutation({
    mutationFn: (id: string) => MarketingAdsService.updateCampanhaStatus(id, 'PAUSADO'),
    onSuccess: () => {
      invalidateMarketingCampanhas(queryClient);
      toast.success('Campanha pausada!');
    },
    onError: () => toast.error('Erro ao pausar campanha.'),
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => MarketingAdsService.deleteCampanha(id),
    onSuccess: () => {
      invalidateMarketingCampanhas(queryClient);
      toast.success('Campanha removida!');
    },
    onError: () => toast.error('Erro ao remover campanha.'),
  });

  const desconectarMutation = useMutation({
    mutationFn: (id: string) => MarketingAdsService.desconectarIntegracao(id),
    onSuccess: () => {
      invalidateMarketingIntegracoes(queryClient);
      toast.success('Conta desconectada!');
    },
    onError: () => toast.error('Erro ao desconectar conta.'),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleConectar = (platform: Platform) => {
    setConnectingPlatform(platform);
    setShowConnectModal(true);
  };

  const handleStartOAuth = () => {
    if (!connectingPlatform) return;

    const config = MarketingAdsService.buildOAuthAuthorizationUrl(connectingPlatform);
    if (!config.authorizationUrl) {
      toast.error(`Configure ${config.missingEnv.join(', ')} para liberar o login ${config.provider === 'META' ? 'Meta' : 'Google Ads'}.`);
      return;
    }

    setAuthorizingPlatform(connectingPlatform);
    window.location.assign(config.authorizationUrl);
  };

  const handleImpulsionar = (campanha: IMktCampanha) => {
    const integracao = MarketingAdsService.findIntegracaoForPlatform(integracoes, campanha.platform);
    const foto = campanha.veiculo?.fotos?.[0]?.url;
    const url = MarketingAdsService.gerarUrlImpulsionamento(campanha.platform, {
      ad_account_id: integracao?.ad_account_id ?? undefined,
      page_id: integracao?.facebook_page_id ?? undefined,
      titulo: campanha.nome,
      imagem_url: foto,
      orcamento: campanha.orcamento_diario ?? undefined,
    });
    window.open(url, '_blank', 'noopener,noreferrer');

    // Atualiza status para ATIVO
    MarketingAdsService.updateCampanhaStatus(campanha.id, 'ATIVO').then(() => {
      invalidateMarketingCampanhas(queryClient);
    });
  };

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const ativas = campanhas.filter(c => c.status === 'ATIVO').length;
  const rascunhos = campanhas.filter(c => c.status === 'RASCUNHO').length;
  const totalOrcamento = campanhas
    .filter(c => c.status === 'ATIVO')
    .reduce((sum, c) => sum + (c.orcamento_diario ?? 0), 0);
  const totalConectadas = MarketingAdsService.countConnectedProviders(integracoes);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Central de Anúncios</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tráfego Pago — Facebook · Instagram · Google</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/marketing/anuncios/novo')}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:opacity-90 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Anúncio
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Campanhas Ativas',
            value: ativas,
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
            color: 'from-emerald-500 to-teal-600',
          },
          {
            label: 'Rascunhos',
            value: rascunhos,
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
            color: 'from-blue-500 to-indigo-600',
          },
          {
            label: 'Gasto Diário',
            value: MarketingAdsService.formatarMoeda(totalOrcamento),
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            color: 'from-violet-500 to-purple-600',
          },
          {
            label: 'Contas Conectadas',
            value: `${totalConectadas} / 2`,
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
            color: 'from-amber-500 to-orange-600',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white mb-3 shadow`}>
              {kpi.icon}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{kpi.label}</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'campanhas' as const, label: 'Campanhas', count: campanhas.length },
          { key: 'conexoes' as const, label: 'Conexões', count: integracoes.filter(i => i.status === 'CONECTADO').length },
          { key: 'ajuda' as const, label: 'Ajuda' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}

      {activeTab === 'campanhas' && (
        <div>
          {loadingCampanhas ? (
            <div className="grid gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : campanhas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="font-black text-slate-700 text-lg">Nenhum anúncio criado</h3>
              <p className="text-sm text-slate-400 mt-1 text-center max-w-xs">
                Crie seu primeiro anúncio para começar a divulgar seus veículos nas redes sociais.
              </p>
              <button
                onClick={() => navigate('/marketing/anuncios/novo')}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black text-sm shadow hover:opacity-90 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Criar Primeiro Anúncio
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {campanhas.map(c => (
                <CampanhaCard
                  key={c.id}
                  campanha={c}
                  onImpulsionar={handleImpulsionar}
                  onPausar={(id) => pausarMutation.mutate(id)}
                  onExcluir={(id) => excluirMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'conexoes' && (
        <div>
          <div className="grid md:grid-cols-3 gap-4">
            {PLATFORMS.map(platform => {
              const integracao = MarketingAdsService.findIntegracaoForPlatform(integracoes, platform) ?? null;
              return (
                <PlataformaConnect
                  key={platform}
                  platform={platform}
                  integracao={integracao}
                  onConectar={handleConectar}
                  onDesconectar={(id) => desconectarMutation.mutate(id)}
                  isLoading={authorizingPlatform === platform}
                />
              );
            })}
          </div>

          {/* Info box */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-black text-amber-900">Como funciona a integração?</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Facebook e Instagram usam a mesma autorização Meta Ads. O saldo, moeda, conta e gastos devem ser sincronizados pelas APIs oficiais após o login; a criação automática de campanhas depende de backend com tokens seguros e aprovação da Meta/Google.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ajuda' && (
        <MarketingIntegrationHelp />
      )}

      {/* ── Modal de Conexão OAuth ──────────────────────────────────────────── */}
      {showConnectModal && connectingPlatform && (
        <MarketingConnectModal
          platform={connectingPlatform}
          isAuthorizing={authorizingPlatform === connectingPlatform}
          onClose={() => setShowConnectModal(false)}
          onAuthorize={handleStartOAuth}
        />
      )}
    </div>
  );
};

export default AnuncioHubPage;

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MarketingAdsService, Platform, IMktCampanha, IMktIntegracao, IMktTemplate } from './marketing-ads.service';
import { EstoqueService } from '../estoque/estoque.service';
import { EmpresaService } from '../ajustes/empresa/empresa.service';
import { StorageService } from '../../lib/storage.service';
import PlataformaConnect from './components/PlataformaConnect';
import TemplateSelector from './components/TemplateSelector';
import MarketingVehicleSelection from './components/MarketingVehicleSelection';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'ANUNCIOS' | 'ESTOQUE' | 'HISTORICO' | 'CONFIGURACOES';

const PLATFORMS: Platform[] = ['FACEBOOK', 'INSTAGRAM', 'GOOGLE'];

const OBJECTIVES = [
  { key: 'REACH', label: 'Alcance' },
  { key: 'ENGAGEMENT', label: 'Engajamento' },
  { key: 'TRAFFIC', label: 'Tráfego' },
  { key: 'LEADS', label: 'Leads' },
];

// ─── Platform Icons ───────────────────────────────────────────────────────────

const PlatformIcon: React.FC<{ platform: Platform; className?: string }> = ({ platform, className = 'w-4 h-4' }) => {
  if (platform === 'FACEBOOK') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
  if (platform === 'INSTAGRAM') return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
};

// ─── Wizard de Novo Anúncio (Modal interno) ───────────────────────────────────

interface WizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NovoAnuncioWizard: React.FC<WizardProps> = ({ onClose, onSuccess }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<IMktTemplate | null>(null);
  const [platform, setPlatform] = useState<Platform>('FACEBOOK');
  const [objetivo, setObjetivo] = useState('REACH');
  const [orcamento, setOrcamento] = useState(30);
  const [duracao, setDuracao] = useState(7);
  const [raioKm, setRaioKm] = useState(30);
  const [tipoRegiao, setTipoRegiao] = useState<'RAIO' | 'ESTADO' | 'NACIONAL'>('ESTADO');
  const [nome, setNome] = useState('');
  const [creativeUrl, setCreativeUrl] = useState('');
  const [isUploadingCreative, setIsUploadingCreative] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: estoque } = useQuery({
    queryKey: ['estoque_marketing'],
    queryFn: () => EstoqueService.getAll({ limit: 200, page: 1, statusTab: 'DISPONIVEL' }),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['mkt_templates'],
    queryFn: () => MarketingAdsService.getTemplates(),
  });
  const { data: veiculo } = useQuery({
    queryKey: ['veiculo_wizard', selectedVeiculoId],
    queryFn: () => selectedVeiculoId ? EstoqueService.getById(selectedVeiculoId) : null,
    enabled: !!selectedVeiculoId,
  });
  const { data: creatives = [] } = useQuery({
    queryKey: ['veiculo_creatives_wizard', selectedVeiculoId],
    queryFn: () => selectedVeiculoId ? MarketingAdsService.getCreativesByVeiculo(selectedVeiculoId) : [],
    enabled: !!selectedVeiculoId,
  });
  const { data: empresa } = useQuery({
    queryKey: ['config_empresa_mkt'],
    queryFn: () => EmpresaService.getDadosEmpresa(),
  });

  useEffect(() => {
    if (creatives.length > 0) {
      setCreativeUrl(creatives[0].url);
    } else if (veiculo?.fotos?.[0]?.url) {
      setCreativeUrl(veiculo.fotos[0].url);
    } else {
      setCreativeUrl('');
    }
  }, [veiculo, creatives]);

  const handleCreativeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCreative(true);
    try {
      const publicUrl = await StorageService.uploadImage(file, 'veiculos', 'marketing-creatives');
      setCreativeUrl(publicUrl);
      toast.success('Imagem carregada!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao subir imagem.');
    } finally {
      setIsUploadingCreative(false);
    }
  };

  const criarMutation = useMutation({
    mutationFn: (payload: Parameters<typeof MarketingAdsService.createCampanha>[0]) => MarketingAdsService.createCampanha(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mkt_campanhas'] });
      toast.success('Anúncio criado com sucesso!');
      onSuccess();
    },
    onError: () => toast.error('Erro ao criar anúncio.'),
  });

  const nomeSugerido = veiculo
    ? `${veiculo.montadora?.nome || ''} ${veiculo.modelo?.nome || ''} ${veiculo.ano_modelo || ''} — ${platform}`.trim()
    : '';

  const platformColors: Record<Platform, string> = {
    FACEBOOK: '#1877F2', INSTAGRAM: '#E4405F', GOOGLE: '#4285F4',
  };

  const handleSubmit = () => {
    criarMutation.mutate({
      veiculo_id: selectedVeiculoId || null,
      template_id: selectedTemplate?.id ?? null,
      platform,
      nome: nome || nomeSugerido,
      objetivo,
      orcamento_diario: orcamento,
      duracao_dias: duracao,
      regiao_config: { 
        tipo: tipoRegiao, 
        raio_km: tipoRegiao === 'RAIO' ? raioKm : undefined,
        estado: tipoRegiao === 'ESTADO' ? (empresa?.uf || 'SE') : undefined
      },
      imagem_url: creativeUrl || undefined
    });
  };

  const steps = ['Veículo', 'Template', 'Plataforma', 'Configurar', 'Revisar'];

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">Novo Anúncio</h2>
            <div className="flex items-center gap-2 mt-2">
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    step === i + 1 ? 'bg-slate-900 text-white' :
                    step > i + 1 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'
                  }`}>{s}</span>
                  {i < steps.length - 1 && <span className="text-slate-200 text-xs">›</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-4">Selecione o veículo que deseja anunciar</p>
              <MarketingVehicleSelection
                veiculos={estoque?.data || []}
                selectedId={selectedVeiculoId}
                onSelect={setSelectedVeiculoId}
              />
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Escolha um template pré-configurado (opcional)</p>
              <TemplateSelector templates={templates} selectedId={selectedTemplate?.id ?? null} onSelect={t => { setSelectedTemplate(t); setPlatform(t.platform); setObjetivo(t.objetivo); setOrcamento(t.orcamento_diario); setDuracao(t.duracao_dias); if (t.regiao_config) { setTipoRegiao(t.regiao_config.tipo as 'RAIO' | 'ESTADO' | 'NACIONAL'); setRaioKm(t.regiao_config.raio_km || 30); }}} />
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-4">Onde deseja veicular o anúncio?</p>
              {(['FACEBOOK', 'INSTAGRAM', 'GOOGLE'] as Platform[]).map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${platform === p ? 'border-[#004691] bg-[#004691]/5' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: platformColors[p] }}>
                    <PlatformIcon platform={p} className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-black text-slate-900 text-sm">{p === 'FACEBOOK' ? 'Facebook Ads' : p === 'INSTAGRAM' ? 'Instagram Ads' : 'Google Ads'}</p>
                    <p className="text-[11px] text-slate-500">{p === 'FACEBOOK' ? 'Feed, Reels e Marketplace' : p === 'INSTAGRAM' ? 'Feed, Stories e Reels' : 'Search, Display e YouTube'}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${platform === p ? 'bg-[#004691] border-[#004691]' : 'border-slate-200'}`}>
                    {platform === p && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Objetivo */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Objetivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map(o => (
                    <button key={o.key} onClick={() => setObjetivo(o.key)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black transition-all ${objetivo === o.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
                    >{o.label}</button>
                  ))}
                </div>
              </div>
              {/* Região */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Região</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[{ k: 'RAIO', l: 'Local' }, { k: 'ESTADO', l: 'Estadual' }, { k: 'NACIONAL', l: 'Nacional' }].map(r => (
                    <button key={r.k} onClick={() => setTipoRegiao(r.k as 'RAIO' | 'ESTADO' | 'NACIONAL')}
                      className={`py-2 rounded-xl border-2 text-[11px] font-black transition-all ${tipoRegiao === r.k ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
                    >{r.l}</button>
                  ))}
                </div>
                {tipoRegiao === 'RAIO' && (
                  <div className="flex items-center gap-3">
                    <input type="range" min={5} max={200} step={5} value={raioKm} onChange={e => setRaioKm(Number(e.target.value))} className="flex-1 accent-indigo-600" />
                    <span className="text-sm font-black text-indigo-600 w-16 text-right">{raioKm} km</span>
                  </div>
                )}
                {empresa?.cidade && <p className="text-[10px] text-slate-400 mt-1">Centro: {empresa.cidade}{empresa.uf ? `, ${empresa.uf}` : ''}</p>}
              </div>
              {/* Orçamento */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Orçamento Diário (R$)</label>
                <input type="number" min={5} step={5} value={orcamento} onChange={e => setOrcamento(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex gap-2 mt-2">
                  {[20, 30, 80, 200].map(v => (
                    <button key={v} onClick={() => setOrcamento(v)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${orcamento === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >R$ {v}</button>
                  ))}
                </div>
              </div>
              {/* Duração */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Duração</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={30} value={duracao} onChange={e => setDuracao(Number(e.target.value))} className="flex-1 accent-indigo-600" />
                  <span className="text-sm font-black text-indigo-600 w-20 text-right">{duracao} dias</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">Total estimado:</span>
                  <span className="text-xs font-black text-emerald-600">{MarketingAdsService.formatarMoeda(orcamento * duracao)}</span>
                </div>
              </div>

              {/* Imagem do Anúncio (Criativo) */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Imagem do Anúncio (Criativo)
                </label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {/* Foto Principal do Veículo */}
                  {veiculo?.fotos?.[0]?.url && (
                    <button
                      type="button"
                      onClick={() => setCreativeUrl(veiculo.fotos[0].url)}
                      className={`relative w-20 h-20 rounded-2xl overflow-hidden border-4 flex-shrink-0 transition-all ${
                        creativeUrl === veiculo.fotos[0].url ? 'border-indigo-600 scale-95 shadow-md' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <img src={veiculo.fotos[0].url} className="w-full h-full object-cover" alt="Principal" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-black text-white py-0.5 text-center">
                        Principal
                      </div>
                    </button>
                  )}

                  {/* Criativos Gerados */}
                  {creatives.map((creative) => (
                    <button
                      key={creative.id}
                      type="button"
                      onClick={() => setCreativeUrl(creative.url)}
                      className={`relative w-20 h-20 rounded-2xl overflow-hidden border-4 flex-shrink-0 transition-all ${
                        creativeUrl === creative.url ? 'border-indigo-600 scale-95 shadow-md' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <img src={creative.url} className="w-full h-full object-cover" alt={creative.tipo} />
                      <div className="absolute bottom-0 inset-x-0 bg-indigo-900/80 text-[8px] font-black text-white py-0.5 text-center">
                        {creative.tipo}
                      </div>
                    </button>
                  ))}

                  {/* Upload de imagem customizada */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCreativeUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingCreative}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-colors text-slate-500 hover:text-indigo-600"
                  >
                    {isUploadingCreative ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[8px] font-black uppercase tracking-wider">Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div>
              <div className="mb-4 flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                {creativeUrl ? (
                  <img src={creativeUrl} className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0" alt="Criativo" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" /></svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome da Campanha</label>
                  <input type="text" value={nome || nomeSugerido} onChange={e => setNome(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                {veiculo && <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Veículo</span><span className="text-xs font-bold text-slate-800">{veiculo.montadora?.nome} {veiculo.modelo?.nome} {veiculo.ano_modelo}</span></div>}
                <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Plataforma</span><span className="text-xs font-bold text-slate-800">{platform}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Objetivo</span><span className="text-xs font-bold text-slate-800">{OBJECTIVES.find(o => o.key === objetivo)?.label}</span></div>
                <div className="flex justify-between"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Região</span><span className="text-xs font-bold text-slate-800">{tipoRegiao === 'RAIO' ? `${raioKm}km local` : tipoRegiao === 'ESTADO' ? 'Estadual' : 'Nacional'}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-3"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Estimado</span><span className="text-sm font-black text-emerald-600">{MarketingAdsService.formatarMoeda(orcamento * duracao)}</span></div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[11px] text-blue-700">Após criar, clique em <strong>Impulsionar</strong> no card para ser direcionado ao {platform} com as configurações pré-preenchidas.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100">
          {step > 1 && <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Voltar</button>}
          {step < 5
            ? <button onClick={() => { if (step === 1 && !selectedVeiculoId) { toast.error('Selecione um veículo.'); return; } setStep(s => s + 1); }} className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow hover:opacity-90 transition-all flex items-center justify-center gap-2">Próximo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            : <button onClick={handleSubmit} disabled={criarMutation.isPending} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">{criarMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Criar Anúncio</>}</button>
          }
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Card de Anúncio Ativo ────────────────────────────────────────────────────

const AnuncioCard: React.FC<{
  campanha: IMktCampanha;
  onImpulsionar: (c: IMktCampanha) => void;
  onPausar: (id: string) => void;
  onExcluir: (id: string) => void;
}> = ({ campanha, onImpulsionar, onPausar, onExcluir }) => {
  const foto = campanha.creative_url || campanha.veiculo?.fotos?.[0]?.url;
  const vNome = [campanha.veiculo?.montadora?.nome, campanha.veiculo?.modelo?.nome].filter(Boolean).join(' ');
  const metricas = (campanha.metricas || {}) as Record<string, number>;
  const alcance = metricas.alcance ?? 0;
  const cliques = metricas.cliques ?? 0;
  const gasto = metricas.gasto ?? 0;
  const impressoes = metricas.impressoes ?? 0;
  const color = MarketingAdsService.getPlatformColor(campanha.platform);

  const statusColors: Record<string, string> = {
    ATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PAUSADO: 'bg-amber-50 text-amber-700 border-amber-200',
    RASCUNHO: 'bg-blue-50 text-blue-700 border-blue-200',
    ENCERRADO: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const statusDot: Record<string, string> = {
    ATIVO: 'bg-emerald-500 animate-pulse',
    PAUSADO: 'bg-amber-400',
    RASCUNHO: 'bg-blue-400',
    ENCERRADO: 'bg-slate-400',
  };

  const diasRestantes = campanha.data_fim
    ? Math.max(0, Math.ceil((new Date(campanha.data_fim).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Topo: foto + plataforma */}
      <div className="relative h-36 bg-slate-100">
        {foto
          ? <img src={foto} alt={vNome} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h.01M12 7h.01M16 7h.01M5 10.5h14l1.5 3v4H3.5v-4L5 10.5zM5 10.5l1.5-3h11l1.5 3" /></svg></div>
        }
        {/* Platform badge */}
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md" style={{ backgroundColor: color }}>
          <PlatformIcon platform={campanha.platform} className="w-3.5 h-3.5" />
        </div>
        {/* Status badge */}
        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${statusColors[campanha.status] || statusColors.RASCUNHO}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[campanha.status] || statusDot.RASCUNHO}`} />
          {MarketingAdsService.getStatusLabel(campanha.status)}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{vNome || campanha.nome}</h3>
        {campanha.veiculo?.ano_modelo && <p className="text-[11px] text-slate-400 mt-0.5">{campanha.veiculo.ano_modelo} • {campanha.veiculo.valor_venda ? MarketingAdsService.formatarMoeda(campanha.veiculo.valor_venda) : ''}</p>}

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Alcance</p>
            <p className="text-base font-black text-slate-900">{alcance.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Cliques</p>
            <p className="text-base font-black text-slate-900">{cliques.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Impressões</p>
            <p className="text-base font-black text-slate-900">{impressoes.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Gasto</p>
            <p className="text-base font-black text-emerald-600">{MarketingAdsService.formatarMoeda(gasto)}</p>
          </div>
        </div>

        {/* Budget bar */}
        {campanha.orcamento_diario && (
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{MarketingAdsService.formatarMoeda(campanha.orcamento_diario)}/dia</span>
              {diasRestantes !== null && <span className="text-[9px] text-slate-400">{diasRestantes}d restantes</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => onImpulsionar(campanha)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 shadow"
            style={{ backgroundColor: color }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Impulsionar
          </button>
          {campanha.status === 'ATIVO' && (
            <button onClick={() => onPausar(campanha.id)} className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all" title="Pausar">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          )}
          <button onClick={() => onExcluir(campanha.id)} className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all" title="Excluir">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Página Principal (Marketing Hub) ─────────────────────────────────────────

const MarketingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('ANUNCIOS');
  const [showWizard, setShowWizard] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);
  const [connectForm, setConnectForm] = useState({ account_name: '', ad_account_id: '', saldo_disponivel: '' });

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: campanhas = [], isLoading: loadingCampanhas } = useQuery({
    queryKey: ['mkt_campanhas'],
    queryFn: () => MarketingAdsService.getCampanhas(),
  });

  const { data: estoque } = useQuery({
    queryKey: ['estoque_marketing_lista'],
    queryFn: () => EstoqueService.getAll({ limit: 200, page: 1, statusTab: 'DISPONIVEL' }),
  });

  const { data: integracoes = [] } = useQuery({
    queryKey: ['mkt_integracoes'],
    queryFn: () => MarketingAdsService.getIntegracoes(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['mkt_templates'],
    queryFn: () => MarketingAdsService.getTemplates(),
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const pausarMutation = useMutation({
    mutationFn: (id: string) => MarketingAdsService.updateCampanhaStatus(id, 'PAUSADO'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mkt_campanhas'] }); toast.success('Campanha pausada.'); },
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => MarketingAdsService.deleteCampanha(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mkt_campanhas'] }); toast.success('Campanha excluída.'); },
  });

  const desconectarMutation = useMutation({
    mutationFn: (id: string) => MarketingAdsService.desconectarIntegracao(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mkt_integracoes'] }); toast.success('Conta desconectada.'); },
  });

  const conectarMutation = useMutation({
    mutationFn: (p: Partial<IMktIntegracao>) => MarketingAdsService.saveIntegracao(p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mkt_integracoes'] }); toast.success('Conta conectada!'); setShowConnectModal(false); setConnectForm({ account_name: '', ad_account_id: '', saldo_disponivel: '' }); },
    onError: () => toast.error('Erro ao conectar.'),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleImpulsionar = useCallback((campanha: IMktCampanha) => {
    const integracao = integracoes.find(i => i.platform === campanha.platform);
    const foto = campanha.creative_url || campanha.veiculo?.fotos?.[0]?.url;
    const url = MarketingAdsService.gerarUrlImpulsionamento(campanha.platform, {
      ad_account_id: integracao?.ad_account_id ?? undefined,
      orcamento: campanha.orcamento_diario ?? undefined,
      imagem_url: foto,
    });
    window.open(url, '_blank');
    MarketingAdsService.updateCampanhaStatus(campanha.id, 'ATIVO').then(() => queryClient.invalidateQueries({ queryKey: ['mkt_campanhas'] }));
  }, [integracoes, queryClient]);

  // ── Dados derivados ───────────────────────────────────────────────────────────

  const ativas = campanhas.filter(c => ['ATIVO', 'RASCUNHO', 'PAUSADO'].includes(c.status));
  const historico = campanhas.filter(c => c.status === 'ENCERRADO');
  const totalGasto = ativas.reduce((s, c) => s + (((c.metricas || {}) as Record<string, number>).gasto ?? 0), 0);
  const totalAlcance = ativas.reduce((s, c) => s + (((c.metricas || {}) as Record<string, number>).alcance ?? 0), 0);
  const contasConectadas = integracoes.filter(i => i.status === 'CONECTADO').length;

  // ── Menu de Abas ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'ANUNCIOS', label: 'Anúncios', icon: 'M13 10V3L4 14h7v7l9-11h-7z', count: ativas.length },
    { id: 'ESTOQUE', label: 'Estoque', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', count: estoque?.data?.length },
    { id: 'HISTORICO', label: 'Histórico', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', count: historico.length },
    { id: 'CONFIGURACOES', label: 'Configurações', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Anúncios Ativos', value: ativas.filter(c => c.status === 'ATIVO').length, color: 'from-violet-500 to-indigo-600', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { label: 'Alcance Total', value: totalAlcance.toLocaleString('pt-BR'), color: 'from-blue-500 to-sky-600', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
          { label: 'Total Gasto', value: MarketingAdsService.formatarMoeda(totalGasto), color: 'from-emerald-500 to-teal-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Contas Conectadas', value: `${contasConectadas} / ${PLATFORMS.length}`, color: 'from-amber-500 to-orange-600', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center text-white mb-2 shadow`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={k.icon} /></svg>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{k.label}</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation (padrão Financeiro) ──────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-2xl scale-105 z-10'
                : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <svg className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-white' : 'text-violet-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}

        {/* Botão Novo Anúncio (sempre visível) */}
        <button onClick={() => navigate('/marketing/anuncios/novo')}
          className="ml-auto flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo Anúncio
        </button>
      </div>

      {/* ── Conteúdo das Abas ────────────────────────────────────────────────── */}
      <div className="min-h-[400px] animate-in slide-in-from-bottom-4 duration-500">

        {/* ABA: ANÚNCIOS */}
        {activeTab === 'ANUNCIOS' && (
          <div>
            {loadingCampanhas ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : ativas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-3xl bg-violet-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <h3 className="font-black text-slate-700 text-lg">Nenhum anúncio ativo</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">Crie seu primeiro anúncio para começar a divulgar seus veículos.</p>
                <button onClick={() => navigate('/marketing/anuncios/novo')} className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black text-xs shadow hover:opacity-90 transition-all uppercase tracking-widest">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Criar Primeiro Anúncio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ativas.map(c => (
                  <AnuncioCard key={c.id} campanha={c}
                    onImpulsionar={handleImpulsionar}
                    onPausar={(id) => pausarMutation.mutate(id)}
                    onExcluir={(id) => excluirMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: ESTOQUE */}
        {activeTab === 'ESTOQUE' && (
          <div>
            {!estoque?.data?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <p className="font-bold text-sm">Nenhum veículo disponível no estoque</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {estoque.data.map((v: any) => {
                  const jaAnunciado = ativas.some(c => c.veiculo_id === v.id);
                  const foto = v.fotos?.[0]?.url;
                  return (
                    <div key={v.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                      <div className="relative h-36 bg-slate-100">
                        {foto
                          ? <img src={foto} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                        }
                        {jaAnunciado && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest">Anunciado</div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-black text-slate-900 text-sm truncate">{v.montadora?.nome} {v.modelo?.nome}</h3>
                        <p className="text-[11px] text-slate-400">{v.ano_modelo} · {v.km?.toLocaleString('pt-BR')} km</p>
                        {v.valor_venda && <p className="text-sm font-black text-emerald-600 mt-1">{MarketingAdsService.formatarMoeda(v.valor_venda)}</p>}
                        <button onClick={() => navigate('/marketing/anuncios/novo')}
                          disabled={jaAnunciado}
                          className="w-full mt-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow hover:opacity-90"
                        >
                          {jaAnunciado ? 'Já anunciado' : 'Anunciar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {activeTab === 'HISTORICO' && (
          <div>
            {historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="font-bold text-sm">Nenhum anúncio encerrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map(c => {
                  const metricas = (c.metricas || {}) as Record<string, number>;
                  const foto = c.veiculo?.fotos?.[0]?.url;
                  const vNome = [c.veiculo?.montadora?.nome, c.veiculo?.modelo?.nome].filter(Boolean).join(' ');
                  const color = MarketingAdsService.getPlatformColor(c.platform);
                  return (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                        {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" /></svg></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                            <PlatformIcon platform={c.platform} className="w-2.5 h-2.5" />
                          </div>
                          <h4 className="font-black text-slate-900 text-sm truncate">{vNome || c.nome}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400">{c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : ''} → {c.data_fim ? new Date(c.data_fim).toLocaleDateString('pt-BR') : ''}</p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[10px] text-slate-500">Alcance: <strong>{(metricas.alcance ?? 0).toLocaleString('pt-BR')}</strong></span>
                          <span className="text-[10px] text-slate-500">Cliques: <strong>{(metricas.cliques ?? 0).toLocaleString('pt-BR')}</strong></span>
                          <span className="text-[10px] text-emerald-600">Gasto: <strong>{MarketingAdsService.formatarMoeda(metricas.gasto ?? 0)}</strong></span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-widest flex-shrink-0">Encerrado</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: CONFIGURAÇÕES */}
        {activeTab === 'CONFIGURACOES' && (
          <div className="space-y-8">
            {/* Conexões */}
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Contas de Anúncio</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {PLATFORMS.map(platform => {
                  const integracao = integracoes.find(i => i.platform === platform) ?? null;
                  return (
                    <PlataformaConnect key={platform} platform={platform} integracao={integracao}
                      onConectar={(p) => { setConnectingPlatform(p); setShowConnectModal(true); }}
                      onDesconectar={(id) => desconectarMutation.mutate(id)}
                      isLoading={conectarMutation.isPending && connectingPlatform === platform}
                    />
                  );
                })}
              </div>
            </div>

            {/* Templates */}
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Templates de Campanha</h3>
              <TemplateSelector templates={templates} selectedId={null} onSelect={() => {}} />
            </div>

            {/* Ferramentas de Criação */}
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ferramentas de Criação Visual</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button onClick={() => navigate('/marketing/feed')}
                  className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Gerador de Feed</p>
                    <p className="text-xs text-slate-500 mt-0.5">Crie imagens 1080×1350 para o feed do Instagram e Facebook</p>
                  </div>
                </button>
                <button onClick={() => navigate('/marketing/stories')}
                  className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-pink-200 transition-all group text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Gerador de Stories</p>
                    <p className="text-xs text-slate-500 mt-0.5">Crie stories 1080×1920 para Instagram e Facebook</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-xs font-black text-amber-900">Sobre a integração com as plataformas</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">Informe os dados da sua conta de anúncios para que o sistema exiba o saldo e direcione corretamente ao impulsionar. A criação automática de campanhas requer aprovação das APIs da Meta e Google — solicite acesso em developers.facebook.com e ads.google.com/aw/apiaccess.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Wizard Modal ─────────────────────────────────────────────────────── */}
      {showWizard && (
        <NovoAnuncioWizard onClose={() => setShowWizard(false)} onSuccess={() => setShowWizard(false)} />
      )}

      {/* ── Modal Conectar Conta ─────────────────────────────────────────────── */}
      {showConnectModal && connectingPlatform && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Conectar {connectingPlatform}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Informe os dados da sua conta de anúncios</p>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="p-2 rounded-xl hover:bg-slate-100">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'account_name', label: 'Nome da Conta *', placeholder: 'Ex: Hidrocar Veículos' },
                { key: 'ad_account_id', label: 'ID da Conta de Anúncios', placeholder: 'Ex: act_123456789' },
                { key: 'saldo_disponivel', label: 'Saldo Disponível (R$)', placeholder: 'Ex: 500.00', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</label>
                  <input type={f.type || 'text'} value={(connectForm as any)[f.key]} onChange={e => setConnectForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={() => { if (!connectForm.account_name) { toast.error('Informe o nome da conta.'); return; } conectarMutation.mutate({ platform: connectingPlatform, account_name: connectForm.account_name, ad_account_id: connectForm.ad_account_id || null, saldo_disponivel: connectForm.saldo_disponivel ? parseFloat(connectForm.saldo_disponivel) : null, status: 'CONECTADO' }); }}
                disabled={conectarMutation.isPending}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {conectarMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingPage;

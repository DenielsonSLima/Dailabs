import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EstoqueService } from '../estoque/estoque.service';
import { EmpresaService } from '../ajustes/empresa/empresa.service';
import { CidadesService } from '../cadastros/cidades/cidades.service';
import {
  MarketingAdsService,
  Platform,
  IMktTemplate,
  INovoAnuncioPayload,
  RegiaoConfig,
  PublicoConfig,
} from './marketing-ads.service';
import {
  invalidateMarketingCampanhas,
  marketingQueryKeys,
} from './marketing.query-invalidation';
import TemplateSelector from './components/TemplateSelector';
import MarketingVehicleSelection from './components/MarketingVehicleSelection';

type Step = 1 | 2 | 3 | 4 | 5;

const PLATFORMS: { key: Platform; label: string; color: string; icon: React.ReactNode }[] = [
  {
    key: 'FACEBOOK',
    label: 'Facebook',
    color: '#1877F2',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  {
    key: 'INSTAGRAM',
    label: 'Instagram',
    color: '#E4405F',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
  },
  {
    key: 'GOOGLE',
    label: 'Google',
    color: '#4285F4',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  },
];

const OBJECTIVES = [
  { key: 'REACH', label: 'Alcance', descricao: 'Mostrar para o máximo de pessoas' },
  { key: 'ENGAGEMENT', label: 'Engajamento', descricao: 'Curtidas, comentários e compartilhamentos' },
  { key: 'TRAFFIC', label: 'Tráfego', descricao: 'Levar visitas ao site ou WhatsApp' },
  { key: 'LEADS', label: 'Leads', descricao: 'Capturar contatos interessados' },
];

const PUBLICOS = [
  { key: 'COMPRADORES_INTENCAO', label: 'Compradores com intenção', descricao: 'Pessoas pesquisando troca, financiamento ou seminovos' },
  { key: 'FINANCIAMENTO', label: 'Financiamento', descricao: 'Público interessado em parcelas, crédito e aprovação' },
  { key: 'PREMIUM', label: 'Alto padrão', descricao: 'Busca por SUVs, sedãs, caminhonetes e veículos premium' },
  { key: 'RETARGETING', label: 'Remarketing', descricao: 'Quem já interagiu com site, Instagram ou WhatsApp' },
];

const INTERESSES_PADRAO = [
  'Carros usados',
  'Seminovos',
  'Financiamento de veículos',
  'Compra de automóveis',
  'Troca de carro',
  'SUV',
  'Picape',
  'Seguro auto',
];

const RESULTADOS = [
  { key: 'LEADS_WHATSAPP', label: 'Leads no WhatsApp', descricao: 'Conversas de compradores interessados' },
  { key: 'VISITAS_LOJA', label: 'Visitas à loja', descricao: 'Atrair pessoas da região para atendimento presencial' },
  { key: 'SIMULACOES', label: 'Simulações', descricao: 'Pedidos de financiamento, troca ou proposta' },
  { key: 'TRAFEGO_SITE', label: 'Tráfego no site', descricao: 'Levar visitantes para estoque público ou página do veículo' },
];

const getLabel = (items: { key: string; label: string }[], key: string) =>
  items.find(item => item.key === key)?.label || key;

const NovoAnuncioPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  // Form state
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<IMktTemplate | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('FACEBOOK');
  const [objetivo, setObjetivo] = useState('LEADS');
  const [orcamentoDiario, setOrcamentoDiario] = useState(30);
  const [duracaoDias, setDuracaoDias] = useState(7);
  const [regiaoConfig, setRegiaoConfig] = useState<RegiaoConfig>({ tipo: 'ESTADO' });
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [publicoPerfil, setPublicoPerfil] = useState('COMPRADORES_INTENCAO');
  const [idadeMin, setIdadeMin] = useState(24);
  const [idadeMax, setIdadeMax] = useState(60);
  const [interesses, setInteresses] = useState<string[]>(INTERESSES_PADRAO.slice(0, 5));
  const [novoInteresse, setNovoInteresse] = useState('');
  const [resultadoEsperado, setResultadoEsperado] = useState('LEADS_WHATSAPP');
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: estoque } = useQuery({
    queryKey: ['estoque_simples'],
    queryFn: () => EstoqueService.getAll({ limit: 200, page: 1, statusTab: 'DISPONIVEL' }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: marketingQueryKeys.templates,
    queryFn: () => MarketingAdsService.getTemplates(),
  });

  const { data: veiculo } = useQuery({
    queryKey: ['veiculo_anuncio', selectedVeiculoId],
    queryFn: () => selectedVeiculoId ? EstoqueService.getById(selectedVeiculoId) : Promise.resolve(null),
    enabled: !!selectedVeiculoId,
  });

  const { data: empresa } = useQuery({
    queryKey: ['config_empresa_anuncio'],
    queryFn: () => EmpresaService.getDadosEmpresa(),
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ['cidades_marketing'],
    queryFn: () => CidadesService.getAll(true),
  });

  const cidadesOpcoes = useMemo(() => {
    const mapa = new Map<string, string>();
    if (empresa?.cidade) {
      mapa.set(`${empresa.cidade}/${empresa.uf || ''}`, empresa.uf ? `${empresa.cidade}/${empresa.uf}` : empresa.cidade);
    }
    cidades
      .filter(c => !empresa?.uf || c.uf === empresa.uf)
      .slice(0, 30)
      .forEach(c => mapa.set(`${c.nome}/${c.uf}`, `${c.nome}/${c.uf}`));
    return Array.from(mapa.values());
  }, [cidades, empresa?.cidade, empresa?.uf]);

  useEffect(() => {
    if (empresa?.cidade && cidadesSelecionadas.length === 0) {
      setCidadesSelecionadas([empresa.uf ? `${empresa.cidade}/${empresa.uf}` : empresa.cidade]);
    }
  }, [empresa?.cidade, empresa?.uf, cidadesSelecionadas.length]);

  // ── Mutation ──────────────────────────────────────────────────────────────

  const criarMutation = useMutation({
    mutationFn: (payload: INovoAnuncioPayload) => MarketingAdsService.createCampanha(payload),
    onSuccess: () => {
      invalidateMarketingCampanhas(queryClient);
      toast.success('Anúncio criado! Agora clique em Impulsionar para ativá-lo.');
      navigate('/marketing/anuncios');
    },
    onError: () => toast.error('Erro ao criar anúncio.'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectTemplate = (template: IMktTemplate) => {
    setSelectedTemplate(template);
    setSelectedPlatform(template.platform);
    setObjetivo(template.objetivo);
    setOrcamentoDiario(template.orcamento_diario);
    setDuracaoDias(template.duracao_dias);
    setRegiaoConfig(template.regiao_config);
    if (template.regiao_config?.cidades?.length) {
      setCidadesSelecionadas(template.regiao_config.cidades);
    }
    const publico = template.publico_config as Partial<PublicoConfig> | undefined;
    if (publico?.perfil) setPublicoPerfil(publico.perfil);
    if (publico?.faixa_etaria_min) setIdadeMin(publico.faixa_etaria_min);
    if (publico?.faixa_etaria_max) setIdadeMax(publico.faixa_etaria_max);
    if (publico?.interesses?.length) setInteresses(publico.interesses);
    if (publico?.resultado_esperado) setResultadoEsperado(publico.resultado_esperado);
  };

  const gerarNomeCampanha = (): string => {
    const partes = [];
    if (veiculo?.modelo?.nome) partes.push(veiculo.modelo.nome);
    if (veiculo?.ano_modelo) partes.push(String(veiculo.ano_modelo));
    partes.push(selectedPlatform);
    partes.push(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    return partes.join(' — ');
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedVeiculoId) {
      toast.error('Selecione um veículo.');
      return;
    }
    if (step === 2 && templates.length > 0 && !selectedTemplate) {
      toast.error('Selecione um template.');
      return;
    }
    if (step === 3 && !selectedPlatform) {
      toast.error('Selecione uma plataforma.');
      return;
    }
    if (step === 4 && !nomeCampanha) {
      setNomeCampanha(gerarNomeCampanha());
    }
    if (step === 4 && regiaoConfig.tipo === 'CIDADE' && cidadesSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma cidade.');
      return;
    }
    setStep(s => Math.min(5, s + 1) as Step);
  };

  const toggleCidade = (cidade: string) => {
    setCidadesSelecionadas(prev =>
      prev.includes(cidade) ? prev.filter(item => item !== cidade) : [...prev, cidade]
    );
    setRegiaoConfig(prev => ({ ...prev, tipo: 'CIDADE' }));
  };

  const toggleInteresse = (interesse: string) => {
    setInteresses(prev =>
      prev.includes(interesse) ? prev.filter(item => item !== interesse) : [...prev, interesse]
    );
  };

  const addInteresse = () => {
    const value = novoInteresse.trim();
    if (!value) return;
    if (!interesses.some(item => item.toLowerCase() === value.toLowerCase())) {
      setInteresses(prev => [...prev, value]);
    }
    setNovoInteresse('');
  };

  const getRegiaoPayload = (): RegiaoConfig => {
    if (regiaoConfig.tipo === 'CIDADE') {
      return { tipo: 'CIDADE', cidades: cidadesSelecionadas, estado: empresa?.uf || undefined };
    }
    return {
      ...regiaoConfig,
      estado: regiaoConfig.tipo === 'ESTADO' ? (empresa?.uf || 'SE') : undefined,
      cidades: undefined,
    };
  };

  const getPublicoPayload = (): PublicoConfig => ({
    perfil: publicoPerfil,
    faixa_etaria_min: idadeMin,
    faixa_etaria_max: idadeMax,
    interesses,
    resultado_esperado: resultadoEsperado,
  });

  const getBriefingObservacoes = () => {
    const linhas = [
      '[PRE-CONFIGURACAO ANUNCIO]',
      `Resultado esperado: ${getLabel(RESULTADOS, resultadoEsperado)}`,
      `Publico: ${getLabel(PUBLICOS, publicoPerfil)}`,
      `Faixa etaria: ${idadeMin}-${idadeMax} anos`,
      `Interesses: ${interesses.join(', ') || 'Nao informado'}`,
      `Regiao: ${regiaoConfig.tipo === 'CIDADE' ? cidadesSelecionadas.join(', ') : regiaoConfig.tipo}`,
      observacoes ? `Observacoes: ${observacoes}` : '',
    ].filter(Boolean);
    return linhas.join('\n');
  };

  const handleSubmit = () => {
    if (!selectedVeiculoId) {
      toast.error('Selecione um veículo.');
      return;
    }
    if (templates.length > 0 && !selectedTemplate) {
      toast.error('Selecione um template.');
      return;
    }
    if (!Number.isFinite(orcamentoDiario) || orcamentoDiario < 5) {
      toast.error('Informe um orçamento diário válido.');
      return;
    }
    if (!Number.isFinite(duracaoDias) || duracaoDias < 1) {
      toast.error('Informe uma duração válida.');
      return;
    }
    if (idadeMin < 18 || idadeMax < idadeMin) {
      toast.error('Revise a faixa etária do público.');
      return;
    }
    if (regiaoConfig.tipo === 'CIDADE' && cidadesSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma cidade.');
      return;
    }
    if (interesses.length === 0) {
      toast.error('Selecione pelo menos um interesse.');
      return;
    }

    const nome = nomeCampanha || gerarNomeCampanha();
    criarMutation.mutate({
      veiculo_id: selectedVeiculoId || null,
      template_id: selectedTemplate?.id ?? null,
      platform: selectedPlatform,
      nome,
      objetivo,
      orcamento_diario: orcamentoDiario,
      duracao_dias: duracaoDias,
      regiao_config: getRegiaoPayload(),
      publico_config: getPublicoPayload(),
      resultado_esperado: resultadoEsperado,
      observacoes: getBriefingObservacoes(),
    });
  };

  const totalEstimado = orcamentoDiario * duracaoDias;

  const STEPS = [
    { num: 1, label: 'Veículo' },
    { num: 2, label: 'Template' },
    { num: 3, label: 'Plataforma' },
    { num: 4, label: 'Configurar' },
    { num: 5, label: 'Revisar' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => step === 1 ? navigate('/marketing/anuncios') : setStep(s => Math.max(1, s - 1) as Step)}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Novo Anúncio</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tráfego Pago — Passo {step} de 5</p>
        </div>
      </div>

      {/* ── Steps Indicator ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              step === s.num
                ? 'bg-indigo-600 text-white shadow-md'
                : step > s.num
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s.num ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{s.num}</span>
              )}
              <span className="hidden md:block">{s.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${step > s.num ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step Content ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">

        {/* STEP 1: Veículo */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Qual veículo deseja anunciar?</h2>
            <p className="text-xs text-slate-500 mb-4">Selecione um veículo do seu estoque disponível</p>
            <MarketingVehicleSelection
              veiculos={estoque?.data || []}
              selectedId={selectedVeiculoId}
              onSelect={setSelectedVeiculoId}
            />
          </div>
        )}

        {/* STEP 2: Template */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Escolha um template de anúncio</h2>
            <p className="text-xs text-slate-500 mb-4">Templates pré-configurados para facilitar a criação</p>
            <TemplateSelector
              templates={templates}
              selectedId={selectedTemplate?.id ?? null}
              onSelect={handleSelectTemplate}
            />
          </div>
        )}

        {/* STEP 3: Plataforma */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Onde quer anunciar?</h2>
            <p className="text-xs text-slate-500 mb-6">Escolha a plataforma de anúncio pago</p>
            <div className="grid gap-3">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlatform(p.key)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    selectedPlatform === p.key
                      ? 'border-[#004691] bg-[#004691]/5 shadow'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: p.color }}>
                    {p.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900">{p.label}</p>
                    <p className="text-xs text-slate-500">
                      {p.key === 'FACEBOOK' && 'Feed, Reels, Marketplace e Messenger'}
                      {p.key === 'INSTAGRAM' && 'Feed, Stories, Reels e Explore'}
                      {p.key === 'GOOGLE' && 'Search, Display, YouTube e Discovery'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPlatform === p.key ? 'bg-[#004691] border-[#004691]' : 'border-slate-200'
                    }`}>
                      {selectedPlatform === p.key && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Configurações */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Configure o anúncio</h2>
            <p className="text-xs text-slate-500 mb-6">Ajuste objetivo, região, público, interesses e orçamento</p>

            <div className="space-y-5">
              {/* Objetivo */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Objetivo da Campanha
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map(obj => (
                    <button
                      key={obj.key}
                      onClick={() => setObjetivo(obj.key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        objetivo === obj.key
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{obj.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{obj.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultado Esperado */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Resultado Esperado
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {RESULTADOS.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setResultadoEsperado(item.key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        resultadoEsperado === item.key
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{item.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Região */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Região de Exibição
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {[
                    { tipo: 'RAIO' as const, label: 'Raio local' },
                    { tipo: 'CIDADE' as const, label: 'Cidades' },
                    { tipo: 'ESTADO' as const, label: 'Estadual' },
                    { tipo: 'NACIONAL' as const, label: 'Brasil' },
                  ].map(r => (
                    <button
                      key={r.tipo}
                      onClick={() => setRegiaoConfig({
                        tipo: r.tipo,
                        raio_km: r.tipo === 'RAIO' ? 30 : undefined,
                        estado: r.tipo === 'ESTADO' || r.tipo === 'CIDADE' ? (empresa?.uf || 'SE') : undefined,
                        cidades: r.tipo === 'CIDADE' ? cidadesSelecionadas : undefined,
                      })}
                      className={`py-2 px-3 rounded-xl border-2 text-[11px] font-black transition-all ${
                        regiaoConfig.tipo === r.tipo
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-100 text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {regiaoConfig.tipo === 'CIDADE' && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {cidadesOpcoes.map(cidade => (
                        <button
                          key={cidade}
                          onClick={() => toggleCidade(cidade)}
                          className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            cidadesSelecionadas.includes(cidade)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {cidade}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">Selecione as cidades prioritárias onde a loja deseja receber contatos.</p>
                  </div>
                )}
                {regiaoConfig.tipo === 'RAIO' && (
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-xs text-slate-600 font-bold whitespace-nowrap">Raio (km):</label>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      step={5}
                      value={regiaoConfig.raio_km ?? 30}
                      onChange={e => setRegiaoConfig({ ...regiaoConfig, raio_km: Number(e.target.value) })}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="text-sm font-black text-indigo-600 w-16 text-right">{regiaoConfig.raio_km ?? 30} km</span>
                  </div>
                )}
                {empresa?.cidade && (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    Centro: {empresa.cidade}{empresa.uf ? `, ${empresa.uf}` : ''}
                  </p>
                )}
              </div>

              {/* Público */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Público para Loja de Carros
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PUBLICOS.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setPublicoPerfil(item.key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        publicoPerfil === item.key
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className="text-xs font-black text-slate-900">{item.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Faixa etária */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Faixa Etária
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Min</span>
                    <input
                      type="number"
                      min={18}
                      max={80}
                      value={idadeMin}
                      onChange={e => setIdadeMin(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Max</span>
                    <input
                      type="number"
                      min={18}
                      max={80}
                      value={idadeMax}
                      onChange={e => setIdadeMax(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Interesses */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Interesses
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESSES_PADRAO.map(item => (
                    <button
                      key={item}
                      onClick={() => toggleInteresse(item)}
                      className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        interesses.includes(item)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    value={novoInteresse}
                    onChange={e => setNovoInteresse(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInteresse();
                      }
                    }}
                    placeholder="Adicionar interesse específico"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addInteresse}
                    className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Add
                  </button>
                </div>
                {interesses.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-2">
                    Selecionados: {interesses.join(', ')}
                  </p>
                )}
              </div>

              {/* Orçamento */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Orçamento Diário
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={orcamentoDiario}
                    onChange={e => setOrcamentoDiario(Number(e.target.value))}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[20, 30, 80, 200].map(v => (
                    <button
                      key={v}
                      onClick={() => setOrcamentoDiario(v)}
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                        orcamentoDiario === v
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duração */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Duração
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={duracaoDias}
                    onChange={e => setDuracaoDias(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-sm font-black text-indigo-600 w-20 text-right">{duracaoDias} dias</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">Gasto Total Estimado:</span>
                  <span className="text-xs font-black text-emerald-600">{MarketingAdsService.formatarMoeda(totalEstimado)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Revisão */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Revisar e Criar</h2>
            <p className="text-xs text-slate-500 mb-6">Confirme as informações antes de criar o anúncio</p>

            {/* Nome da Campanha */}
            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Nome da Campanha
              </label>
              <input
                type="text"
                value={nomeCampanha || gerarNomeCampanha()}
                onChange={e => setNomeCampanha(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Resumo */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-4">
              {veiculo && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Veículo</span>
                  <span className="text-xs font-bold text-slate-800">
                    {veiculo.montadora?.nome} {veiculo.modelo?.nome} {veiculo.ano_modelo}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Plataforma</span>
                <span className="text-xs font-bold text-slate-800">
                  {PLATFORMS.find(p => p.key === selectedPlatform)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Objetivo</span>
                <span className="text-xs font-bold text-slate-800">
                  {OBJECTIVES.find(o => o.key === objetivo)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Resultado</span>
                <span className="text-xs font-bold text-slate-800">
                  {getLabel(RESULTADOS, resultadoEsperado)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Região</span>
                <span className="text-xs font-bold text-slate-800 text-right">
                  {regiaoConfig.tipo === 'RAIO' ? `${regiaoConfig.raio_km}km local` :
                   regiaoConfig.tipo === 'CIDADE' ? cidadesSelecionadas.join(', ') :
                   regiaoConfig.tipo === 'ESTADO' ? `Estado ${empresa?.uf || ''}` : 'Nacional'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Público</span>
                <span className="text-xs font-bold text-slate-800 text-right">
                  {getLabel(PUBLICOS, publicoPerfil)} · {idadeMin}-{idadeMax} anos
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Interesses</span>
                <span className="text-xs font-bold text-slate-800 text-right">
                  {interesses.join(', ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Orçamento</span>
                <span className="text-xs font-bold text-emerald-600">
                  {MarketingAdsService.formatarMoeda(orcamentoDiario)}/dia × {duracaoDias} dias
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Estimado</span>
                <span className="text-sm font-black text-emerald-600">
                  {MarketingAdsService.formatarMoeda(totalEstimado)}
                </span>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Adicione instruções ou notas para este anúncio..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Info box */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-[11px] text-blue-700 leading-relaxed">
                <span className="font-black">Próximo passo:</span> após criar, clique em "Impulsionar" no card da campanha para abrir a plataforma {PLATFORMS.find(p => p.key === selectedPlatform)?.label} com o briefing pré-configurado.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Buttons ──────────────────────────────────────────────── */}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(s => Math.max(1, s - 1) as Step)}
            className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Voltar
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={handleNextStep}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            Próximo
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={criarMutation.isPending}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {criarMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Criar Anúncio
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default NovoAnuncioPage;

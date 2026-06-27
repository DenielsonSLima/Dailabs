import React, { useState, useEffect, useCallback } from 'react';
import { EditorSiteService } from './editor-site.service';
import { ISiteConteudo, IHeroSlide, ISobreCard } from './editor-site.types';

// ─── Toast Component ───
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-400 ${type === 'success' ? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-100' : 'bg-red-900/90 border-red-700/50 text-red-100'}`}>
      {type === 'success' ? (
        <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
};

// ─── Section Header ───
const SectionHeader: React.FC<{ icon: React.ReactNode; label: string; title: string }> = ({ icon, label, title }) => (
  <div className="flex items-center space-x-4 mb-8">
    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">{icon}</div>
    <div>
      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">{label}</p>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
    </div>
  </div>
);

// ─── Input Field ───
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number }> = ({ label, value, onChange, placeholder, multiline, rows }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows || 3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none" />
    ) : (
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
    )}
  </div>
);

const EditorSitePage: React.FC = () => {
  const [conteudo, setConteudo] = useState<ISiteConteudo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'hero' | 'sobre' | 'contato'>('hero');

  // ─── Load ───
  useEffect(() => {
    EditorSiteService.getSiteContent()
      .then(setConteudo)
      .catch(() => setToast({ message: 'Erro ao carregar conteúdo', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  // ─── Save ───
  const handleSave = useCallback(async () => {
    if (!conteudo) return;
    setSaving(true);
    try {
      const { id, updated_at, ...fields } = conteudo;
      const updated = await EditorSiteService.updateSiteContent(id, fields);
      setConteudo(updated);
      setToast({ message: 'Conteúdo salvo com sucesso!', type: 'success' });
    } catch {
      setToast({ message: 'Erro ao salvar. Tente novamente.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [conteudo]);

  // ─── Helpers para atualização do estado ───
  const update = useCallback((field: keyof ISiteConteudo, value: any) => {
    setConteudo(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const updateSlide = useCallback((index: number, field: keyof IHeroSlide, value: string) => {
    setConteudo(prev => {
      if (!prev) return prev;
      const slides = [...prev.hero_slides];
      slides[index] = { ...slides[index], [field]: value };
      return { ...prev, hero_slides: slides };
    });
  }, []);

  const addSlide = useCallback(() => {
    setConteudo(prev => {
      if (!prev) return prev;
      return { ...prev, hero_slides: [...prev.hero_slides, { title: 'Novo Slide', subtitle: 'Descrição do slide', image_url: '/slides/slide-1.jpg' }] };
    });
  }, []);

  const removeSlide = useCallback((index: number) => {
    setConteudo(prev => {
      if (!prev || prev.hero_slides.length <= 1) return prev;
      return { ...prev, hero_slides: prev.hero_slides.filter((_, i) => i !== index) };
    });
  }, []);

  const updateCard = useCallback((index: number, field: keyof ISobreCard, value: string) => {
    setConteudo(prev => {
      if (!prev) return prev;
      const cards = [...prev.sobre_cards];
      cards[index] = { ...cards[index], [field]: value };
      return { ...prev, sobre_cards: cards };
    });
  }, []);

  const updateParagrafo = useCallback((index: number, value: string) => {
    setConteudo(prev => {
      if (!prev) return prev;
      const paragrafos = [...prev.sobre_paragrafos];
      paragrafos[index] = value;
      return { ...prev, sobre_paragrafos: paragrafos };
    });
  }, []);

  const addParagrafo = useCallback(() => {
    setConteudo(prev => prev ? { ...prev, sobre_paragrafos: [...prev.sobre_paragrafos, ''] } : prev);
  }, []);

  const removeParagrafo = useCallback((index: number) => {
    setConteudo(prev => {
      if (!prev || prev.sobre_paragrafos.length <= 1) return prev;
      return { ...prev, sobre_paragrafos: prev.sobre_paragrafos.filter((_, i) => i !== index) };
    });
  }, []);

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-3 bg-slate-200 rounded animate-pulse" />
            <div className="w-48 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!conteudo) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500 font-bold">Nenhum conteúdo encontrado. Verifique a tabela site_conteudo.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'hero' as const, label: 'Banner / Hero', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'sobre' as const, label: 'Quem Somos', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: 'contato' as const, label: 'Contato', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">Gerenciador de Conteúdo</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Editor do Site</h1>
          <p className="text-slate-500 text-sm mt-1">Edite os textos, imagens e frases do site público.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Salvando...</span></>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span>Salvar Alterações</span></>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: HERO / BANNER ═══════════ */}
      {activeTab === 'hero' && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <SectionHeader
            icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label="Seção Principal"
            title="Banner / Slides do Hero"
          />

          <div className="mb-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">Origem do destaque</p>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Primeira dobra do site</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Use os slides cadastrados ou troque automaticamente pelas fotos principais dos veículos publicados no estoque.</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm min-w-[280px]">
              <button
                type="button"
                onClick={() => update('hero_source', 'slides')}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${conteudo.hero_source !== 'estoque' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Slides
              </button>
              <button
                type="button"
                onClick={() => update('hero_source', 'estoque')}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${conteudo.hero_source === 'estoque' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'}`}
              >
                Estoque
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {conteudo.hero_slides.map((slide, index) => (
              <div key={index} className="relative bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 group">
                {/* Número do slide */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-black text-indigo-700">{index + 1}</span>
                    </div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Slide {index + 1}</span>
                  </div>
                  {conteudo.hero_slides.length > 1 && (
                    <button onClick={() => removeSlide(index)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Field label="Título" value={slide.title} onChange={v => updateSlide(index, 'title', v)} placeholder="Ex: Seu Carro dos Sonhos" />
                  <Field label="URL da Imagem" value={slide.image_url} onChange={v => updateSlide(index, 'image_url', v)} placeholder="/slides/slide-1.jpg" />
                </div>
                <Field label="Subtítulo / Descrição" value={slide.subtitle} onChange={v => updateSlide(index, 'subtitle', v)} placeholder="Descrição do slide" multiline rows={2} />

                {/* Preview da imagem */}
                {slide.image_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-100">
                    <img src={slide.image_url} alt={`Preview slide ${index + 1}`} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            ))}

            <button onClick={addSlide} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-black text-slate-400 uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span>Adicionar Slide</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: QUEM SOMOS ═══════════ */}
      {activeTab === 'sobre' && (
        <div className="space-y-6">
          {/* Títulos */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <SectionHeader
              icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              label="Institucional"
              title="Seção Quem Somos"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field label="Subtítulo (badge)" value={conteudo.sobre_subtitulo} onChange={v => update('sobre_subtitulo', v)} placeholder="HCV Veículos" />
              <Field label="Título da Seção" value={conteudo.sobre_titulo} onChange={v => update('sobre_titulo', v)} placeholder="Quem Somos." />
            </div>

            <div className="mt-6">
              <Field label="URL da Imagem Institucional (Fachada)" value={conteudo.sobre_imagem_url || ''} onChange={v => update('sobre_imagem_url', v || null)} placeholder="https://... ou caminho local" />
              {conteudo.sobre_imagem_url && (
                <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-100">
                  <img src={conteudo.sobre_imagem_url} alt="Preview fachada" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>
          </div>

          {/* Parágrafos */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Parágrafos Descritivos</p>
              <button onClick={addParagrafo} className="flex items-center space-x-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                <span>Adicionar</span>
              </button>
            </div>
            <div className="space-y-4">
              {conteudo.sobre_paragrafos.map((p, i) => (
                <div key={i} className="relative group">
                  <Field label={`Parágrafo ${i + 1}`} value={p} onChange={v => updateParagrafo(i, v)} multiline rows={3} />
                  {conteudo.sobre_paragrafos.length > 1 && (
                    <button onClick={() => removeParagrafo(i)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-6">Cards de Destaque</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {conteudo.sobre_cards.map((card, i) => (
                <div key={i} className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] font-black text-indigo-700">{i + 1}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card {i + 1}</span>
                  </div>
                  <Field label="Título" value={card.titulo} onChange={v => updateCard(i, 'titulo', v)} />
                  <Field label="Descrição" value={card.descricao} onChange={v => updateCard(i, 'descricao', v)} multiline rows={2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: CONTATO ═══════════ */}
      {activeTab === 'contato' && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <SectionHeader
            icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            label="Comunicação"
            title="Seção de Contato"
          />

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Field label="Badge Superior" value={conteudo.contato_subtitulo} onChange={v => update('contato_subtitulo', v)} placeholder="Experiência Hidrocar" />
              <Field label="Título Principal" value={conteudo.contato_titulo} onChange={v => update('contato_titulo', v)} placeholder="Tradição e Segurança..." />
            </div>
            <Field label="Descrição / Texto de Apoio" value={conteudo.contato_descricao} onChange={v => update('contato_descricao', v)} multiline rows={4} />

            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4">Horários de Atendimento</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Field label="Segunda a Sexta" value={conteudo.contato_horario_semana} onChange={v => update('contato_horario_semana', v)} placeholder="08h às 17h" />
                <Field label="Sábado" value={conteudo.contato_horario_sabado} onChange={v => update('contato_horario_sabado', v)} placeholder="08h às 12h" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default EditorSitePage;

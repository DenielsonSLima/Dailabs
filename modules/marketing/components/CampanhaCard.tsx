import React from 'react';
import { IMktCampanha, MarketingAdsService, Platform, CampanhaStatus } from '../marketing-ads.service';

interface CampanhaCardProps {
  campanha: IMktCampanha;
  onImpulsionar: (campanha: IMktCampanha) => void;
  onPausar: (id: string) => void;
  onExcluir: (id: string) => void;
}

const platformIcon: Record<Platform, React.ReactNode> = {
  FACEBOOK: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  INSTAGRAM: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  GOOGLE: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  ),
};

const statusColors: Record<CampanhaStatus, string> = {
  ATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSADO: 'bg-amber-50 text-amber-700 border-amber-200',
  ENCERRADO: 'bg-slate-100 text-slate-500 border-slate-200',
  RASCUNHO: 'bg-blue-50 text-blue-700 border-blue-200',
};

const statusDot: Record<CampanhaStatus, string> = {
  ATIVO: 'bg-emerald-500 animate-pulse',
  PAUSADO: 'bg-amber-500',
  ENCERRADO: 'bg-slate-400',
  RASCUNHO: 'bg-blue-400',
};

const CampanhaCard: React.FC<CampanhaCardProps> = ({
  campanha,
  onImpulsionar,
  onPausar,
  onExcluir,
}) => {
  const color = MarketingAdsService.getPlatformColor(campanha.platform);
  const foto = campanha.creative_url || campanha.veiculo?.fotos?.[0]?.url;
  const vNome = campanha.veiculo?.modelo?.nome
    ? `${campanha.veiculo.montadora?.nome || ''} ${campanha.veiculo.modelo.nome}`.trim()
    : null;

  const diasRestantes = campanha.data_fim
    ? Math.max(0, Math.ceil((new Date(campanha.data_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group">
      <div className="flex">
        {/* Foto do Veículo */}
        <div className="w-24 h-24 flex-shrink-0 bg-slate-100 relative overflow-hidden">
          {foto ? (
            <img src={foto} alt={vNome || 'Veículo'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h.01M12 7h.01M16 7h.01M5 10.5h14l1.5 3v4H3.5v-4L5 10.5zM5 10.5l1.5-3h11l1.5 3" />
              </svg>
            </div>
          )}
          {/* Platform badge over photo */}
          <div
            className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: color }}
          >
            {platformIcon[campanha.platform]}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[campanha.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot[campanha.status]}`} />
                  {MarketingAdsService.getStatusLabel(campanha.status)}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-1 truncate">{campanha.nome}</h3>
              {vNome && (
                <p className="text-[11px] text-slate-500 truncate">{vNome} {campanha.veiculo?.ano_modelo}</p>
              )}
            </div>

            {/* Orçamento */}
            {campanha.orcamento_diario && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-emerald-600">
                  {MarketingAdsService.formatarMoeda(campanha.orcamento_diario)}
                </p>
                <p className="text-[10px] text-slate-400">por dia</p>
              </div>
            )}
          </div>

          {/* Footer Row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {diasRestantes !== null && campanha.status === 'ATIVO' && (
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {diasRestantes}d restantes
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onImpulsionar(campanha)}
                title="Impulsionar na plataforma"
                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              {campanha.status === 'ATIVO' && (
                <button
                  onClick={() => onPausar(campanha.id)}
                  title="Pausar campanha"
                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => onExcluir(campanha.id)}
                title="Excluir campanha"
                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampanhaCard;

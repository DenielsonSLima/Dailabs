import React from 'react';
import { Platform, IMktIntegracao, MarketingAdsService } from '../marketing-ads.service';

interface PlataformaConnectProps {
  platform: Platform;
  integracao?: IMktIntegracao | null;
  onConectar: (platform: Platform) => void;
  onDesconectar: (id: string) => void;
  isLoading?: boolean;
}

const platformInfo: Record<Platform, {
  nome: string;
  descricao: string;
  logo: React.ReactNode;
  gradient: string;
  bg: string;
}> = {
  FACEBOOK: {
    nome: 'Facebook Ads',
    descricao: 'Meta Ads: Feed, Reels e Marketplace',
    gradient: 'from-[#1877F2] to-[#0d5dbf]',
    bg: 'bg-[#1877F2]/10',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  INSTAGRAM: {
    nome: 'Instagram Ads',
    descricao: 'Usa a mesma conta Meta Ads do Facebook',
    gradient: 'from-[#E4405F] via-[#C13584] to-[#833AB4]',
    bg: 'bg-[#E4405F]/10',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  GOOGLE: {
    nome: 'Google Ads',
    descricao: 'Search, Display, YouTube e Discovery',
    gradient: 'from-[#4285F4] to-[#1a73e8]',
    bg: 'bg-[#4285F4]/10',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
};

const PlataformaConnect: React.FC<PlataformaConnectProps> = ({
  platform,
  integracao,
  onConectar,
  onDesconectar,
  isLoading,
}) => {
  const info = platformInfo[platform];
  const isConnected = integracao?.status === 'CONECTADO';
  const isMetaPlatform = platform === 'FACEBOOK' || platform === 'INSTAGRAM';

  return (
    <div className={`relative bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all duration-300 ${
      isConnected ? 'border-emerald-200 shadow-emerald-50' : 'border-slate-100 hover:border-slate-200'
    }`}>
      {/* Status Badge */}
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
        isConnected
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        {isConnected ? 'Conectado' : 'Desconectado'}
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${info.gradient} flex items-center justify-center text-white shadow-lg`}>
            {info.logo}
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm">{info.nome}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{info.descricao}</p>
          </div>
        </div>

        {/* Connected Info */}
        {isConnected && integracao && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isMetaPlatform ? 'Conta Meta' : 'Conta'}</span>
              <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{integracao.account_name || 'Aguardando sync'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saldo</span>
              {integracao.saldo_disponivel !== null && integracao.saldo_disponivel !== undefined ? (
                <span className="text-sm font-black text-emerald-600">
                  {MarketingAdsService.formatarMoeda(integracao.saldo_disponivel)}
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Aguardando API</span>
              )}
            </div>
            {integracao.ad_account_id && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID da Conta</span>
                <span className="text-[10px] font-mono text-slate-600">{integracao.ad_account_id}</span>
              </div>
            )}
            {integracao.updated_at && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sync</span>
                <span className="text-[10px] font-bold text-slate-500">{new Date(integracao.updated_at).toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {isConnected ? (
          <div className="flex gap-2">
            <button
              onClick={() => window.open(
                platform === 'GOOGLE' ? 'https://ads.google.com' : 'https://business.facebook.com/adsmanager',
                '_blank'
              )}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir painel
            </button>
            <button
              onClick={() => integracao && onDesconectar(integracao.id)}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <button
            onClick={() => onConectar(platform)}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r ${info.gradient} text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:opacity-90 transition-all disabled:opacity-60`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            {isMetaPlatform ? 'Conectar Meta' : 'Conectar conta'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlataformaConnect;

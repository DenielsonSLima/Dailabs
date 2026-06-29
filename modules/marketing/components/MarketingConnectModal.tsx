import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { MarketingAdsService, Platform } from '../marketing-ads.service';

interface MarketingConnectModalProps {
  platform: Platform;
  isAuthorizing?: boolean;
  onClose: () => void;
  onAuthorize: () => void;
}

const providerCopy: Record<Platform, {
  title: string;
  subtitle: string;
  action: string;
  accent: string;
  panel: string;
}> = {
  FACEBOOK: {
    title: 'Conectar Meta Ads',
    subtitle: 'Facebook e Instagram usam a mesma conta de anúncios da Meta.',
    action: 'Entrar com Facebook',
    accent: 'from-[#1877F2] to-[#0d5dbf]',
    panel: 'bg-[#1877F2]/10 text-[#1877F2]',
  },
  INSTAGRAM: {
    title: 'Conectar Meta Ads',
    subtitle: 'Instagram Ads é vinculado pelo login do Facebook/Meta Business.',
    action: 'Entrar com Facebook',
    accent: 'from-[#E4405F] via-[#C13584] to-[#833AB4]',
    panel: 'bg-[#E4405F]/10 text-[#C13584]',
  },
  GOOGLE: {
    title: 'Conectar Google Ads',
    subtitle: 'A autorização do Google lista as contas de anúncio acessíveis.',
    action: 'Entrar com Google',
    accent: 'from-[#4285F4] to-[#1a73e8]',
    panel: 'bg-[#4285F4]/10 text-[#1a73e8]',
  },
};

const MarketingConnectModal: React.FC<MarketingConnectModalProps> = ({
  platform,
  isAuthorizing = false,
  onClose,
  onAuthorize,
}) => {
  const copy = providerCopy[platform];
  const oauthConfig = MarketingAdsService.buildOAuthAuthorizationUrl(platform, false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
      style={{ width: '100vw', height: '100dvh', minHeight: '100dvh' }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className={`h-2 bg-gradient-to-r ${copy.accent}`} />
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">{copy.title}</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{copy.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${copy.panel}`}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Autorização segura</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  O ERP redireciona para a plataforma oficial. E-mail, senha, conta de anúncios e permissões são tratados pela Meta ou Google.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${copy.panel}`}>
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Dados sincronizados</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Nome, ID da conta, saldo, moeda e gastos devem vir da API após o callback de integração, sem preenchimento manual.
                </p>
              </div>
            </div>
          </div>

          {oauthConfig.missingEnv.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-amber-900">Configuração pendente</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Configure {oauthConfig.missingEnv.join(', ')} e o callback {oauthConfig.redirectUri} para liberar o redirecionamento real.
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={onAuthorize}
              disabled={isAuthorizing}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${copy.accent} py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-60`}
            >
              {isAuthorizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {copy.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MarketingConnectModal;

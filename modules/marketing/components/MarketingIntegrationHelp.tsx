import React from 'react';
import { ExternalLink, KeyRound, LockKeyhole, RefreshCw, Route, ShieldCheck, WalletCards } from 'lucide-react';

const steps = [
  {
    title: '1. A loja clica em conectar',
    description: 'O usuário é levado para o login oficial da Meta ou do Google. O ERP não pede senha e não grava login manual.',
    icon: Route,
  },
  {
    title: '2. A plataforma devolve um código',
    description: 'Depois da autorização, Meta ou Google retorna para o callback configurado com um código temporário.',
    icon: KeyRound,
  },
  {
    title: '3. O backend troca por token',
    description: 'Uma Edge Function recebe esse código e troca por tokens usando as credenciais privadas do app, longe do navegador.',
    icon: LockKeyhole,
  },
  {
    title: '4. O token fica protegido',
    description: 'O token deve ser salvo no banco de forma segura e vinculado à loja/organization_id, nunca exposto no frontend.',
    icon: ShieldCheck,
  },
  {
    title: '5. Saldo e contas sincronizam',
    description: 'Nome da conta, ID, moeda, saldo disponível, gastos e métricas passam a vir das APIs oficiais automaticamente.',
    icon: WalletCards,
  },
  {
    title: '6. O anúncio pode ser criado',
    description: 'Com token válido e API aprovada, o ERP cria campanha, conjunto, criativo e anúncio por uma chamada segura ao backend.',
    icon: RefreshCw,
  },
];

const requirements = [
  'Configurar o app da Meta com Facebook Login for Business, Marketing API e permissões de anúncios.',
  'Configurar o projeto Google Ads API com OAuth 2.0, escopo do Google Ads e developer token.',
  'Cadastrar as URLs de callback usadas pelo ERP nas plataformas Meta e Google.',
  'Criar Edge Functions para callback OAuth, sincronização de saldo e criação de campanhas.',
  'Salvar tokens com vínculo da loja e regras de segurança/RLS para uma loja não acessar dados de outra.',
];

const MarketingIntegrationHelp: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="p-6 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Ajuda da integração</p>
          <h3 className="mt-2 max-w-3xl text-2xl font-black tracking-tight">
            Como o ERP conecta Meta Ads e Google Ads sem pedir senha, saldo ou ID manual
          </h3>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-300">
            A conexão real funciona por OAuth. O usuário autoriza na tela oficial da Meta ou do Google, e o ERP usa um backend seguro para guardar tokens e sincronizar dados. Por isso o saldo deve vir da API, não de um campo preenchido à mão.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-slate-950">{step.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-black text-slate-950">O que precisa estar pronto para criar anúncios automaticamente</h4>
          <div className="mt-4 space-y-3">
            {requirements.map((item) => (
              <div key={item} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <p className="text-xs leading-relaxed text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h4 className="text-sm font-black text-amber-950">Por que não preencher saldo manualmente?</h4>
          <p className="mt-3 text-xs leading-relaxed text-amber-800">
            Saldo manual fica desatualizado e pode fazer o usuário tomar decisão errada. O correto é o backend consultar a Meta ou o Google, calcular saldo/gasto real e atualizar o ERP em sincronizações periódicas.
          </p>
          <div className="mt-4 rounded-2xl bg-white/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-900">Variáveis esperadas no frontend</p>
            <p className="mt-2 text-xs font-mono text-amber-900">VITE_META_APP_ID</p>
            <p className="mt-1 text-xs font-mono text-amber-900">VITE_GOOGLE_ADS_CLIENT_ID</p>
            <p className="mt-3 text-xs leading-relaxed text-amber-800">
              As chaves secretas, refresh tokens e developer token não devem ficar no frontend. Eles pertencem ao backend/Edge Functions.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-sm font-black text-sky-950">Referência técnica</h4>
            <p className="mt-1 text-xs leading-relaxed text-sky-800">
              O Google Ads API usa OAuth 2.0 para autorização, permitindo acesso sem manipular dados de login do usuário. A Meta segue o mesmo desenho de autorização via login oficial para anúncios.
            </p>
          </div>
          <a
            href="https://developers.google.com/google-ads/api/docs/oauth/overview"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-sky-700"
          >
            <ExternalLink className="h-4 w-4" />
            Google OAuth
          </a>
        </div>
      </div>
    </div>
  );
};

export default MarketingIntegrationHelp;

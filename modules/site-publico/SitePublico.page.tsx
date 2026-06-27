import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SitePublicoService } from './site-publico.service';
import { AnalyticsService } from './analytics.service';
import { IEmpresa } from '../ajustes/empresa/empresa.types';

// Componentes corrigidos conforme nomes reais dos arquivos
import PublicNavbar from './components/PublicNavbar';
import PublicHero from './components/PublicHero';
import PublicBrands from './components/PublicBrands';
import RecentVehicles from './components/RecentVehicles';
import AboutUs from './components/AboutUs';
import PublicContact from './components/PublicContact';
import PublicFooter from './components/PublicFooter';
import LazyMap from './components/LazyMap';
import PublicHomeSkeleton from './components/PublicHomeSkeleton';
import { setSEO, setDealerJsonLd, removeJsonLd } from './utils/seo';

const SitePublicoPage: React.FC = () => {
  const queryClient = useQueryClient();

  // TanStack Query: Substitui useState + useEffect
  const { data, isLoading } = useQuery({
    queryKey: ['site_publico_home'],
    queryFn: () => SitePublicoService.getHomePageData(),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  // Realtime: Invalida o cache do TanStack Query em vez de chamar load() manualmente
  useEffect(() => {
    const subscription = SitePublicoService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['site_publico_home'] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // SEO dinâmico: atualiza título, meta tags e JSON-LD quando os dados da empresa carregam
  useEffect(() => {
    const empresa = data?.empresa;
    const nome = empresa?.nome_fantasia || 'Souza Veículos';
    const cidade = empresa?.cidade || 'Aracaju';
    const uf = empresa?.uf || 'SE';
    const telefone = empresa?.telefone || '';
    const logoUrl = empresa?.logo_url || `${window.location.origin}/logos/souza-veiculos-logo.png`;

    setSEO({
      title: 'Souza Veículos',
      description: `Encontre veículos selecionados com procedência comprovada na ${nome}. Referência em ${cidade}/${uf} para quem busca exclusividade e qualidade.`,
      url: window.location.origin
    });

    setDealerJsonLd({
      name: nome,
      description: `Loja de veículos selecionados com procedência comprovada em ${cidade}/${uf}.`,
      url: window.location.origin,
      phone: telefone.replace(/\D/g, '') ? `+55${telefone.replace(/\D/g, '')}` : undefined,
      address: {
        street: empresa?.logradouro ? `${empresa.logradouro}, ${empresa.numero}` : undefined,
        city: cidade,
        state: uf,
        zip: empresa?.cep,
      },
      image: logoUrl,
    });

    return () => {
      removeJsonLd();
    };
  }, [data?.empresa]);

  // Rastreamento de Acesso
  useEffect(() => {
    if (data?.empresa?.organization_id) {
      AnalyticsService.trackVisit({
        organization_id: data.empresa.organization_id,
        page_path: window.location.pathname
      });
    }
  }, [data?.empresa?.organization_id]);

  return (
    <div className="min-h-screen bg-white font-['Inter'] scroll-smooth antialiased">
      {/* Menu de Navegação Superior */}
      <PublicNavbar empresa={data?.empresa || {} as IEmpresa} />

      <main>
        {/* Hero Section */}
        <PublicHero
          slides={data?.conteudo?.hero_slides}
          veiculos={data?.veiculos || []}
          source={data?.conteudo?.hero_source || 'slides'}
        />

        {isLoading ? (
          <PublicHomeSkeleton />
        ) : (
          <>
            {/* Vitrine de Marcas */}
            <PublicBrands montadoras={data?.montadoras || []} />

            {/* Últimos Veículos */}
            <RecentVehicles veiculos={data?.veiculos || []} />
          </>
        )}

        {/* Seções Institucionais */}
        <AboutUs
          subtitulo={data?.conteudo?.sobre_subtitulo}
          titulo={data?.conteudo?.sobre_titulo}
          paragrafos={data?.conteudo?.sobre_paragrafos}
          imagemUrl={data?.conteudo?.sobre_imagem_url}
          cards={data?.conteudo?.sobre_cards}
        />

        {/* Contatos Imersivo */}
        <PublicContact
          telefone={data?.empresa?.telefone}
          contato_titulo={data?.conteudo?.contato_titulo}
          contato_subtitulo={data?.conteudo?.contato_subtitulo}
          contato_descricao={data?.conteudo?.contato_descricao}
          contato_horario_semana={data?.conteudo?.contato_horario_semana}
          contato_horario_sabado={data?.conteudo?.contato_horario_sabado}
        />

        {/* Localização - Espaçamentos reduzidos e Mapa Satélite Restaurado */}
        <section id="localizacao" className="pt-12 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center mb-6">
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-[0.6em] mb-2">Nossa Localização</p>
            <h2 className="text-4xl font-[900] text-slate-900 uppercase tracking-tighter leading-none">
              {data?.empresa?.cidade || 'Aracaju'} / {data?.empresa?.uf || 'SE'}
            </h2>
          </div>

          {/* Container do Mapa: Borda a Borda em Modo Satélite Real */}
          <div className="w-full h-[350px] bg-slate-100 relative group overflow-hidden border-y border-slate-100">
            <LazyMap
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                data?.empresa?.logradouro 
                  ? `${data.empresa.logradouro}, ${data.empresa.numero}, ${data.empresa.bairro}, ${data.empresa.cidade} - ${data.empresa.uf}`
                  : 'Rua Lions Club, 526, Atalaia, Aracaju - SE'
              )}&z=17&t=k&output=embed`}
              title={`Localização ${data?.empresa?.nome_fantasia || 'Souza Veículos'}`}
            />
            <div className="absolute bottom-6 right-6 pointer-events-none bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">{data?.empresa?.nome_fantasia || 'Souza Veículos'}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <PublicFooter empresa={data?.empresa || {} as IEmpresa} />
    </div >
  );
};

export default SitePublicoPage;

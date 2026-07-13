import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IHeroSlide, HeroSource } from '../../editor-site/editor-site.types';
import { IVeiculoPublic } from '../site-publico.types';
import { formatCurrency } from '../utils/currency';

// Slides padrão (fallback se não houver dados do banco)
const DEFAULT_SLIDES: IHeroSlide[] = [
  {
    image_url: '/hero/banner-1.jpg',
    title: 'A EXPERIÊNCIA DEFINITIVA EM SEMINOVOS',
    subtitle: 'Curadoria rigorosa e transparência absoluta. Onde a confiança encontra o seu próximo carro em Aracaju.'
  },
  {
    image_url: '/hero/banner-souza.webp',
    title: 'NEGOCIAÇÃO INTELIGENTE E SEM BUROCRACIA',
    subtitle: 'Seu usado vale mais aqui. Financiamento acelerado com as taxas mais competitivas do mercado sergipano.'
  },
  {
    image_url: '/hero/banner-3.jpg',
    title: 'PADRÃO SOUZA DE EXCELÊNCIA',
    subtitle: 'Mais que uma venda, um compromisso com a procedência. Cada detalhe verificado por quem entende de verdade.'
  }
];

interface Props {
  slides?: IHeroSlide[];
  veiculos?: IVeiculoPublic[];
  source?: HeroSource;
}

interface IHeroDisplaySlide extends IHeroSlide {
  badge?: string;
  ctaLabel?: string;
  href?: string;
  brandLogo?: string;
  price?: number;
  valor_promocional?: number;
  specs?: string[];
}

/**
 * Função de limpeza reforçada para garantir que nenhum vestígio da marca antiga apareça.
 * Converte "Hidrocar" ou "HCV" para "Souza Veículos" ou "Souza".
 */
const cleanBranding = (text: string) => {
  if (!text) return text;
  return text
    .replace(/Hidrocar Veículos/gi, 'Souza Veículos')
    .replace(/Hidrocar/gi, 'Souza')
    .replace(/HCV/gi, 'Souza');
};

const getMainPhotoUrl = (veiculo: IVeiculoPublic) => {
  const fotos = [...(veiculo.fotos || [])];
  fotos.sort((a, b) => {
    if (a.is_capa !== b.is_capa) return a.is_capa ? -1 : 1;
    return (a.ordem || 0) - (b.ordem || 0);
  });
  return fotos[0]?.url || '';
};

const buildVehicleSlide = (veiculo: IVeiculoPublic): IHeroDisplaySlide | null => {
  const imageUrl = getMainPhotoUrl(veiculo);
  if (!imageUrl) return null;

  const nome = [veiculo.montadora?.nome, veiculo.modelo?.nome].filter(Boolean).join(' ');
  const versao = [veiculo.versao?.nome, veiculo.motorizacao].filter(Boolean).join(' ');

  return {
    image_url: imageUrl,
    title: nome || 'Veículo em Destaque',
    subtitle: versao || '',
    badge: 'Destaque do Estoque',
    ctaLabel: 'Ver Veículo',
    href: `/veiculo/${veiculo.id}`,
    brandLogo: veiculo.montadora?.logo_url || '',
    price: veiculo.valor_venda,
    valor_promocional: veiculo.valor_promocional,
    specs: [
      `${veiculo.ano_fabricacao}/${veiculo.ano_modelo}`,
      veiculo.km === 0 ? 'Zero Km' : `${(veiculo.km || 0).toLocaleString('pt-BR')} km`,
      veiculo.transmissao,
      veiculo.combustivel
    ].filter(Boolean)
  };
};

const PublicHero: React.FC<Props> = ({ slides: propSlides, veiculos = [], source = 'slides' }) => {
  const slides = useMemo(() => {
    const vehicleSlides = source === 'estoque'
      ? veiculos.map(buildVehicleSlide).filter(Boolean).slice(0, 5) as IHeroDisplaySlide[]
      : [];

    const rawSlides: IHeroDisplaySlide[] = vehicleSlides.length > 0
      ? vehicleSlides
      : ((propSlides && propSlides.length > 0 ? propSlides : DEFAULT_SLIDES) as IHeroDisplaySlide[]);

    return rawSlides.map(s => ({
      ...s,
      title: cleanBranding(s.title),
      subtitle: cleanBranding(s.subtitle),
      badge: s.badge || 'Souza Veículos • Veículos Premium',
      ctaLabel: s.ctaLabel || 'Ver Estoque',
      href: s.href || '#estoque'
    }));
  }, [propSlides, source, veiculos]);

  const [current, setCurrent] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    setCurrent(0);
    setLoadedSlides(new Set([0]));
  }, [slides]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % slides.length;
        setLoadedSlides(s => new Set(s).add(next));
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Pre-carrega o próximo slide
  useEffect(() => {
    const nextIndex = (current + 1) % slides.length;
    setLoadedSlides(s => new Set(s).add(nextIndex));
  }, [current, slides.length]);

  const handleDotClick = useCallback((i: number) => {
    setCurrent(i);
    setLoadedSlides(s => new Set(s).add(i));
  }, []);

  return (
    <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      {slides.map((slide, index) => {
        // Só renderiza o slide se já foi carregado (lazy)
        const shouldRender = loadedSlides.has(index);
        return (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === current ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={index !== current}
          >
            {shouldRender && (
              <>
                <img
                  src={slide.image_url}
                  className="absolute inset-0 w-full h-full object-cover"
                  alt={slide.title}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding={index === 0 ? 'sync' : 'async'}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                />
                {/* Névoa Marinho Black */}
                <div className="absolute inset-0 bg-slate-950/40"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#050a14]/80 via-transparent to-transparent"></div>

                {/* Texto posicionado na parte inferior para não cobrir os carros */}
                <div className="absolute inset-0 z-10 flex items-end pb-20">
                  <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className={`max-w-2xl transition-all duration-1000 ${index === current ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
                      <div className="bg-slate-950/75 border border-white/15 backdrop-blur-md rounded-2xl p-6 md:p-8 space-y-4 md:space-y-5 shadow-2xl">
                        
                        {/* Cabeçalho da Ficha */}
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.4em]">{slide.badge}</p>
                          {slide.brandLogo && (
                            <div className="w-12 h-12 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-lg border border-white/20">
                              <img src={slide.brandLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                          )}
                        </div>

                        {/* Nome do Carro */}
                        <div className="space-y-1">
                          <h1 className="text-3xl md:text-4xl font-[950] text-white leading-none tracking-tighter uppercase">
                            {slide.title}
                          </h1>
                          {slide.price && slide.subtitle && (
                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest pt-1">
                              {slide.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Ficha técnica em Tags */}
                        {slide.specs && slide.specs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {slide.specs.map((spec, sIdx) => (
                              <span key={sIdx} className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-wider border border-white/5">
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Se não for veículo, exibe o subtítulo normal */}
                        {!slide.price && (
                          <p className="text-base text-white/90 font-medium leading-relaxed">
                            {slide.subtitle}
                          </p>
                        )}

                        {/* Rodapé com Preço e Ação */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10">
                          {slide.price ? (
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Veículo</p>
                              <div className="flex items-baseline space-x-2">
                                <span className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                                  {formatCurrency(slide.valor_promocional || slide.price)}
                                </span>
                                {slide.valor_promocional && slide.valor_promocional < slide.price && (
                                  <span className="text-sm line-through text-slate-400 font-bold">
                                    {formatCurrency(slide.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : <div />}
                          
                          <a href={slide.href} className="inline-block px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all text-center">
                            {slide.ctaLabel}
                          </a>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Pagination Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            className={`h-1 rounded-full transition-all duration-500 ${i === current ? 'w-12 bg-white' : 'w-4 bg-white/30'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default React.memo(PublicHero);

import { z } from 'zod';

// ─── Slide do Hero ───
export interface IHeroSlide {
    title: string;
    subtitle: string;
    image_url: string;
}

export type HeroSource = 'slides' | 'estoque';

export const HeroSlideSchema = z.object({
    title: z.string(),
    subtitle: z.string(),
    image_url: z.string(),
});

// ─── Card de Destaque ───
export interface ISobreCard {
    titulo: string;
    descricao: string;
}

export const SobreCardSchema = z.object({
    titulo: z.string(),
    descricao: z.string(),
});

// ─── Conteúdo do Site ───
export interface ISiteConteudo {
    id: string;
    hero_source: HeroSource;
    hero_slides: IHeroSlide[];
    sobre_titulo: string;
    sobre_subtitulo: string;
    sobre_paragrafos: string[];
    sobre_imagem_url: string | null;
    sobre_cards: ISobreCard[];
    contato_titulo: string;
    contato_subtitulo: string;
    contato_descricao: string;
    contato_horario_semana: string;
    contato_horario_sabado: string;
    updated_at?: string;
}

export const SiteConteudoSchema = z.object({
    id: z.string(),
    hero_source: z.enum(['slides', 'estoque']).default('slides'),
    hero_slides: z.array(HeroSlideSchema).default([]),
    sobre_titulo: z.string().default('Quem Somos.'),
    sobre_subtitulo: z.string().default('HCV Veículos'),
    sobre_paragrafos: z.array(z.string()).default([]),
    sobre_imagem_url: z.string().nullable().default(null),
    sobre_cards: z.array(SobreCardSchema).default([]),
    contato_titulo: z.string().default('Tradição e Segurança em Cada Negociação'),
    contato_subtitulo: z.string().default('Experiência Hidrocar'),
    contato_descricao: z.string().default(''),
    contato_horario_semana: z.string().default('08h às 17h'),
    contato_horario_sabado: z.string().default('08h às 12h'),
    updated_at: z.string().optional(),
});

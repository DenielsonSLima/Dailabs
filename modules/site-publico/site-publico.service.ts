import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import {
  IPublicPageData,
  IMontadoraPublic,
  IGetStockParams,
  IPaginatedStock,
  IVeiculoPublic,
  VeiculoPublicSchema,
  MontadoraPublicSchema,
  PublicPageDataSchema,
  PaginatedStockSchema,
  ISiteConteudo,
} from './site-publico.types';
import { SiteConteudoSchema } from '../editor-site/editor-site.types';
import { IEmpresa, EmpresaSchema } from '../ajustes/empresa/empresa.types';

// ─── Select padrão para veículos (evita duplicação) ───
const VEICULO_SELECT = `
  id, placa, chassi, renavam, km, ano_fabricacao, ano_modelo, portas, 
  combustivel, transmissao, motorizacao, valor_venda, valor_promocional, 
  status, fotos, caracteristicas_ids, opcionais_ids, observacoes, created_at,
  montadora_id, modelo_id, versao_id, tipo_veiculo_id, cor_id,
  montadora:cad_montadoras(id, nome, logo_url),
  modelo:cad_modelos(nome),
  versao:cad_versoes(nome),
  tipo_veiculo:cad_tipos_veiculos(nome)
`;

const DEFAULT_EMPRESA: IEmpresa = {
  cnpj: '00.000.000/0000-00',
  razao_social: 'Empresa Não Configurada',
  nome_fantasia: 'Souza Veículos',
  cep: '49000-000',
  logradouro: 'Rua Lions Club',
  numero: '526',
  bairro: 'Atalaia',
  cidade: 'Aracaju',
  uf: 'SE',
  telefone: '(79) 99119-2361'
};

let resolvedOrgId: string | null | undefined = undefined;

export const SitePublicoService = {

  // Resolve o ID da organização de forma assíncrona, com cache e fallback
  async getResolvedOrgId(): Promise<string | null> {
    if (resolvedOrgId !== undefined) {
      return resolvedOrgId;
    }
    const envOrgId = (import.meta.env.VITE_ORGANIZATION_ID as string) || null;
    if (envOrgId) {
      resolvedOrgId = envOrgId;
      return envOrgId;
    }
    try {
      const { data, error } = await supabase
        .from('config_empresa')
        .select('organization_id')
        .limit(1)
        .maybeSingle();

      if (!error && data?.organization_id) {
        resolvedOrgId = data.organization_id;
        return data.organization_id;
      }
    } catch (e) {
      console.error('Erro ao resolver orgId de fallback:', e);
    }
    resolvedOrgId = null;
    return null;
  },

  /**
   * Retorna o ID da organização para o site público.
   * Prioriza a variável de ambiente VITE_ORGANIZATION_ID.
   */
  getPublicOrgId(): string | null {
    return (import.meta.env.VITE_ORGANIZATION_ID as string) || null;
  },

  /**
   * Busca dados da empresa com fallback para evitar crashes.
   */
  async getEmpresa(): Promise<IEmpresa> {
    try {
      const orgId = await this.getResolvedOrgId();
      let query = supabase.from('config_empresa').select('*');
      
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data: empresa, error } = await query
        .limit(1)
        .maybeSingle();

      if (error || !empresa) {
        return DEFAULT_EMPRESA;
      }

      // Tenta validar; se falhar por campos faltantes, mescla com o padrão de forma segura para manter o site no ar
      try {
        return EmpresaSchema.parse(empresa);
      } catch (zodErr) {
        console.warn('Dados da empresa incompletos no banco. Usando mesclagem segura com valores padrão.');
        const merged = { ...DEFAULT_EMPRESA };
        Object.keys(empresa).forEach(key => {
          const val = (empresa as any)[key];
          if (val !== null && val !== undefined && val !== '') {
            (merged as any)[key] = val;
          }
        });
        return merged as IEmpresa;
      }
    } catch {
      return DEFAULT_EMPRESA;
    }
  },

  /**
   * Busca montadoras que possuem veículos disponíveis no site de forma otimizada.
   */
  async getMontadorasComEstoque(): Promise<IMontadoraPublic[]> {
    const orgId = await this.getResolvedOrgId();
    
    let query = supabase
      .from('cad_montadoras')
      .select(`
        id, 
        nome, 
        logo_url,
        est_veiculos!inner(id, organization_id)
      `)
      .eq('est_veiculos.publicado_site', true);

    if (orgId) {
      query = query.eq('est_veiculos.organization_id', orgId);
    }

    const { data: montadorasComEstoque, error } = await query;

    if (error) {
      console.error('Erro ao buscar montadoras com estoque:', error);
      return [];
    }

    if (!montadorasComEstoque) return [];

    // Mapeia para o formato esperado pelo schema
    const rawResult = montadorasComEstoque.map(m => ({
      id: m.id,
      nome: m.nome,
      logo_url: m.logo_url || '',
      total_veiculos: (m.est_veiculos as any[]).length
    })).sort((a, b) => a.nome.localeCompare(b.nome));

    return z.array(MontadoraPublicSchema).parse(rawResult) as IMontadoraPublic[];
  },

  /**
   * Busca estoque paginado com filtros.
   */
  async getStockData(params: IGetStockParams): Promise<IPaginatedStock> {
    const { page, pageSize, brand, minPrice, maxPrice, search, sort, includeMontadoras = true } = params;
    const orgId = await this.getResolvedOrgId();

    let query = supabase
      .from('est_veiculos')
      .select(VEICULO_SELECT, { count: 'exact' })
      .eq('publicado_site', true);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    if (brand) query = query.eq('montadora_id', brand);
    if (minPrice) query = query.gte('valor_venda', minPrice);
    if (maxPrice) query = query.lte('valor_venda', maxPrice);

    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '');
      if (sanitized.length > 0) {
        const [modelosResult, montadorasResult] = await Promise.all([
          supabase.from('cad_modelos').select('id').ilike('nome', `%${sanitized}%`),
          supabase.from('cad_montadoras').select('id').ilike('nome', `%${sanitized}%`)
        ]);

        const modeloIds = (modelosResult.data || []).map(m => m.id);
        const montadoraIds = (montadorasResult.data || []).map(m => m.id);

        const orFilters: string[] = [`placa.ilike.%${sanitized}%`];
        if (modeloIds.length > 0) {
          orFilters.push(`modelo_id.in.(${modeloIds.join(',')})`);
        }
        if (montadoraIds.length > 0) {
          orFilters.push(`montadora_id.in.(${montadoraIds.join(',')})`);
        }

        query = query.or(orFilters.join(','));
      }
    }

    if (sort === 'preco_asc') {
      query = query.order('valor_venda', { ascending: true });
    } else if (sort === 'preco_desc') {
      query = query.order('valor_venda', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [queryResult, montadoras] = await Promise.all([
      query.range(from, to),
      includeMontadoras ? this.getMontadorasComEstoque() : Promise.resolve(undefined)
    ]);

    if (queryResult.error) {
      console.error('Erro ao buscar estoque paginado:', queryResult.error);
      throw queryResult.error;
    }

    const rawResult = {
      veiculos: queryResult.data || [],
      total: queryResult.count || 0,
      page,
      pageSize,
      montadoras
    };

    return PaginatedStockSchema.parse(rawResult) as IPaginatedStock;
  },

  /**
   * Busca conteúdo editável do site (singleton).
   */
  async getSiteConteudo(): Promise<ISiteConteudo | null> {
    try {
      const orgId = await this.getResolvedOrgId();
      let query = supabase.from('site_conteudo').select('*');

      if (orgId) {
        // Se tem ID, busca o específico ou o padrão (null) como fallback
        query = query.or(`organization_id.eq.${orgId},organization_id.is.null`).order('organization_id', { ascending: false, nullsFirst: false });
      }

      const { data, error } = await query
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar conteúdo do site:', error);
        return null;
      }

      return data ? SiteConteudoSchema.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Dados da home page modularizados.
   * Cada parte é carregada e validada de forma independente para garantir resiliência.
   */
  async getHomePageData(): Promise<IPublicPageData> {
    const orgId = await this.getResolvedOrgId();

    let veiculosQuery = supabase
      .from('est_veiculos')
      .select(VEICULO_SELECT)
      .eq('publicado_site', true);

    if (orgId) {
      veiculosQuery = veiculosQuery.eq('organization_id', orgId);
    }

    const [empresaRaw, veiculosResult, montadoras, conteudo] = await Promise.all([
      this.getEmpresa().catch((err) => {
        console.error('Falha ao carregar empresa na home:', err);
        return {} as IEmpresa;
      }),
      veiculosQuery
        .order('created_at', { ascending: false })
        .limit(8),
      this.getMontadorasComEstoque().catch(() => []),
      this.getSiteConteudo().catch(() => null)
    ]);

    // Validação individual de veículos para evitar crash total se um registro estiver corrompido
    const veiculosValidados = (veiculosResult.data || []).map(v => {
      try {
        return VeiculoPublicSchema.parse(v);
      } catch (err) {
        console.error('Erro ao validar veículo individual na home:', v.id, err);
        return null;
      }
    }).filter(Boolean) as IVeiculoPublic[];

    return {
      empresa: empresaRaw,
      veiculos: veiculosValidados,
      montadoras: montadoras || [],
      conteudo: conteudo
    };
  },

  /**
   * Busca um veículo específico por ID.
   */
  async getVeiculoDetails(id: string): Promise<{
    veiculo: IVeiculoPublic | null;
    caracteristicas: { id: string; nome: string }[];
    opcionais: { id: string; nome: string }[];
    cores: { id: string; nome: string; rgb_hex: string }[];
    empresa: IEmpresa;
  }> {
    const orgId = await this.getResolvedOrgId();
    let veiculoQuery = supabase
      .from('est_veiculos')
      .select(VEICULO_SELECT)
      .eq('id', id);

    if (orgId) {
      veiculoQuery = veiculoQuery.eq('organization_id', orgId);
    }

    const [veiculoResult, caracResult, opResult, coresResult, empresaRaw] = await Promise.all([
      veiculoQuery.maybeSingle(),
      supabase.from('cad_caracteristicas').select('id, nome'),
      supabase.from('cad_opcionais').select('id, nome'),
      supabase.from('cad_cores').select('id, nome, rgb_hex'),
      this.getEmpresa().catch(() => ({} as IEmpresa))
    ]);

    if (veiculoResult.error) {
      console.error('Erro ao buscar detalhes do veículo:', veiculoResult.error);
      throw veiculoResult.error;
    }

    let veiculoValidado: IVeiculoPublic | null = null;
    if (veiculoResult.data) {
      try {
        veiculoValidado = VeiculoPublicSchema.parse(veiculoResult.data) as IVeiculoPublic;
      } catch (err) {
        if (err instanceof z.ZodError) {
          console.error('Erro de validação no detalhe do veículo:', err.issues);
        }
        throw err;
      }
    }

    return {
      veiculo: veiculoValidado,
      caracteristicas: caracResult.data || [],
      opcionais: opResult.data || [],
      cores: coresResult.data || [],
      empresa: empresaRaw
    };
  },

  subscribe(onUpdate: () => void) {
    return supabase
      .channel('site_publico_estoque_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'est_veiculos' }, () => onUpdate())
      .subscribe();
  }
};

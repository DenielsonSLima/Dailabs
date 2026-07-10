/**
 * Auto-preenchimento de veículo via consulta de placa (API Brasil).
 * Faz parsing inteligente do retorno da API e busca/sugere cadastros existentes.
 */

import { consultaPlacaService, VeiculoConsultaReponse } from '../../ajustes/consulta-placa/consulta-placa.service';
import { MontadorasService } from '../../cadastros/montadoras/montadoras.service';
import { TiposVeiculosService } from '../../cadastros/tipos-veiculos/tipos-veiculos.service';
import { ModelosService } from '../../cadastros/modelos/modelos.service';
import { VersoesService } from '../../cadastros/versoes/versoes.service';
import { CoresService } from '../../cadastros/cores/cores.service';
import { IMontadora } from '../../cadastros/montadoras/montadoras.types';
import { ITipoVeiculo } from '../../cadastros/tipos-veiculos/tipos-veiculos.types';
import { IModelo } from '../../cadastros/modelos/modelos.types';

// ============================================================
// TIPOS
// ============================================================

export interface DadosParsedAPI {
  // Dados brutos da API
  raw: VeiculoConsultaReponse;

  // Dados parseados
  marcaNome: string;
  modeloNome: string;
  versaoNome: string;
  motorizacaoSugerida: string; // ex: "1.4"
  combustivel: string;         // ex: "FLEX"
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  chassi: string;
  placa: string;
  valorFipe: number;

  // IDs encontrados (null se não existir no banco)
  montadora: IMontadora | null;
  tipoVeiculo: ITipoVeiculo | null;
  modelo: IModelo | null;
  corId: string | null;

  // Informações de Categoria
  categoriaSugerida: 'carro' | 'moto' | 'outros';

  // Informações de Custo
  consultasRestantes: number;

  // Flags para o wizard
  precisaCriarMontadora: boolean;
  precisaConfirmarTipo: boolean; // sempre true (API não diferencia SEDAN/HATCH/PICKUP)
  precisaCriarModelo: boolean;
}

// ============================================================
// MAPEAMENTOS
// ============================================================

const COMBUSTIVEL_MAP: Record<string, string> = {
  'flex': 'FLEX',
  'gasolina': 'GASOLINA',
  'etanol': 'ETANOL',
  'diesel': 'DIESEL',
  'eletrico': 'ELÉTRICO',
  'hibrido': 'HÍBRIDO',
  'gnv': 'GNV',
  'alcool': 'ETANOL',
};

/**
 * Normaliza combustível da API para o padrão do ERP.
 */
function mapCombustivel(apiCombustivel: string): string {
  const lower = apiCombustivel?.toLowerCase().trim() || '';
  return COMBUSTIVEL_MAP[lower] || apiCombustivel?.toUpperCase() || 'FLEX';
}

// ============================================================
// PARSING INTELIGENTE DE MODELO / VERSÃO / MOTORIZAÇÃO
// ============================================================

interface ParsedModelo {
  modelo: string;
  versao: string;
  motorizacao: string;
}

/**
 * Separa o string bruto da API em modelo, versão e motorização.
 * Ex: "Strada Endurance 1.4 Flex 8V CS Plus"
 *   → modelo: "STRADA", versão: "ENDURANCE CS PLUS", motor: "1.4"
 * 
 * Estratégia:
 * 1. Tenta match com modelos existentes da montadora
 * 2. Se não achar, usa a 1ª palavra como modelo
 * 3. Extrai motorização via regex (X.X)
 * 4. Remove combustível e motorização do restante = versão
 */
function parseModeloVersao(
  rawModelo: string,
  modelosExistentes: IModelo[],
  combustivelAPI: string
): ParsedModelo {
  // 0. Normalização inicial: Adiciona espaço entre letras e números (ex: RENEGADE1.8 -> RENEGADE 1.8)
  const normalized = rawModelo.toUpperCase().trim()
    .replace(/([A-Z])(\d+\.\d+)/g, '$1 $2') // Letra seguida de decimal
    .replace(/(\d+\.\d+)([A-Z])/g, '$1 $2'); // Decimal seguido de letra

  const words = normalized.split(/\s+/);

  // 1. Extrair motorização (padrão X.X)
  const motorRegex = /(\d+\.\d+)/;
  const motorMatch = normalized.match(motorRegex);
  const motorizacaoValue = motorMatch ? motorMatch[1] : '';

  let modeloNome = '';
  let restante = '';

  // 2. Tentar match com modelos existentes (prioridade)
  const modeloEncontrado = modelosExistentes.find(m => {
    const nomeUpper = m.nome.toUpperCase().trim();
    return normalized.startsWith(nomeUpper + ' ') || normalized === nomeUpper;
  });

  if (modeloEncontrado) {
    modeloNome = modeloEncontrado.nome.toUpperCase();
    restante = normalized.slice(modeloNome.length).trim();
  } else {
    // Se não achar no banco, a primeira palavra é o modelo (ajustado para não pegar a motorização)
    modeloNome = words[0];
    restante = words.slice(1).join(' ');
  }

  // 3. Limpar a versão: remover motorização, combustível e termos técnicos
  const combustivelUpper = combustivelAPI.toUpperCase();
  const palavrasRemover = [
    motorizacaoValue,
    combustivelUpper,
    'FLEX', 'GASOLINA', 'DIESEL', 'ETANOL', 'ELÉTRICO', 'HÍBRIDO', 'GNV',
    '8V', '16V', '24V', '4X2', '4X4', 'TURBO', 'BITURBO', 'AUT', 'AUTOMÁTICO', 'AUTOMATICO', 'MANUAL', 'TSI', 'MPI', 'MSI', 'V6', 'V8'
  ];

  let versionWords = restante.split(/\s+/).filter(p => {
    return p && !palavrasRemover.includes(p) && p !== modeloNome;
  });

  // Se a versão ficou vazia mas temos o "restante", tentamos usá-lo se não for apenas lixo
  let versaoNome = versionWords.join(' ').trim();
  if (!versaoNome && restante) {
     const candidate = restante.replace(motorizacaoValue, '').trim();
     if (candidate && !palavrasRemover.includes(candidate)) {
       versaoNome = candidate;
     }
  }

  return {
    modelo: modeloNome,
    versao: versaoNome || 'BÁSICA',
    motorizacao: motorizacaoValue,
  };
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

/**
 * Consulta a placa na API Brasil e faz o parsing dos dados
 * retornando tudo preparado para o fluxo wizard.
 */
export async function consultarEParsear(placa: string): Promise<DadosParsedAPI> {
  // 1. Consultar API
  const apiResponse = await consultaPlacaService.consultar(placa);

  // Pegar o resultado principal
  const resultadosFipe = apiResponse.data?.resultados || apiResponse.data?.data || [];
  const resultadoPrincipal = resultadosFipe.find(r => r.principal) || resultadosFipe[0];
  const dadosVeiculo = apiResponse.data?.veiculo || {};

  if (!resultadoPrincipal) {
    throw new Error('Nenhum resultado encontrado para esta placa.');
  }

  const principal = {
    ...resultadoPrincipal,
    chassi: resultadoPrincipal.chassi || dadosVeiculo.chassi || '',
    cor: resultadoPrincipal.cor || dadosVeiculo.cor || '',
    combustivel: resultadoPrincipal.combustivel || dadosVeiculo.combustivel || '',
  };

  let marcaNome = principal.marca.toUpperCase().trim();
  // Normalizar marcas conhecidas que vêm com prefixo na API Brasil
  // Exemplo: "GM - CHEVROLET" -> "CHEVROLET"
  if (marcaNome.includes(' - ')) {
    marcaNome = marcaNome.split(' - ')[1].trim();
  }
  
  const combustivel = mapCombustivel(principal.combustivel);

  // 2. Buscar montadora existente
  const todasMontadoras = await MontadorasService.getAll();
  const montadora = todasMontadoras.find(
    m => m.nome.toUpperCase().trim() === marcaNome
  ) || null;

  // 3. Buscar tipos existentes (sempre precisa confirmar — API não diferencia)
  const todosTipos = await TiposVeiculosService.getAll();

  // 4. Buscar modelos existentes da montadora (se houver)
  let modelosExistentes: IModelo[] = [];
  if (montadora) {
    // Busca todos os modelos dessa montadora (sem filtro de tipo por enquanto)
    const { data } = await (await import('../../../lib/supabase')).supabase
      .from('cad_modelos')
      .select('id, nome')
      .eq('montadora_id', montadora.id)
      .order('nome');
    modelosExistentes = (data || []) as IModelo[];
  }

  // 5. Parsing inteligente
  const parsed = parseModeloVersao(principal.modelo, modelosExistentes, principal.combustivel);

  // 6. Verificar se o modelo existe no banco
  const modeloEncontrado = modelosExistentes.find(
    m => m.nome.toUpperCase() === parsed.modelo
  ) || null;

  // 7. Buscar cor no banco
  let corId: string | null = null;
  if (principal.cor) {
    const cores = await CoresService.getAll();
    const corEncontrada = cores.find(
      c => c.nome.toUpperCase().trim() === principal.cor.toUpperCase().trim()
    );
    if (corEncontrada) {
      corId = corEncontrada.id;
    }
  }

  // 8. Determinar categoria sugerida
  const catRes = principal.extra?.categoria?.sintetico || principal.categoria || '';
  const categoriaSugerida: 'carro' | 'moto' | 'outros' = 
    catRes.toLowerCase().includes('moto') ? 'moto' : 
    (catRes.toLowerCase().includes('carro') || catRes.toLowerCase().includes('utilitario') || catRes.toLowerCase().includes('passeio')) ? 'carro' : 
    'outros';

  // 9. Buscar estatísticas de uso oficiais do banco (via RPC)
  const usageStats = await consultaPlacaService.fetchUsageStats();
  const consultasRestantes = usageStats.remaining;

  return {
    raw: apiResponse,
    marcaNome,
    modeloNome: parsed.modelo,
    versaoNome: parsed.versao,
    motorizacaoSugerida: parsed.motorizacao,
    combustivel,
    anoFabricacao: Number(principal.anoFabricacao),
    anoModelo: parseInt(principal.anoModelo) || Number(principal.anoFabricacao),
    cor: principal.cor?.toUpperCase() || '',
    chassi: principal.chassi || '',
    placa: placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    valorFipe: principal.valor || 0,
    montadora,
    tipoVeiculo: null, // Sempre pede confirmação
    modelo: modeloEncontrado,
    corId,
    categoriaSugerida,
    consultasRestantes,
    precisaCriarMontadora: !montadora,
    precisaConfirmarTipo: true, // API não diferencia SEDAN/HATCH/PICKUP
    precisaCriarModelo: !modeloEncontrado,
  };
}

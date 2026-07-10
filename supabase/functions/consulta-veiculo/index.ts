// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

function normalizarRespostaApiBrasil(apiData: any) {
  const resultadosAntigos = apiData?.data?.resultados
  const resultadosNovos = apiData?.data?.data
  const veiculo = apiData?.data?.veiculo || {}

  if (Array.isArray(resultadosAntigos)) {
    apiData.data.resultados = resultadosAntigos.map((resultado: any) => ({
      ...resultado,
      chassi: resultado.chassi || veiculo.chassi || '',
      cor: resultado.cor || veiculo.cor || '',
      combustivel: resultado.combustivel || veiculo.combustivel || '',
    }))
    return apiData
  }

  if (!Array.isArray(resultadosNovos)) {
    return apiData
  }

  apiData.data.resultados = resultadosNovos.map((resultado: any) => ({
    ...resultado,
    chassi: resultado.chassi || veiculo.chassi || '',
    cor: resultado.cor || veiculo.cor || '',
    combustivel: resultado.combustivel || veiculo.combustivel || '',
  }))

  return apiData
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { placa } = await req.json()
    
    if (!placa) {
      throw new Error('Placa é obrigatória')
    }

    const limpaPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    
    // Configurações do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const API_BRASIL_TOKEN = Deno.env.get('API_BRASIL_TOKEN')
    const API_BRASIL_ENDPOINT = Deno.env.get('API_BRASIL_ENDPOINT') || 'https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits'
    const API_BRASIL_TIPO_CONSULTA = Deno.env.get('API_BRASIL_TIPO_CONSULTA') || 'fipe-chassi'
    const API_BRASIL_FALLBACK_TIPO = Deno.env.get('API_BRASIL_FALLBACK_TIPO') || 'fipe'

    if (!API_BRASIL_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Configuração ausente: API_BRASIL_TOKEN não definido no Supabase.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com o JWT do usuário para respeitar RLS e RPCs de uso
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    })

    // 1. Verificar Cache Global no Banco de Dados
    const { data: cachedRow, error: cacheError } = await supabaseClient
      .from('fipe_api_cache')
      .select('dados_json, mes_referencia, updated_at')
      .eq('placa', limpaPlaca)
      .maybeSingle()

    const mesAtual = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())
    const cacheAtualizadoEm = cachedRow?.updated_at ? new Date(cachedRow.updated_at) : null
    const cacheValidoAte = cacheAtualizadoEm ? new Date(cacheAtualizadoEm.getTime() + 30 * 24 * 60 * 60 * 1000) : null

    // Se existe no cache e foi atualizado nos últimos 30 dias, usamos o cache (Economia Total)
    if (cachedRow && cacheValidoAte && cacheValidoAte >= new Date()) {
      console.log(`FIPE: [EDGE] Carregando do Cache para placa: ${limpaPlaca}`)
      
      // Registrar uso (mesmo sendo cache, registramos para o contador da loja)
      await supabaseClient.rpc('rpc_record_fipe_usage', {
        p_placa: limpaPlaca,
        p_cached: true
      })

      return new Response(
        JSON.stringify(cachedRow.dados_json),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Autorizar pelo limite da loja antes de consultar a API externa.
    // O registro de uso real só acontece depois de uma resposta válida da API Brasil.
    const { data: usageStats, error: usageError } = await supabaseClient.rpc('rpc_get_fipe_usage_stats')
    if (usageError) {
      console.error('FIPE: [EDGE] Erro ao validar limite mensal:', usageError)
    }
    if (usageStats && Number(usageStats.remaining) <= 0) {
      throw new Error('LIMITE_MENSAL_ATINGIDO')
    }

    // 3. Consulta Real na API Brasil
    const consultarApiBrasil = async (tipoConsulta: string) => {
      console.log(`FIPE: [EDGE] Consultando API Brasil para placa: ${limpaPlaca} | tipo=${tipoConsulta}`)
      const response = await fetch(API_BRASIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_BRASIL_TOKEN}`
        },
        body: JSON.stringify({
          tipo: tipoConsulta,
          placa: limpaPlaca,
          homolog: false
        })
      })

      const responseText = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = responseText ? JSON.parse(responseText) : {}
      } catch (e) {
        // Não é JSON
      }

      if (!response.ok) {
        const apiMessage = errorData.message || errorData.error || responseText || 'Falha ao consultar a placa na API Brasil.'
        console.error(`FIPE: [EDGE] Erro na API Brasil (${response.status}):`, apiMessage)

        return {
          ok: false,
          status: response.status,
          message: apiMessage,
          data: errorData
        }
      }

      return {
        ok: true,
        status: response.status,
        message: '',
        data: errorData
      }
    }

    const shouldRetryWithoutCnpj = (message: string) => {
      const normalized = (message || '').toLowerCase()
      return normalized.includes('cnpj') || normalized.includes('pessoa jurídica') || normalized.includes('pessoa juridica')
    }

    let apiResult = await consultarApiBrasil(API_BRASIL_TIPO_CONSULTA)

    if (!apiResult.ok && API_BRASIL_FALLBACK_TIPO && API_BRASIL_FALLBACK_TIPO !== API_BRASIL_TIPO_CONSULTA && shouldRetryWithoutCnpj(apiResult.message)) {
      console.warn(`FIPE: [EDGE] API Brasil exigiu CNPJ para tipo=${API_BRASIL_TIPO_CONSULTA}. Tentando fallback tipo=${API_BRASIL_FALLBACK_TIPO}.`)
      apiResult = await consultarApiBrasil(API_BRASIL_FALLBACK_TIPO)
    }

    if (!apiResult.ok) {
      if (apiResult.status === 402 || apiResult.message.toLowerCase().includes('saldo')) {
        throw new Error('SALDO_SISTEMA_INSUFICIENTE')
      }

      throw new Error(`API_BRASIL_ERROR: ${apiResult.message}`)
    }

    let apiData = normalizarRespostaApiBrasil(apiResult.data)
    console.log(`FIPE: [EDGE] Dados recebidos para placa ${limpaPlaca}`)
    
    if (apiData.error) {
      console.error('FIPE: [EDGE] API retornou erro no corpo:', apiData)
      const bodyMessage = apiData.message || apiData.error || ''
      if (API_BRASIL_FALLBACK_TIPO && API_BRASIL_FALLBACK_TIPO !== API_BRASIL_TIPO_CONSULTA && shouldRetryWithoutCnpj(bodyMessage)) {
        console.warn(`FIPE: [EDGE] Corpo da API exigiu CNPJ para tipo=${API_BRASIL_TIPO_CONSULTA}. Tentando fallback tipo=${API_BRASIL_FALLBACK_TIPO}.`)
        apiResult = await consultarApiBrasil(API_BRASIL_FALLBACK_TIPO)
        if (apiResult.ok && !apiResult.data?.error) {
          apiData = normalizarRespostaApiBrasil(apiResult.data)
        } else {
          const retryMessage = apiResult.message || apiResult.data?.message || bodyMessage
          throw new Error(`API_BRASIL_ERROR: ${retryMessage}`)
        }
      } else {
        throw new Error(apiData.message || 'A API retornou erro para esta consulta.')
      }
    }

    // 4. Salvar no Cache Global
    if (apiData.data?.resultados?.[0]) {
      const result = apiData.data.resultados[0]
      console.log('FIPE: [EDGE] Salvando no cache...')
      const { error: saveCacheError } = await supabaseClient.from('fipe_api_cache').upsert({
        placa: limpaPlaca,
        dados_json: apiData,
        mes_referencia: result.mesReferencia || mesAtual,
        updated_at: new Date().toISOString()
      })
      if (saveCacheError) {
        console.error('Erro ao salvar cache:', saveCacheError)
      }
    }

    const { error: recordUsageError } = await supabaseClient.rpc('rpc_record_fipe_usage', {
      p_placa: limpaPlaca,
      p_cached: false
    })
    if (recordUsageError) {
      console.error('FIPE: [EDGE] Erro ao registrar uso real:', recordUsageError)
    }

    return new Response(
      JSON.stringify(apiData),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Erro na Edge Function consulta-veiculo:', error)
    
    let message = error.message
    let status = 400

    if (message === 'LIMITE_MENSAL_ATINGIDO') {
      message = 'Você atingiu o limite de 100 consultas mensais da sua loja.'
    } else if (message === 'SALDO_SISTEMA_INSUFICIENTE') {
      message = 'O sistema está em manutenção de saldo. Tente novamente mais tarde.'
    } else if (message.startsWith('API_BRASIL_ERROR: ')) {
      message = message.replace('API_BRASIL_ERROR: ', '')
    }

    return new Response(
      JSON.stringify({ error: true, message }),
      { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

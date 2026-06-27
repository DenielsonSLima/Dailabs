import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const generateTempPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization header is required')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const callerClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: callerData, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerData.user) throw new Error('Unauthorized')

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, ativo')
      .eq('id', callerData.user.id)
      .single()

    if (profileError) throw profileError
    if (callerProfile?.role !== 'ADMIN' || callerProfile?.ativo === false) {
      throw new Error('Only active ADMIN users can create users')
    }

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()

    if (!email) throw new Error('email is required')
    if (!body.nome) throw new Error('nome is required')

    const tempPassword = generateTempPassword()

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nome: body.nome,
        sobrenome: body.sobrenome,
        role: body.role ?? 'OPERADOR',
      },
    })

    if (createError) throw createError
    if (!created.user) throw new Error('User was not created')

    const { error: profileInsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        nome: body.nome,
        sobrenome: body.sobrenome,
        cpf: body.cpf,
        telefone: body.telefone,
        role: body.role ?? 'OPERADOR',
        ativo: body.ativo ?? true,
        force_password_change: true,
        updated_at: new Date().toISOString(),
      })

    if (profileInsertError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      throw profileInsertError
    }

    return new Response(JSON.stringify({
      user: {
        id: created.user.id,
        email: created.user.email,
      },
      tempPassword,
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: callerData, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerData.user) throw new Error('Unauthorized')

    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, ativo')
      .eq('id', callerData.user.id)
      .single()

    if (profileError) throw profileError
    if (callerProfile?.role !== 'ADMIN' || callerProfile?.ativo === false) {
      throw new Error('Only active ADMIN users can update users')
    }

    const body = await req.json()
    const userId = body.userId ?? body.id
    const { password, metadata } = body

    if (!userId) throw new Error('userId is required')

    const updates: any = {}
    if (password) updates.password = password
    if (body.email) updates.email = String(body.email).trim().toLowerCase()
    if (metadata) updates.user_metadata = metadata

    let data = null
    if (Object.keys(updates).length > 0) {
      const result = await supabaseClient.auth.admin.updateUserById(userId, updates)
      if (result.error) throw result.error
      data = result.data
    }

    const profileUpdates: Record<string, unknown> = {
      nome: body.nome,
      sobrenome: body.sobrenome,
      cpf: body.cpf,
      telefone: body.telefone,
      role: body.role,
      ativo: body.ativo,
      updated_at: new Date().toISOString(),
    }

    if (body.email) profileUpdates.email = String(body.email).trim().toLowerCase()
    if (password) profileUpdates.force_password_change = true

    Object.keys(profileUpdates).forEach((key) => {
      if (profileUpdates[key] === undefined) delete profileUpdates[key]
    })

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateProfileError } = await supabaseClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)

      if (updateProfileError) throw updateProfileError
    }

    return new Response(JSON.stringify(data), {
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

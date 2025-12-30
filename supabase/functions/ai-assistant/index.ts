import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { assistantType, input } = await req.json()

    if (!assistantType || !input) {
      throw new Error('Missing assistantType or input')
    }

    // 1. Get Assistant Config
    const { data: assistant, error: assistantError } = await supabaseClient
      .schema('app_ai')
      .from('assistants')
      .select('*')
      .eq('assistant_type', assistantType)
      .maybeSingle()

    if (assistantError) {
       console.error("Error fetching assistant:", assistantError)
       throw new Error(`Error fetching assistant: ${assistantError.message}`)
    }

    if (!assistant) {
      throw new Error(`Assistant not found for type: ${assistantType}`)
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({
      model: assistant.model_config.model,
      generationConfig: {
        temperature: assistant.model_config.temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    })

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: assistant.system_prompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'Ready to assist.' }]
        }
      ]
    })

    const result = await chat.sendMessage(input)
    const responseText = result.response.text()

    // 2. Log Request
    // Attempt to get user from auth header
    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabaseClient.auth.getUser(token)
        if (user) userId = user.id
    }

    const { error: logError } = await supabaseClient.schema('app_ai').from('ai_requests').insert({
      assistant_id: assistant.id,
      input_data: { input },
      output_data: { response: responseText },
      user_id: userId,
      status: 'completed',
      // We can grab tokens if available in usageMetadata
      tokens_used: result.response.usageMetadata?.totalTokenCount
    })

    if (logError) {
        console.error("Error logging AI request:", logError)
    }

    return new Response(JSON.stringify({
      response: responseText,
      meta: result.response.usageMetadata
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Edge function error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

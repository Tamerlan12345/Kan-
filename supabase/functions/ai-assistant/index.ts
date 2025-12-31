import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

// 1. Определяем заголовки CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 2. Обрабатываем Preflight запрос (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { taskTitle, taskDescription, mode } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    let prompt = ''
    if (mode === 'estimation') {
      prompt = `Estimate the time in hours to complete this task for a senior developer.
      Task: "${taskTitle}".
      Description: "${taskDescription || ''}".
      Return ONLY a number (e.g. 4.5). Do not write "hours" or any text.`
    } else {
      prompt = `Analyze this task: "${taskTitle}". Description: "${taskDescription}". Give 3 short bullet points on how to start.`
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // 3. Возвращаем ответ с заголовками CORS
    return new Response(
      JSON.stringify({ result: text }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    // 4. Возвращаем ошибку тоже с заголовками CORS
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

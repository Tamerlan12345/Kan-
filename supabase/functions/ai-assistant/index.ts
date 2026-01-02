import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Обработка Preflight (OPTIONS) - самое важное для CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Получаем тело запроса
    const { taskTitle, taskDescription, mode, assistantType, input } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    let prompt = ''

    // Логика формирования промпта
    if (assistantType === 'task_decomposer') {
        // Парсим входные данные, если они пришли строкой
        const data = typeof input === 'string' ? JSON.parse(input) : input;
        prompt = `
        Act as a Senior Project Manager. Decompose this task into 3-5 subtasks.
        Parent Task: "${data.title}"
        Description: "${data.description}"

        Return ONLY valid JSON array. Do not use Markdown formatting. Example:
        [
          {"title": "Research API", "description": "Read documentation", "estimated_hours": 2},
          {"title": "Implement Schema", "description": "Create DB tables", "estimated_hours": 4}
        ]
        `
    } else if (assistantType === 'predictive_estimator') {
         const data = typeof input === 'string' ? JSON.parse(input) : input;
         prompt = `Estimate hours for task: "${data.title}". Return valid JSON: {"estimated_hours": 5.5}`
    } else {
        // Fallback for chat
        prompt = `Context: ${input}. Answer briefly.`
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Очистка от markdown (```json ... ```), если модель все же добавила их
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return new Response(
      JSON.stringify({ response: cleanText }), // Возвращаем как response, чтобы клиент понимал
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 // Лучше 400 или 500, но с заголовками
      }
    )
  }
})

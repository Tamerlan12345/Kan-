import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. Immediate OPTIONS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Get key from server environment
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    // 3. Logic handling
    const { assistantType, input } = await req.json()

    if (!assistantType || !input) {
       throw new Error('Missing assistantType or input')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    if (assistantType === 'task_decomposer') {
        const data = typeof input === 'string' ? JSON.parse(input) : input;
        const prompt = `
        Act as a Senior Project Manager. Decompose this task into 3-5 subtasks.
        Parent Task: "${data.title}"
        Description: "${data.description}"

        Return ONLY valid JSON array. Do not use Markdown formatting. Example:
        [
          {"title": "Research API", "description": "Read documentation", "estimated_hours": 2},
          {"title": "Implement Schema", "description": "Create DB tables", "estimated_hours": 4}
        ]
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parse the response
        let subtasks = [];
        const parsed = JSON.parse(cleanText);
        subtasks = Array.isArray(parsed) ? parsed : (parsed.subtasks || []);

        // Insert into DB if taskId is present
        if (data.taskId && subtasks.length > 0) {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Map to DB schema
            const inserts = subtasks.map((st: any) => ({
                task_id: data.taskId,
                title: st.title,
                is_completed: false
            }))

            const { error: insertError } = await supabaseAdmin
                .schema('app_tasks')
                .from('subtasks')
                .insert(inserts)

            if (insertError) {
                throw new Error('Database insert failed: ' + insertError.message)
            }
        }

        return new Response(
          JSON.stringify({ message: 'Success', count: subtasks.length }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
    }

    let prompt = ''
    if (assistantType === 'predictive_estimator') {
         const data = typeof input === 'string' ? JSON.parse(input) : input;
         prompt = `Estimate hours for task: "${data.title}". Return valid JSON: {"estimated_hours": 5.5}`
    } else {
        // Fallback for chat
        prompt = `Context: ${input}. Answer briefly in Russian language.`
    }

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return new Response(
      JSON.stringify({ response: cleanText }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

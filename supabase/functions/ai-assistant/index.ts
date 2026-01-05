import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. Handle Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    // Check API Key
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY not set' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // 2. Parse Body safely
    let body;
    try {
        body = await req.json()
    } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid request body: must be valid JSON' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }

    const { assistantType, input } = body

    if (!assistantType || !input) {
         return new Response(
          JSON.stringify({ error: 'Missing assistantType or input' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Logic for prompt generation
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
        try {
            const parsed = JSON.parse(cleanText);
            subtasks = Array.isArray(parsed) ? parsed : (parsed.subtasks || []);
        } catch (e) {
            console.error("JSON Parse error:", e);
             return new Response(
              JSON.stringify({ error: 'Failed to parse AI response' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            )
        }

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
                console.error("Insert error:", insertError)
                return new Response(
                  JSON.stringify({ error: 'Database insert failed: ' + insertError.message }),
                  {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500
                  }
                )
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

    // Other types
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
    console.error("Function error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

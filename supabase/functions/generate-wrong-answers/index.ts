import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  prompt: string;
  correctAnswer: string;
  sarcasmLevel: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, correctAnswer, sarcasmLevel }: RequestPayload = await req.json()

    if (!prompt || !correctAnswer || typeof sarcasmLevel !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, correctAnswer, sarcasmLevel' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate sarcasm description
    const getSarcasmDescription = (level: number) => {
      if (level <= 2) return 'professional and straightforward';
      if (level <= 4) return 'mildly sarcastic';
      if (level <= 6) return 'moderately sarcastic';
      if (level <= 8) return 'heavily sarcastic';
      return 'brutally sarcastic and cutting';
    };

    const sarcasmStyle = getSarcasmDescription(sarcasmLevel);

    const aiPrompt = `You are creating wrong answers for a workplace quiz game called net2phone "Don't Screw This Up!".

Question: "${prompt}"
Correct Answer: "${correctAnswer}"

Generate exactly 3 plausible but incorrect answers that are ${sarcasmStyle}. The answers should:
1. Sound like they could be real options
2. Be funny and engaging for a workplace audience
3. Match the sarcasm level of ${sarcasmLevel}/10
4. Be roughly the same length as the correct answer
5. Not be obviously wrong at first glance

Return only a JSON array of 3 strings, nothing else.

Example format: ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]`;

    // For now, we'll use a simple OpenAI-compatible API call
    // You can replace this with your preferred AI service
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      // Fallback to generated answers if no API key
      const fallbackAnswers = [
        `The answer you'd give if you were trying to ${sarcasmLevel > 7 ? 'destroy your career' : 'confuse everyone'}`,
        `What someone would say if they ${sarcasmLevel > 7 ? 'had zero brain cells' : 'misunderstood the question'}`,
        `The response that screams ${sarcasmLevel > 7 ? '"I give up on life"' : '"I need more coffee"'}`
      ];
      
      return new Response(
        JSON.stringify({ wrongAnswers: fallbackAnswers }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a witty AI that creates humorous wrong answers for workplace quiz questions. Always respond with valid JSON arrays only.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedContent = aiResponse.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    // Parse the JSON response
    let wrongAnswers;
    try {
      wrongAnswers = JSON.parse(generatedContent);
      if (!Array.isArray(wrongAnswers) || wrongAnswers.length !== 3) {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      // Fallback if parsing fails
      wrongAnswers = [
        `The answer you'd give if you were trying to ${sarcasmLevel > 7 ? 'destroy your career' : 'confuse everyone'}`,
        `What someone would say if they ${sarcasmLevel > 7 ? 'had zero brain cells' : 'misunderstood the question'}`,
        `The response that screams ${sarcasmLevel > 7 ? '"I give up on life"' : '"I need more coffee"'}`
      ];
    }

    return new Response(
      JSON.stringify({ wrongAnswers }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error generating wrong answers:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate wrong answers',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
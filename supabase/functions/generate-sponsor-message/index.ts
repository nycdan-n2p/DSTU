import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  productFocus: string;
  tone: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { productFocus, tone }: RequestPayload = await req.json()

    if (!productFocus || !tone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: productFocus, tone' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const aiPrompt = `Generate a short, engaging, and ${tone} sponsor message for a workplace quiz game.
    The message should focus on "${productFocus}".
    Keep it concise, around 1-2 sentences.
    Return only the message text, nothing else.`;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      // Fallback to a generic message if no API key
      const fallbackMessage = `Today's game is brought to you by ${productFocus} – making your work life ${tone}!`;
      return new Response(
        JSON.stringify({ sponsorMessage: fallbackMessage }),
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
        model: 'gpt-3.5-turbo', // Or 'gpt-4o' if you have access and prefer
        messages: [
          {
            role: 'system',
            content: 'You are a creative AI that generates concise and engaging sponsor messages.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
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

    return new Response(
      JSON.stringify({ sponsorMessage: generatedContent.trim() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating sponsor message:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate sponsor message',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

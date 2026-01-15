import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/prompts';

interface AIResponse {
  title: string;
  category: string;
  summary: string;
  keyPoints: string[];
  tasks: Array<{ text: string; priority: string }>;
  questions?: string[];
  relatedTopics?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, provider, apiKey } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transkript ist erforderlich' },
        { status: 400 }
      );
    }

    // If no API config, return demo response
    if (!provider || !apiKey) {
      return NextResponse.json({
        isDemo: true,
        result: generateDemoResponse(transcript),
      });
    }

    let aiResponse: AIResponse;

    if (provider === 'openai') {
      aiResponse = await processWithOpenAI(transcript, apiKey);
    } else if (provider === 'anthropic') {
      aiResponse = await processWithAnthropic(transcript, apiKey);
    } else if (provider === 'google') {
      aiResponse = await processWithGoogle(transcript, apiKey);
    } else {
      return NextResponse.json(
        { error: 'Unbekannter Provider' },
        { status: 400 }
      );
    }

    return NextResponse.json({ result: aiResponse });
  } catch (error) {
    console.error('Process thought error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Fehler: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function processWithOpenAI(transcript: string, apiKey: string): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT_TEMPLATE(transcript) },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const statusCode = response.status;
    const errorMsg = error.error?.message || `OpenAI API Fehler (Status ${statusCode})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

async function processWithAnthropic(transcript: string, apiKey: string): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: USER_PROMPT_TEMPLATE(transcript) },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('No response from Anthropic');
  }

  // Extract JSON from potential markdown code blocks
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/```\n?([\s\S]*?)\n?```/) ||
                    [null, content];

  return JSON.parse(jsonMatch[1] || content);
}

async function processWithGoogle(transcript: string, apiKey: string): Promise<AIResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: USER_PROMPT_TEMPLATE(transcript) }],
          },
        ],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const statusCode = response.status;
    const errorMsg = error.error?.message || `Google Gemini API Fehler (Status ${statusCode})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Keine Antwort von Google Gemini');
  }

  return JSON.parse(content);
}

function generateDemoResponse(transcript: string): AIResponse {
  // Simple keyword-based categorization for demo mode
  const text = transcript.toLowerCase();
  let category = 'Produktivität';

  if (text.includes('gesundheit') || text.includes('fitness') || text.includes('mental')) {
    category = 'Gesundheit';
  } else if (text.includes('familie') || text.includes('kinder') || text.includes('eltern')) {
    category = 'Familie';
  } else if (text.includes('kommunikation') || text.includes('sprechen') || text.includes('meeting')) {
    category = 'Kommunikation';
  } else if (text.includes('nachhaltig') || text.includes('umwelt') || text.includes('klima')) {
    category = 'Nachhaltigkeit';
  } else if (text.includes('app') || text.includes('software') || text.includes('entwickl')) {
    category = 'Technik';
  } else if (text.includes('business') || text.includes('startup') || text.includes('unternehm')) {
    category = 'Business';
  }

  // Generate title from first words
  const words = transcript.split(' ');
  const title = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');

  return {
    title,
    category,
    summary: transcript.length > 200 ? transcript.substring(0, 200) + '...' : transcript,
    keyPoints: [
      'Hauptidee aus dem Gedanken extrahiert',
      'Mögliche Umsetzungsschritte identifiziert',
      'Weitere Ausarbeitung empfohlen',
    ],
    tasks: [
      { text: 'Idee weiter ausarbeiten', priority: 'Hoch' },
      { text: 'Research durchführen', priority: 'Mittel' },
      { text: 'Erste Schritte planen', priority: 'Normal' },
    ],
    questions: ['Welche Ressourcen werden benötigt?', 'Wer könnte dabei helfen?'],
    relatedTopics: ['Planung', 'Umsetzung'],
  };
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { valid: false, error: 'Provider und API Key sind erforderlich' },
        { status: 400 }
      );
    }

    if (provider === 'openai') {
      // Validate OpenAI API Key by listing models (free endpoint)
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return NextResponse.json({ valid: true });
      } else {
        const error = await response.json().catch(() => ({}));
        return NextResponse.json({
          valid: false,
          error: error.error?.message || 'Ungültiger OpenAI API Key',
        });
      }
    } else if (provider === 'anthropic') {
      // Validate Anthropic API Key with a minimal message
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (response.ok) {
        return NextResponse.json({ valid: true });
      } else {
        const error = await response.json().catch(() => ({}));
        return NextResponse.json({
          valid: false,
          error: error.error?.message || 'Ungültiger Anthropic API Key',
        });
      }
    } else {
      return NextResponse.json(
        { valid: false, error: 'Unbekannter Provider' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Key validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Fehler bei der Validierung' },
      { status: 500 }
    );
  }
}

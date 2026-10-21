export function providerName(env = process.env) {
  return env.AI_PROVIDER || (env.GEMINI_API_KEY ? 'gemini' : 'compatible');
}
export function aiConfigured(env = process.env) {
  return providerName(env) === 'gemini' ? Boolean(env.GEMINI_API_KEY && env.GEMINI_MODEL) : providerName(env) === 'compatible' && Boolean(env.QUID_BASE_URL && env.QUID_API_KEY && env.QUID_MODEL);
}
export async function complete(messages, json = false, {
  env = process.env,
  fetcher = fetch
} = {}) {
  const models = providerName(env) === 'gemini' ? [...new Set([env.GEMINI_MODEL, ...String(env.GEMINI_FALLBACK_MODELS || '').split(',').map(s => s.trim()).filter(Boolean)])].slice(0, 3) : [null];
  let lastError;
  for (const model of models) {
    try {
      return await completeAttempt(messages, json, {
        env: model ? {
          ...env,
          GEMINI_MODEL: model
        } : env,
        fetcher
      });
    } catch (error) {
      lastError = error;
      if (!error.retryable && !['TimeoutError', 'AbortError', 'TypeError'].includes(error.name)) throw error;
    }
  }
  throw lastError;
}
async function completeAttempt(messages, json, {
  env,
  fetcher
}) {
  if (!aiConfigured(env)) throw new Error('Quid’s AI connection needs a provider, API key and model in server settings.');
  const gemini = providerName(env) === 'gemini';
  let endpoint, headers, payload;
  if (gemini) {
    if (!/^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL)) throw new Error('Use a valid Gemini model ID.');
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + env.GEMINI_MODEL + ':generateContent';
    headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    };
    payload = {
      systemInstruction: {
        parts: [{
          text: messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
        }]
      },
      contents: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{
          text: m.content
        }]
      })),
      generationConfig: {
        ...(!/^gemini-4/.test(env.GEMINI_MODEL) ? {
          temperature: .3
        } : {}),
        maxOutputTokens: 2400,
        ...(/^gemini-[34](?:\.|-)/.test(env.GEMINI_MODEL) && !/lite/.test(env.GEMINI_MODEL) ? {
          thinkingConfig: {
            thinkingLevel: 'low'
          }
        } : {}),
        ...(json ? {
          responseMimeType: 'application/json'
        } : {})
      }
    };
  } else {
    endpoint = env.QUID_BASE_URL.replace(/\/$/, '') + '/chat/completions';
    const url = new URL(endpoint);
    if (url.username || url.password || url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('AI endpoints must use HTTPS outside loopback.');
    headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + env.QUID_API_KEY
    };
    payload = {
      model: env.QUID_MODEL,
      messages,
      temperature: .3,
      max_tokens: 2400,
      ...(json ? {
        response_format: {
          type: 'json_object'
        }
      } : {})
    };
  }
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) {
    const error = new Error('Quid’s AI provider could not complete this request (' + response.status + '). Your saved work has not changed.');
    error.retryable = [404, 408, 429, 500, 502, 503, 504].includes(response.status);
    throw error;
  }
  const data = await response.json();
  const text = gemini ? data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') : data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim() || text.length > 30000) throw new Error('The AI provider returned an empty or oversized answer. Please try again.');
  return text;
}

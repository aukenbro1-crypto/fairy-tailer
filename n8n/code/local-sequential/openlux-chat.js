// Shared OpenLux chat transport. Injected only into local text workflows.
function parseLocalTextObject(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '').trim()
    .replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1').trim();
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('Text response contract: invalid or incomplete JSON object'); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Text response contract: expected one JSON object');
  }
  return parsed;
}

async function requestOpenLuxChat(geminiRequest, model, schemaName, timeout) {
  if (!['grok-4.3', 'gpt-6.1-sol'].includes(model)) throw new Error('Unsupported local chat text model');
  if (!$env.OPENLUX_API_KEY) throw new Error('OPENLUX_API_KEY is not configured');
  const config = geminiRequest?.generationConfig || {};
  const schema = config.responseJsonSchema || config.responseSchema;
  const normalizeSchema = (value) => {
    if (Array.isArray(value)) return value.map(normalizeSchema);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key,
      key === 'type' && typeof child === 'string' ? child.toLowerCase() : normalizeSchema(child)]));
  };
  const strictSchema = (value) => {
    if (Array.isArray(value)) return value.map(strictSchema);
    if (!value || typeof value !== 'object') return value;
    const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, strictSchema(child)]));
    if (result.type === 'object') {
      result.additionalProperties = false;
      result.required = Object.keys(result.properties || {});
    }
    return result;
  };
  const isGpt = model === 'gpt-6.1-sol';
  if (isGpt && !schema) throw new Error('Local GPT text requires an explicit response schema');
  const systemText = (geminiRequest?.systemInstruction?.parts || []).map((part) => part.text || '').join('\n').trim();
  const inputText = (geminiRequest?.contents || []).flatMap((content) => content?.parts || [])
    .map((part) => part.text || '').filter(Boolean).join('\n').trim();
  const formatInstruction = 'Return exactly one JSON object, without markdown. Response contract: ' + schemaName
    + (!isGpt && schema ? '\nJSON schema: ' + JSON.stringify(normalizeSchema(schema)) : '');
  const response = await this.helpers.httpRequest({
    method: 'POST', url: 'https://api.openlux.ai/v1/chat/completions',
    headers: { Authorization: 'Bearer ' + $env.OPENLUX_API_KEY, 'Content-Type': 'application/json' },
    body: { model, messages: [
      { role: 'system', content: [systemText, formatInstruction].filter(Boolean).join('\n\n') },
      { role: 'user', content: inputText },
    ], reasoning_effort: 'low',
    ...(isGpt ? {
      max_completion_tokens: config.maxOutputTokens || 12000,
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true,
        schema: strictSchema(normalizeSchema(schema)) } },
    } : {
      temperature: config.temperature ?? 0.7, top_p: config.topP ?? 0.9,
      max_tokens: config.maxOutputTokens || 12000, response_format: { type: 'json_object' },
    }) },
    json: true, timeout: timeout || 240000,
  });
  const choice = response?.choices?.[0];
  const content = choice?.message?.content;
  const text = typeof content === 'string' ? content.trim()
    : (Array.isArray(content) ? content.map((part) => part?.text || '').join('').trim() : '');
  // Private local artifacts contain only the response, never request headers or keys.
  if ($env.FAIRYTELLER_LOCAL_CAPTURE_TEXT_RESPONSES === '1'
      && typeof source !== 'undefined' && /^ft_(?:lab|local)_/.test(source?.jobId || '')
      && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test($env.FAIRYTELLER_API_BASE_URL || '')) {
    try {
      await this.helpers.httpRequest({ method: 'PUT',
        url: $env.FAIRYTELLER_API_BASE_URL + '/api/fairyteller/jobs/' + source.jobId
          + '/artifacts/' + (isGpt ? 'gpt' : 'grok') + '-response-' + schemaName + '-' + Date.now() + '.json',
        headers: { Authorization: 'Bearer ' + $env.FAIRYTELLER_API_TOKEN, 'Content-Type': 'application/json' },
        body: { responseId: response.id || null, model, schemaName,
          finishReason: choice?.finish_reason || null, text, usage: response.usage || null },
        json: true, timeout: 30000 });
    } catch { console.log('Local text response diagnostic could not be saved'); }
  }
  if (choice?.message?.refusal) throw new Error('OpenLux ' + model + ' refused the text request');
  if (choice?.finish_reason !== 'stop') throw new Error('OpenLux ' + model + ' incomplete text: ' + (choice?.finish_reason || 'missing finish reason'));
  if (!text) throw new Error('OpenLux ' + model + ' returned no structured text');
  const parsed = parseLocalTextObject(text);
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(parsed) }] }, finishReason: 'STOP' }],
    responseId: response.id || null, openluxResponseId: response.id || null, usage: response.usage || null };
}

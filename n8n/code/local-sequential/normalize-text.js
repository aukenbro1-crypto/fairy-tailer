const source = $('Build Full Text Prompt').first().json;
const response = $input.first().json;
const DEFAULT_CHAPTER_TEXT_BLOCK_TARGETS = { 1: 4, 2: 4, 3: 6, 4: 6, 5: 5 };
const chapterTextBlockTargets = source.chapterTextBlockTargets || DEFAULT_CHAPTER_TEXT_BLOCK_TARGETS;
function textBlockTargetFor(n) { return Number(chapterTextBlockTargets?.[n] || DEFAULT_CHAPTER_TEXT_BLOCK_TARGETS[n] || 5); }
function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function cleanBlockText(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => cleanText(paragraph))
    .filter(Boolean)
    .join('\n\n');
}
const INTERNAL_WORLD_REPLACEMENTS = [
  [/мира\s+Adventure Classic/gi, 'мира приключений'],
  [/Adventure Classic/gi, 'приключений'],
  [/Romantic Story/gi, 'романтической истории'],
  [/Fantasy Epic/gi, 'фэнтези'],
  [/Cyberpunk Dream/gi, 'русского киберпанка'],
  [/Hogwarts World/gi, 'магической школы'],
  [/\b(?:adventure_classic|romantic_story|fantasy_epic|cyberpunk_dream|hogwarts_world|disney_light)\b/gi, ''],
];
function cleanStoryText(value) {
  let text = cleanText(value);

  for (const [pattern, replacement] of INTERNAL_WORLD_REPLACEMENTS) text = text.replace(pattern, replacement);
  return text.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}
const INVALID_TECHNICAL_TEXT_RE = /(?:\[object Object\]|\bundefined\b|\bnull\b)/i;
function coverArtBriefText(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const text = cleanStoryText(value);
    return INVALID_TECHNICAL_TEXT_RE.test(text) ? '' : text;
  }
  if (Array.isArray(value)) return value.map(coverArtBriefText).filter(Boolean).join('. ');
  if (typeof value === 'object') {
    const labels = { scene: 'Сцена', action: 'Действие', composition: 'Композиция', mood: 'Настроение', lighting: 'Свет', location: 'Место', mainObject: 'Главный предмет', artifact: 'Главный предмет', characters: 'Герои', heroes: 'Герои', heroNumbers: 'Герои' };
    const preferredKeys = Object.keys(labels);
    const entries = [
      ...preferredKeys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]),
      ...Object.entries(value).filter(([key]) => !preferredKeys.includes(key)),
    ];
    return cleanStoryText(entries.map(([key, part]) => {
      const text = typeof part === 'object' ? coverArtBriefText(part) : cleanStoryText(part);
      if (!text || INVALID_TECHNICAL_TEXT_RE.test(text)) return '';
      return labels[key] ? labels[key] + ': ' + text : text;
    }).filter(Boolean).join('. '));
  }
  return '';
}
function sanitizeCoverArtBrief(value, fallback) {
  const primary = coverArtBriefText(value);
  if (primary && !INVALID_TECHNICAL_TEXT_RE.test(primary)) return primary;
  const safeFallback = coverArtBriefText(fallback);
  return INVALID_TECHNICAL_TEXT_RE.test(safeFallback) ? '' : safeFallback;
}
function visualBriefValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return { scene: value || '' };
}
function normalizeOutfitCanon(value) {
  if (!value) return '';
  if (typeof value === 'string') return cleanStoryText(value);
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : Object.values(item || {}).filter((part) => typeof part === 'string').join(': ')).map(cleanStoryText).filter(Boolean).join('; ');
  if (typeof value === 'object') return Object.entries(value).map(([hero, outfit]) => hero + ': ' + (typeof outfit === 'string' ? outfit : Object.values(outfit || {}).filter((part) => typeof part === 'string').join(', '))).map(cleanStoryText).filter(Boolean).join('; ');
  return cleanStoryText(value);
}

const SPEECH_ATTRIBUTION_RE = /^(?:(?:тихо|мягко|громко|спокойно|настойчиво|сухо|весело|серьезно|серьёзно|неуверенно|уверенно|коротко|устало|радостно|осторожно|резко|твердо|твёрдо|хрипло|едва\s+слышно|с\s+улыбкой|с\s+облегчением)\s+){0,4}(?:сказал[аи]?|говорил[аи]?|ответил[аи]?|крикнул[аи]?|прошептал[аи]?|спросил[аи]?|произнесл?[аи]?|проворчал[аи]?|скомандовал[аи]?|воскликнул[аи]?|заметил[аи]?|добавил[аи]?|пояснил[аи]?|признал[аи]?|выдохнул[аи]?|позвал[аи]?|предложил[аи]?|объяснил[аи]?|пробормотал[аи]?|буркнул[аи]?)(?=\s|[.,!?…]|$)/iu;
const DIALOGUE_NARRATIVE_ACTION_RE = /(?:обернул[аи]?с[ья]|посмотрел[аи]?|оглянул[аи]?с[ья]|кивнул[аи]?|осмотрел[аи]?|замер(?:ла)?|положил[аи]?|указал[аи]?|улыбнул[аи]?с[ья]|усмехнул[аи]?с[ья]|нахмурил[аи]?с[ья]|вздохнул[аи]?|поднял[аи]?|опустил[аи]?|перевел[аи]?|перевёл[аи]?|пошел|пошёл|пошла|побежал[аи]?|бросил[аи]?с[ья]|сел[аи]?|стоял[аи]?|молчал[аи]?|почувствовал[аи]?|понял[аи]?|заметил[аи]?|сделал[аи]?|достал[аи]?|убрал[аи]?|прижал[аи]?|обнял[аи]?|схватил[аи]?|помог(?:ла)?|развернул[аи]?с[ья]|смотрел[аи]?|слушал[аи]?|ждал[аи]?|дрожал[аи]?|рассмеял[аи]?с[ья]|улыбнул[аи]?с[ья])(?=\s|[.,!?…]|$)/iu;

function compactDialogueText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
function isSpeechAttributionStart(value) {
  return SPEECH_ATTRIBUTION_RE.test(compactDialogueText(value));
}
function capitalizeSentenceStart(value) {
  return String(value || '').replace(/^(\s*)([а-яё])/u, (_, prefix, letter) => prefix + letter.toUpperCase());
}
function normalizeDashSpacing(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(^|[\s\n])—(?=\S)/gu, '$1— ')
    .replace(/[ \t]*[—–][ \t]*(?=$|\n)/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
function repairLowercaseDashParagraphs(value) {
  const paragraphs = String(value || '').split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const repaired = [];
  for (const paragraph of paragraphs) {
    const lowercaseDash = paragraph.match(/^—\s+([а-яё][\s\S]*)$/u);
    if (!lowercaseDash) {
      repaired.push(paragraph);
      continue;
    }
    const body = lowercaseDash[1].trim();
    if (isSpeechAttributionStart(body) && repaired.length && /^—\s/.test(repaired[repaired.length - 1])) {
      repaired[repaired.length - 1] += ' — ' + body;
      continue;
    }
    repaired.push(capitalizeSentenceStart(body));
  }
  return repaired.join('\n\n');
}
function repairInlineLowercaseDashes(value) {
  return String(value || '').replace(/([.!?…])\s+—\s+([а-яё][^.!?…\n]*(?:[.!?…]|$))/gu, (match, punctuation, tail) => (
    isSpeechAttributionStart(tail)
      ? punctuation + ' — ' + tail.trim()
      : punctuation + '\n\n' + capitalizeSentenceStart(tail.trim())
  ));
}
function splitNarrativeAfterDialogue(value) {
  const subject = '(?:[А-ЯЁ][а-яё]{1,24}|Он|Она|Они)';
  const action = DIALOGUE_NARRATIVE_ACTION_RE.source;
  const narrativeStartRe = new RegExp('([.!?…])\\s+(' + subject + '\\s+' + action + ')', 'giu');
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => {
      if (!/^—\s/.test(paragraph)) return paragraph;
      let changed = false;
      return paragraph.replace(narrativeStartRe, (match, punctuation, narrative) => {
        if (changed) return match;
        changed = true;
        return punctuation + '\n\n' + narrative;
      });
    })
    .join('\n\n');
}
function rewriteSplitDialogueContinuations(value) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => {
      const text = paragraph.trim();
      if (!/^—\s/u.test(text)) return text;

      const splitDialogue = text.match(/^(—\s+[\s\S]+?)([,!?…])\s+—\s+([^.!?…]+)([.!?…])\s+—\s+([А-ЯЁA-Z][\s\S]*)$/u);
      if (!splitDialogue || !isSpeechAttributionStart(splitDialogue[3])) return text;

      const openingPunctuation = splitDialogue[2] === ',' ? '.' : splitDialogue[2];
      const opening = splitDialogue[1].replace(/[\s,;:]+$/u, '') + openingPunctuation;
      const continuation = splitDialogue[5].trim();
      const attribution = splitDialogue[3].trim().replace(/[.!?…]+$/u, '');
      const spoken = /[!?…]$/u.test(continuation)
        ? continuation
        : continuation.replace(/[.]+$/u, '') + ',';

      return opening + ' ' + spoken + ' — ' + attribution + '.';
    })
    .filter(Boolean)
    .join('\n\n');
}
function normalizeGeneratedStoryText(value) {
  let text = cleanBlockText(value);
  text = text
    .replace(/\b(?:сказал[аи]?|говорил[аи]?|произнесл?[аи]?)\s+друг\s+другу\s+[«"]люблю[»"]/gi, 'признались друг другу в любви')
    .replace(/\bсказать\s+друг\s+другу\s+[«"]люблю[»"]/gi, 'признаться друг другу в любви')
    .replace(/\bслово\s+[«"]([^»"]{1,80})[»"]/gi, 'слово $1')
    .replace(/\bфраза\s+[«"]([^»"]{1,160})[»"]/gi, 'эта фраза')
    .replace(/[«»]/g, '')
    .replace(/"([^"\n]{1,180})"/g, '$1');
  text = normalizeDashSpacing(text);
  text = rewriteSplitDialogueContinuations(text);
  text = repairLowercaseDashParagraphs(text);
  text = repairInlineLowercaseDashes(text);
  text = splitNarrativeAfterDialogue(text);
  text = text.replace(/([.!?…:])\s+—\s+(?=[А-ЯЁA-Z0-9])/gu, '$1\n\n— ');
  text = splitNarrativeAfterDialogue(text);
  return normalizeDashSpacing(text)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}
function isTechnicalVisualBrief(value) {
  return /(^|[.!?]\s*)(на обложке|на изображении|на иллюстрации|на картинке|в кадре|на фото)\b/i.test(String(value || '').trim());
}
function fallbackReaderBlurb() {
  const names = (source.order?.heroes || []).map((hero) => hero.name).filter(Boolean).slice(0, 3);
  const who = names.length ? names.join(' и ') : 'главного героя';
  const location = source.order?.location || source.text?.bible?.location || '';
  const artifact = source.order?.artifact || source.text?.bible?.artifact || '';
  const parts = ['Это персональная история о ' + who];
  if (location) parts.push('в месте, где ' + location + ' становится началом перемен');
  if (artifact) parts.push('а важный предмет - ' + artifact + ' - помогает сделать честный выбор');
  return cleanStoryText(parts.join(', ') + '.');
}
function shortenReaderBlurbText(value) {
  const text = cleanStoryText(value);
  if (text.length <= 260) return text;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  let result = '';
  for (const sentence of sentences) {
    const cleanedSentence = cleanStoryText(sentence);
    if (!cleanedSentence) continue;
    const candidate = result ? result + ' ' + cleanedSentence : cleanedSentence;
    if (candidate.length > 260) break;
    result = candidate;
    if (result.length >= 140) break;
  }
  if (!result || result.length < 80) {
    result = text.slice(0, 260).replace(/\s+\S*$/, '').trim();
    if (result && !/[.!?]$/.test(result)) result += '.';
  }
  return result.slice(0, 260).trim();
}
function sanitizeReaderBlurb(value) {
  let text = cleanStoryText(value);
  if (!text || text.length < 40 || isTechnicalVisualBrief(text)) text = cleanStoryText(source.text?.bible?.readerBlurb || source.text?.bible?.coverSummary || source.text?.preview?.summary || '');
  if (!text || text.length < 40 || isTechnicalVisualBrief(text)) text = fallbackReaderBlurb();
  return shortenReaderBlurbText(text);
}
function collectText(value) {
  return String(value?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '').trim();
}
function stripJsonMarkdownFences(text) {
  return String(text || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^\`\`\`(?:json)?\s*/i, '')
    .replace(/\s*\`\`\`$/i, '')
    .trim();
}
function extractJsonCandidate(text) {
  let candidate = stripJsonMarkdownFences(text);
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidate = candidate.slice(firstBrace, lastBrace + 1);
  return candidate;
}
function escapeControlCharsInsideStrings(text) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (escaped) { result += char; escaped = false; continue; }
    if (char === '\\') { result += char; escaped = true; continue; }
    if (char === '"') { inString = !inString; result += char; continue; }
    if (inString && char === '\n') { result += '\\n'; continue; }
    if (inString && char === '\r') { result += '\\r'; continue; }
    if (inString && char === '\t') { result += '\\t'; continue; }
    result += char;
  }
  return result;
}
function repairLikelyJson(text) {
  return String(text || '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/"\s*\n\s*"/g, '"\n,"')
    .replace(/}\s*\n\s*"/g, '}\n,"')
    .replace(/]\s*\n\s*"/g, ']\n,"');
}
function readStringField(text, key) {
  const re = new RegExp('"' + key + '"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,|\\n\\s*"|\\n\\s*[}\\]])');
  const match = String(text || '').match(re);
  if (!match) return '';
  return cleanText(match[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
}
function extractStringValuesAfterKey(text, key, limit = 6) {
  const sourceText = String(text || '');
  const keyIndex = sourceText.indexOf('"' + key + '"');
  if (keyIndex < 0) return [];
  const arrayStart = sourceText.indexOf('[', keyIndex);
  if (arrayStart < 0) return [];
  const values = [];
  let i = arrayStart + 1;
  while (i < sourceText.length && values.length < limit) {
    while (i < sourceText.length && sourceText[i] !== '"') {
      if (sourceText[i] === ']' && values.length > 0) return values;
      i += 1;
    }
    if (i >= sourceText.length) break;
    i += 1;
    let value = '';
    let escaped = false;
    while (i < sourceText.length) {
      const char = sourceText[i];
      if (escaped) { value += char === 'n' ? ' ' : char; escaped = false; i += 1; continue; }
      if (char === '\\') { escaped = true; i += 1; continue; }
      if (char === '"') { i += 1; break; }
      value += char;
      i += 1;
    }
    const cleaned = cleanText(value);
    if (cleaned) values.push(cleaned);
  }
  return values;
}
function splitRawTextIntoBlocks(text, targetCount = 5) {
  let raw = cleanText(String(text || '').replaceAll('\\n', ' ').replaceAll('\n', ' ')
    .replace(/"(?:n|title|summary|textBlocks|text1|text2|text3|text4|text5|text6)"\s*:?/g, ' ')
    .replace(/[{}\[\],]/g, ' '));
  if (raw.length < 180) return [];
  const minSize = Math.max(100, Math.floor(raw.length / 8));
  const target = Math.max(minSize, Math.floor(raw.length / targetCount));
  const blocks = [];
  let rest = raw;
  while (blocks.length < targetCount - 1 && rest.length > target) {
    let cut = rest.lastIndexOf('. ', target + 220);
    if (cut < target - 220) cut = rest.lastIndexOf('! ', target + 220);
    if (cut < target - 220) cut = rest.lastIndexOf('? ', target + 220);
    if (cut < target - 220) cut = rest.indexOf('. ', target);
    if (cut < 0 || cut > rest.length - minSize) cut = Math.min(rest.length - minSize, target);
    const block = cleanText(rest.slice(0, cut + 1));
    if (block) blocks.push(block);
    rest = cleanText(rest.slice(cut + 1));
  }
  if (rest) blocks.push(cleanText(rest));
  while (blocks.length < targetCount && blocks.some((block) => block.length > minSize * 2)) {
    const index = blocks.reduce((maxIndex, block, currentIndex) => block.length > blocks[maxIndex].length ? currentIndex : maxIndex, 0);
    const block = blocks[index];
    let cut = block.lastIndexOf('. ', Math.floor(block.length / 2) + 120);
    if (cut < Math.floor(block.length / 2) - 120) cut = Math.floor(block.length / 2);
    blocks.splice(index, 1, cleanText(block.slice(0, cut + 1)), cleanText(block.slice(cut + 1)));
  }
  return blocks.slice(0, targetCount).filter(Boolean);
}
function normalizeTextBlocks(blocks, rawFallback, targetCount = 5) {
  let cleaned = Array.isArray(blocks) ? blocks.map((block) => cleanBlockText(block)).filter(Boolean) : [];
  if (cleaned.length === targetCount) return cleaned;

  const fallbackText = cleanText(rawFallback || cleaned.join(' '));
  const split = splitRawTextIntoBlocks(fallbackText, targetCount);
  if (split.length === targetCount) return split;

  if (cleaned.length > targetCount) {
    const merged = cleaned.slice(0, targetCount - 1);
    merged.push(cleaned.slice(targetCount - 1).join(' '));
    return merged.map((block) => cleanText(block)).filter(Boolean);
  }

  if (cleaned.length > 0 && cleaned.length < targetCount) {
    const joined = cleaned.join(' ');
    const resplit = splitRawTextIntoBlocks(joined, targetCount);
    if (resplit.length === targetCount) return resplit;
    const expanded = [...cleaned];
    while (expanded.length < targetCount) {
      const index = expanded.reduce((maxIndex, block, currentIndex) => cleanText(block).length > cleanText(expanded[maxIndex]).length ? currentIndex : maxIndex, 0);
      const block = cleanText(expanded[index]);
      if (block.length < 220) break;
      let cut = block.lastIndexOf('. ', Math.floor(block.length / 2) + 180);
      if (cut < Math.floor(block.length / 2) - 180) cut = block.indexOf('. ', Math.floor(block.length / 2));
      if (cut < 0 || cut > block.length - 120) cut = Math.floor(block.length / 2);
      const left = cleanText(block.slice(0, cut + 1));
      const right = cleanText(block.slice(cut + 1));
      if (!left || !right) break;
      expanded.splice(index, 1, left, right);
    }
    if (expanded.length === targetCount) return expanded;
  }

  return cleaned;
}
function parseLooseFullText(raw, expectedNumbers) {
  const text = extractJsonCandidate(raw);
  const chapters = [];
  for (let index = 0; index < expectedNumbers.length; index += 1) {
    const n = expectedNumbers[index];
    const targetCount = textBlockTargetFor(n);
    const marker = new RegExp('"n"\\s*:\\s*' + n + '\\b');
    const match = marker.exec(text);
    let segment = '';
    if (match) {
      const start = Math.max(0, text.lastIndexOf('{', match.index));
      const nextN = expectedNumbers[index + 1];
      const nextMatch = nextN ? new RegExp('"n"\\s*:\\s*' + nextN + '\\b').exec(text.slice(match.index + 1)) : null;
      const end = nextMatch ? match.index + 1 + nextMatch.index : text.length;
      segment = text.slice(start, end);
    }
    let blocks = segment ? extractStringValuesAfterKey(segment, 'textBlocks', 12) : [];
    if (blocks.length !== targetCount) {
      const keyedBlocks = Array.from({ length: targetCount }, (_, keyIndex) => 'text' + (keyIndex + 1)).map((key) => readStringField(segment, key)).filter(Boolean);
      if (keyedBlocks.length) blocks = keyedBlocks;
    }
    blocks = normalizeTextBlocks(blocks, segment, targetCount);
    if (blocks.length !== targetCount) return null;
    chapters.push({
      n,
      title: readStringField(segment, 'title') || 'Глава ' + n,
      summary: readStringField(segment, 'summary') || '',
      visualBrief: readStringField(segment, 'visualBrief') || '',
      heroNumbers: extractStringValuesAfterKey(segment, 'heroNumbers', 12).map(Number).filter(Number.isFinite),
      requiredObjects: extractStringValuesAfterKey(segment, 'requiredObjects', 6),
      objectScale: readStringField(segment, 'objectScale') || '',
      forbiddenElements: extractStringValuesAfterKey(segment, 'forbiddenElements', 3),
      textBlocks: blocks,
    });
  }
  return {
    bookTitle: readStringField(text, 'bookTitle'),
    subtitle: readStringField(text, 'subtitle'),
    coverSummary: readStringField(text, 'coverSummary'),
    readerBlurb: readStringField(text, 'readerBlurb'),
    coverArtBrief: readStringField(text, 'coverArtBrief'),
    artifactCanon: readStringField(text, 'artifactCanon'),
    outfitCanon: readStringField(text, 'outfitCanon'),
    chapters,
  };
}
function parseGeminiJson(raw, expectedNumbers) {
  const candidate = extractJsonCandidate(raw);
  const escaped = escapeControlCharsInsideStrings(candidate);
  const attempts = [candidate, escaped, repairLikelyJson(escaped)];
  let lastError;
  for (const attempt of attempts) {
    try { return JSON.parse(attempt); } catch (error) { lastError = error; }
  }
  const loose = parseLooseFullText(raw, expectedNumbers);
  if (loose) return loose;
  throw new Error('Gemini full-text response was not valid JSON after repair: ' + (lastError?.message || 'unknown parse error'));
}
const MIN_ACCEPTABLE_BLOCK_CHARACTERS = 780;
const MIN_REPAIRED_BLOCK_CHARACTERS = 760;
const MAX_REPAIRED_BLOCK_CHARACTERS = 950;
function volumeReport(chapters) {
  const chapterReports = chapters.map((chapter) => {
    const blockCharacters = (chapter.textBlocks || []).map((block) => cleanText(block).length);
    return {
      n: Number(chapter.n),
      characters: blockCharacters.reduce((sum, length) => sum + length, 0),
      blockCharacters,
      shortBlockIndexes: blockCharacters.map((length, index) => length < MIN_ACCEPTABLE_BLOCK_CHARACTERS ? index : -1).filter((index) => index >= 0),
    };
  });
  return {
    characters: chapterReports.reduce((sum, chapter) => sum + chapter.characters, 0),
    shortBlockCount: chapterReports.reduce((sum, chapter) => sum + chapter.shortBlockIndexes.length, 0),
    chapters: chapterReports,
  };
}
function lowerCaseSchemaTypes(value) {
  if (Array.isArray(value)) return value.map(lowerCaseSchemaTypes);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = key === 'type' && typeof child === 'string' ? child.toLowerCase() : lowerCaseSchemaTypes(child);
  }
  return result;
}

function openAIOutputText(response) {
  return (response?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === 'output_text')
    .map((item) => item.text || '')
    .join('')
    .trim();
}

async function requestOpenAIText(geminiRequest, model, schemaName, timeout) {
  const systemText = (geminiRequest?.systemInstruction?.parts || []).map((part) => part.text || '').join('\n').trim();
  const inputText = (geminiRequest?.contents || []).flatMap((content) => content?.parts || []).map((part) => part.text || '').filter(Boolean).join('\n').trim();
  const body = {
    model,
    instructions: systemText || undefined,
    input: inputText,
    max_output_tokens: geminiRequest?.generationConfig?.maxOutputTokens || 12000,
    text: { format: { type: 'json_object' } },
  };
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    headers: { Authorization: 'Bearer ' + $env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
    body,
    json: true,
    timeout: timeout || 240000,
  });
  const text = openAIOutputText(response);
  if (!text) throw new Error('OpenAI returned no structured text');
  return {
    candidates: [{ content: { parts: [{ text }] }, finishReason: response.status || 'completed' }],
    responseId: response.id || null,
    openaiResponseId: response.id || null,
  };
}

async function expandShortBlocksOnce(chapters, bible) {
  const before = volumeReport(chapters);
  if (!before.shortBlockCount) return { chapters, correction: { status: 'not_needed', attempted: false, before, after: before } };

  const requested = [];
  for (const chapter of chapters) {
    const blocks = chapter.textBlocks || [];
    blocks.forEach((block, index) => {
      if (cleanText(block).length >= MIN_ACCEPTABLE_BLOCK_CHARACTERS) return;
      requested.push({
        chapter: Number(chapter.n),
        chapterTitle: chapter.title || 'Глава ' + chapter.n,
        chapterSummary: chapter.summary || '',
        blockIndex: index,
        currentCharacters: cleanText(block).length,
        previousBlock: index > 0 ? blocks[index - 1] : '',
        currentBlock: block,
        nextBlock: index + 1 < blocks.length ? blocks[index + 1] : '',
      });
    });
  }

  const heroes = (source.order?.heroes || []).map((hero) => [hero.name, hero.description, hero.relation].filter(Boolean).join(' — ')).filter(Boolean).join('; ');
  const requestedContext = chapters.map((chapter) => {
    const shortBlockIndexes = requested.filter((item) => item.chapter === Number(chapter.n)).map((item) => item.blockIndex);
    if (!shortBlockIndexes.length) return null;
    return {
      chapter: Number(chapter.n),
      chapterTitle: chapter.title || 'Глава ' + chapter.n,
      chapterSummary: chapter.summary || '',
      shortBlockIndexes,
      textBlocks: chapter.textBlocks || [],
    };
  }).filter(Boolean);
  const prompt = [
    'Локально расширь только перечисленные короткие печатные блоки персональной книги на русском языке.',
    'Верни по одному исправленному тексту для каждой запрошенной пары chapter + blockIndex и ничего больше.',
    'Каждый исправленный блок должен содержать 780-840 знаков; допустимый жесткий диапазон 760-950 знаков.',
    'Сохрани события, порядок действий, имена, возраст, отношения, факты, тон, финал и связь с соседними блоками.',
    'Добавляй только наблюдаемое действие, конкретную деталь пространства, небольшую реакцию героя, естественный переход и при необходимости одну короткую реплику.',
    'Запрещено добавлять новое испытание, нового постоянного персонажа, новую магическую способность, новый сюжетный поворот или новую мораль.',
    'Не пересказывай соседние абзацы, не повторяй вывод истории и не раздувай текст декоративными эпитетами.',
    'Прямую речь оформляй русским тире без кавычек. Не используй markdown и переносы строк внутри текста блока.',
    '',
    'Название: ' + cleanStoryText(bible?.bookTitle || ''),
    'Сквозная линия: ' + cleanStoryText(bible?.throughline || ''),
    'Место: ' + cleanStoryText(source.order?.location || bible?.location || ''),
    'Важная деталь: ' + cleanStoryText((source.order?.approvedStoryBrief ? source.order?.approvedArtifactCanon : source.order?.artifact) || bible?.artifactCanon || bible?.artifact || ''),
    'Герои: ' + heroes,
    '',
    'Главы и индексы блоков для исправления:',
    JSON.stringify(requestedContext),
  ].join('\n');

  try {
    const correctionRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
        topP: 0.85,
        maxOutputTokens: 16000,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            corrections: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: { chapter: { type: 'NUMBER' }, blockIndex: { type: 'NUMBER' }, text: { type: 'STRING' } },
                required: ['chapter', 'blockIndex', 'text'],
              },
            },
          },
          required: ['corrections'],
        },
      },
    };
    const correctionProvider = String(source.order?.textProvider || 'gemini').toLowerCase();
    const correctionModel = correctionProvider === 'openlux' ? (source.order?.openluxTextModel || 'gemini-2.5-pro') : (source.geminiModel || 'gemini-2.5-pro');
    const correctionApiKey = correctionProvider === 'openlux' ? $env.OPENLUX_API_KEY : $env.GEMINI_API_KEY;
    const correctionResponse = correctionProvider === 'openai'
      ? await requestOpenAIText.call(this, correctionRequest, source.order?.openaiTextModel || 'gpt-5.6-terra', 'fairyteller_short_block_correction', 240000)
      : (correctionProvider === 'openlux' && /^grok-/i.test(correctionModel)
        ? await requestOpenLuxChat.call(this, correctionRequest, correctionModel, 'fairyteller_short_block_correction', 240000)
        : await this.helpers.httpRequest({
          method: 'POST',
          url: (correctionProvider === 'openlux' ? 'https://api.openlux.ai' : 'https://generativelanguage.googleapis.com') + '/v1beta/models/' + encodeURIComponent(correctionModel) + ':generateContent',
          headers: correctionProvider === 'openlux'
            ? { Authorization: 'Bearer ' + correctionApiKey, 'Content-Type': 'application/json' }
            : { 'x-goog-api-key': correctionApiKey, 'Content-Type': 'application/json' },
          body: correctionRequest,
          json: true,
          timeout: 240000,
        }));
    const correctionRaw = collectText(correctionResponse);
    if (!correctionRaw) throw new Error('empty correction response');
    const candidate = extractJsonCandidate(correctionRaw);
    const escaped = escapeControlCharsInsideStrings(candidate);
    let parsed;
    for (const attempt of [candidate, escaped, repairLikelyJson(escaped)]) {
      try { parsed = JSON.parse(attempt); break; } catch {}
    }
    if (!parsed || !Array.isArray(parsed.corrections)) throw new Error('correction response is not valid JSON');

    const requestedKeys = new Set(requested.map((item) => item.chapter + ':' + item.blockIndex));
    const replacements = new Map();
    let rejectedCount = 0;
    for (const item of parsed.corrections) {
      const chapter = Number(item.chapter);
      const blockIndex = Number(item.blockIndex);
      const key = chapter + ':' + blockIndex;
      if (!requestedKeys.has(key) || replacements.has(key)) { rejectedCount += 1; continue; }
      const text = normalizeGeneratedStoryText(item.text);
      if (text.length < MIN_REPAIRED_BLOCK_CHARACTERS || text.length > MAX_REPAIRED_BLOCK_CHARACTERS) { rejectedCount += 1; continue; }
      replacements.set(key, text);
    }

    const updatedChapters = chapters.map((chapter) => {
      const textBlocks = (chapter.textBlocks || []).map((block, index) => replacements.get(Number(chapter.n) + ':' + index) || block);
      return { ...chapter, textBlocks, text: textBlocks.join('\n\n') };
    });
    const after = volumeReport(updatedChapters);
    return {
      chapters: updatedChapters,
      correction: {
        status: replacements.size ? (after.shortBlockCount ? 'partially_applied' : 'applied') : 'no_valid_replacements',
        attempted: true,
        requestedBlockCount: requested.length,
        appliedBlockCount: replacements.size,
        rejectedCount,
        before,
        after,
        model: (source.order?.textProvider === 'openai' ? (source.order?.openaiTextModel || 'gpt-5.6-terra') : (source.order?.textProvider === 'openlux' ? (source.order?.openluxTextModel || 'gemini-2.5-pro') : (source.geminiModel || 'gemini-2.5-pro'))),
        responseId: correctionResponse.responseId || null,
      },
    };
  } catch (error) {
    return {
      chapters,
      correction: {
        status: 'failed_open',
        attempted: true,
        requestedBlockCount: requested.length,
        appliedBlockCount: 0,
        error: cleanText(error?.message || error).slice(0, 500),
        before,
        after: before,
      },
    };
  }
}
async function patchFullTextFailure(error) {
  const message = 'Не удалось подготовить полный текст книги после автоматических повторов.';
  const cause = cleanText(error?.message || error).slice(0, 500);
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: 'https://fairyteller.ru/api/fairyteller/jobs/' + source.jobId,
      headers: {
        Authorization: 'Bearer ' + $env.FAIRYTELLER_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: {
        status: 'failed',
        stage: 'text',
        progress: 55,
        message,
        error: { message, technicalMessage: cause, node: 'Normalize Full Text' },
        artifacts: {
          fullText: { status: 'failed', error: cause },
        },
      },
      json: true,
      timeout: 30000,
    });
  } catch (patchError) {
    console.log('Failed to mark full text retry after normalize error: ' + String(patchError?.message || patchError));
  }
}

try {
const rawText = collectText(response);
if (!rawText) throw new Error('Selected text provider returned an empty full-text response');
const expectedNumbers = (source.laterPlan || []).map((chapter) => Number(chapter.n));
const generated = parseGeminiJson(rawText, expectedNumbers);
const laterChapters = Array.isArray(generated.chapters) ? generated.chapters : [];
const normalizedLater = laterChapters.map((chapter, index) => {
  const n = Number(chapter.n || expectedNumbers[index] || index + 2);
  const targetCount = textBlockTargetFor(n);
  const rawBlocks = Array.isArray(chapter.textBlocks)
    ? chapter.textBlocks
    : Array.from({ length: targetCount }, (_, keyIndex) => 'text' + (keyIndex + 1)).map((key) => chapter[key]).filter(Boolean);
  const rawFallback = chapter.text || rawBlocks.join(' ');
  const cleanedBlocks = rawBlocks.map(localBlockText);
  const layoutIssues = localChapterContentIssues({ n, textBlocks: cleanedBlocks });
  if (layoutIssues.length) throw new Error(layoutIssues.join("; "));
  const availableHeroNumbers = new Set((source.order?.heroes || []).map((hero) => Number(hero.n)).filter(Number.isFinite));
  const fixedPlan = chapter.visualSource === 'written_chapter' ? chapter : ((source.text?.bible?.chapterPlan || []).find((planned) => Number(planned.n) === n) || {});
  const brief = visualBriefValue(fixedPlan.visualBrief || chapter.visualBrief);
  const heroNumbersRaw = Array.isArray(fixedPlan.heroNumbers) ? fixedPlan.heroNumbers : (Array.isArray(brief.heroNumbers) ? brief.heroNumbers : chapter.heroNumbers);
  const heroNumbers = (Array.isArray(heroNumbersRaw) ? heroNumbersRaw : []).map(Number).filter((heroNumber) => Number.isFinite(heroNumber) && availableHeroNumbers.has(heroNumber));
  const useArtifactCanon = fixedPlan.useArtifactCanon === true || brief.useArtifactCanon === true || chapter.useArtifactCanon === true;
  return { n, title: localChapterTitle(chapter.title), summary: cleanStoryText(chapter.summary), visualBrief: cleanStoryText(fixedPlan.visualBrief || brief.scene || brief.description || brief.action || chapter.visualBrief), heroNumbers: [...new Set(heroNumbers)], shotType: cleanStoryText(fixedPlan.shotType || brief.shotType || chapter.shotType), physicalPlacement: cleanStoryText(fixedPlan.physicalPlacement || ''), spatialRelations: (Array.isArray(fixedPlan.spatialRelations) ? fixedPlan.spatialRelations : []).map(cleanStoryText).filter(Boolean).slice(0, 3), forbiddenMisreads: (Array.isArray(fixedPlan.forbiddenMisreads) ? fixedPlan.forbiddenMisreads : []).map(cleanStoryText).filter(Boolean).slice(0, 3), useArtifactCanon, artifactRole: useArtifactCanon ? cleanStoryText(fixedPlan.artifactRole || brief.artifactRole || chapter.artifactRole) : '', requiredObjects: (Array.isArray(fixedPlan.requiredObjects) ? fixedPlan.requiredObjects : (Array.isArray(brief.requiredObjects) ? brief.requiredObjects : (Array.isArray(chapter.requiredObjects) ? chapter.requiredObjects : []))).map(cleanStoryText).filter(Boolean).slice(0, 4), objectScale: useArtifactCanon ? cleanStoryText(fixedPlan.objectScale || brief.objectScale || chapter.objectScale) : '', forbiddenElements: (Array.isArray(fixedPlan.forbiddenElements) ? fixedPlan.forbiddenElements : (Array.isArray(brief.forbiddenElements) ? brief.forbiddenElements : (Array.isArray(chapter.forbiddenElements) ? chapter.forbiddenElements : []))).map(cleanStoryText).filter(Boolean).slice(0, 3), backgroundPeople: cleanStoryText(chapter.backgroundPeople || ''), supportingPeopleQuote: chapter.supportingPeopleQuote || '', visualSource: chapter.visualSource || 'chapter_plan', visualSourceText: chapter.visualSourceText ? normalizeGeneratedStoryText(chapter.visualSourceText) : '', visualSourceQuote: chapter.visualSourceQuote || '', textBlocks: cleanedBlocks, text: cleanedBlocks.join('\n\n'), status: 'ready' };
}).filter((chapter) => expectedNumbers.includes(chapter.n));
if (normalizedLater.length !== expectedNumbers.length) {
  throw new Error('Expected later chapters ' + expectedNumbers.join(', ') + ', got ' + normalizedLater.map((chapter) => chapter.n).join(', '));
}
const firstChapter = source.text?.chapters?.[0];
if (!firstChapter) throw new Error('Missing first chapter from upstream text payload');
const firstChapterTarget = textBlockTargetFor(1);
const firstRawBlocks = Array.isArray(firstChapter.textBlocks) ? firstChapter.textBlocks : [firstChapter.text].filter(Boolean);
const firstTextBlocks = firstRawBlocks.map(localBlockText);
const firstIssues = localChapterContentIssues({ n: 1, textBlocks: firstTextBlocks });
if (firstIssues.length) throw new Error(firstIssues.join('; '));
const normalizedFirstChapter = { ...firstChapter, title: localChapterTitle(firstChapter.title), summary: cleanStoryText(firstChapter.summary), textBlocks: firstTextBlocks, text: firstTextBlocks.join('\n\n') };
const chapters = [normalizedFirstChapter, ...normalizedLater].sort((a, b) => Number(a.n) - Number(b.n));
const measuredVolume = volumeReport(chapters);
const volumeControlResult = {
  correction: {
    status: 'measured_only',
    attempted: false,
    targetBlockCharacters: { min: 780, max: 820, ideal: 800 },
    before: measuredVolume,
    after: measuredVolume,
  },
};
const readerBlurb = sanitizeReaderBlurb(generated.readerBlurb || generated.coverSummary);
const coverArtBrief = sanitizeCoverArtBrief(
  source.text?.bible?.coverArtBrief || generated.coverArtBrief,
  source.text?.preview?.visualBrief || source.text?.preview?.summary || generated.readerBlurb || generated.coverSummary || '',
);
const fullText = {
  printLayout: { ...LOCAL_PRINT_LAYOUT },
  bible: { ...(source.text?.bible || {}), bookTitle: cleanStoryText(generated.bookTitle || source.text?.bible?.bookTitle || ''), subtitle: cleanStoryText(generated.subtitle || source.text?.bible?.subtitle || ''), coverSummary: readerBlurb, readerBlurb, coverArtBrief, artifactCanon: cleanStoryText(source.order?.approvedArtifactCanon || source.text?.bible?.artifactCanon || (source.order?.approvedStoryBrief ? '' : source.order?.artifact) || ''), outfitCanon: normalizeOutfitCanon(source.text?.bible?.outfitCanon || generated.outfitCanon || ''), coverPhysicalPlacement: cleanStoryText(source.text?.bible?.coverPhysicalPlacement || ''), coverSpatialRelations: (Array.isArray(source.text?.bible?.coverSpatialRelations) ? source.text.bible.coverSpatialRelations : []).map(cleanStoryText).filter(Boolean).slice(0, 3), coverForbiddenMisreads: (Array.isArray(source.text?.bible?.coverForbiddenMisreads) ? source.text.bible.coverForbiddenMisreads : []).map(cleanStoryText).filter(Boolean).slice(0, 3), protagonistMode: source.protagonistMode || source.text?.bible?.protagonistMode || '' },
  preview: source.text?.preview || null,
  chapters,
  generation: { provider: (source.order?.textProvider || 'gemini'), model: (source.order?.textProvider === 'openai' ? (source.order?.openaiTextModel || 'gpt-5.6-terra') : (source.order?.textProvider === 'openlux' ? (source.order?.openluxTextModel || 'gemini-2.5-pro') : (source.geminiModel || 'gemini-2.5-pro'))), stage: 'full_text', responseId: response.responseId || null, durableFullText: response.durableFullText || null, volumeCorrection: volumeControlResult.correction },
};
return [{ json: { ...source, status: 'full_text_ready', text: fullText, fullText: { status: 'layout_pending', chapterCount: chapters.length, laterChapterCount: normalizedLater.length, volumeControl: volumeControlResult.correction } } }];
} catch (error) {
  await patchFullTextFailure.call(this, error);
  throw error;
}

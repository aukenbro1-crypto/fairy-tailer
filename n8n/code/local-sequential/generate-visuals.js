const source = $input.first().json;
const jobId = source.jobId;
if (!jobId) throw new Error('Missing jobId for full visuals');
const text = source.text || {};
const order = source.order || {};
const writtenChapters = (text.chapters || []).filter((chapter) => Number(chapter.n) > 1);
const plannedChapters = (text.bible?.chapterPlan || []).filter((chapter) => Number(chapter.n) > 1).map((chapter) => ({ ...chapter, summary: chapter.beat || chapter.summary || '', text: '', textBlocks: [] }));
const chapters = (writtenChapters.length ? writtenChapters : plannedChapters).sort((a, b) => Number(a.n) - Number(b.n));
const INTERIOR_IMAGE_TARGET = {
  role: 'interior_chapter_image_page',
  pageSizeMm: [136, 136],
  aspectRatio: '1:1',
  printDpiEquivalent: 'about 1606 x 1606 px at 300 DPI',
  placement: 'right-hand full-page chapter opener illustration',
  safety: 'full bleed square composition; keep faces, hands, key props and readable silhouettes away from the left 15% gutter/spine zone and the outer 3mm trim edge',
};
if (!chapters.length) throw new Error('No continuation chapters found for full visuals');

function qaText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inlineImagePart(response) {
  return (response?.candidates?.[0]?.content?.parts || []).find((part) => part?.inlineData?.data) || null;
}

function parseVisualQaResponse(response) {
  const raw = (response?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || '').join('').trim();
  if (!raw) throw new Error('visual QA returned no text');
  const candidate = raw.replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/i, '').trim();
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  const parsed = JSON.parse(first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate);
  const verdict = String(parsed.verdict || '').toLowerCase() === 'retry' ? 'retry' : 'pass';
  const severity = ['major', 'minor', 'none'].includes(String(parsed.severity || '').toLowerCase()) ? String(parsed.severity).toLowerCase() : (verdict === 'retry' ? 'major' : 'none');
  return {
    status: 'completed',
    verdict,
    severity,
    issues: (Array.isArray(parsed.issues) ? parsed.issues : []).map(qaText).filter(Boolean).slice(0, 5),
    repairInstruction: qaText(parsed.repairInstruction || '').slice(0, 900),
  };
}

async function runVisualQa(imagePart, contract, label) {
  const enabled = String($env.FAIRYTELLER_VISUAL_QA_ENABLED || '0') === '1';
  if (!enabled) return { status: 'disabled', verdict: 'pass', severity: 'none', issues: [], repairInstruction: '' };
  if (!imagePart?.inlineData?.data) return { status: 'skipped_no_image', verdict: 'pass', severity: 'none', issues: [], repairInstruction: '' };
  if (!$env.OPENLUX_API_KEY) return { status: 'skipped_no_key', verdict: 'pass', severity: 'none', issues: [], repairInstruction: '' };
  const model = $env.FAIRYTELLER_VISUAL_QA_MODEL || 'gemini-2.5-flash';
  const prompt = [
    'You are a strict but conservative visual QA gate for one generated book illustration.',
    'Compare only clearly visible facts in the image with the supplied contract. Do not judge beauty, taste, facial likeness to a private person, tiny color shifts caused by lighting, or details hidden by crop/pose.',
    'Return verdict retry with severity major only for an unambiguous purchase-damaging mismatch: a hero is on/in the wrong support or environment; the main action or spatial relationship is wrong; a required visible object is missing; a forbidden object/person/text appears; visible wardrobe clearly contradicts the outfit canon; hero count is clearly wrong; duplicated bodies or gross anatomy break the scene.',
    'Profiled hero IDs count only the mapped heroes; backgroundPeople separately authorizes supporting people. Do not reject an explicitly authorized crowd as extra heroes. Projection/reflection is not a second physical body.',
    'Return pass for minor ambiguity, acceptable artistic interpretation, partially occluded clothing, distant figures where clothing cannot be verified, or a contract field that is empty.',
    'If retry is required, repairInstruction must be one compact imperative paragraph describing only the necessary corrections while preserving correct identity, composition, style, lighting and story action.',
    'QA label: ' + label,
    'CONTRACT JSON:',
    JSON.stringify(contract),
  ].join('\n');
  const body = {
    contents: [{ role: 'user', parts: [
      { text: prompt },
      { inlineData: { mimeType: imagePart.inlineData.mimeType || 'image/png', data: imagePart.inlineData.data } },
    ] }],
    generationConfig: {
      temperature: 0.05,
      maxOutputTokens: 900,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          verdict: { type: 'STRING' },
          severity: { type: 'STRING' },
          issues: { type: 'ARRAY', items: { type: 'STRING' } },
          repairInstruction: { type: 'STRING' },
        },
        required: ['verdict', 'severity', 'issues', 'repairInstruction'],
      },
    },
  };
  try {
    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openlux.ai/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      headers: { Authorization: 'Bearer ' + $env.OPENLUX_API_KEY, 'Content-Type': 'application/json' },
      body,
      json: true,
      timeout: 90000,
    });
    return { ...parseVisualQaResponse(response), model };
  } catch (error) {
    return { status: 'unavailable', verdict: 'pass', severity: 'none', issues: [], repairInstruction: '', model, error: qaText(error?.message || error).slice(0, 400) };
  }
}

function shouldRetryVisualQa(result) {
  return result?.status === 'completed' && result.verdict === 'retry' && result.severity === 'major' && Boolean(result.repairInstruction);
}

function visualQaRepairPrompt(prompt, result) {
  return String(prompt || '').trim() + '\n\n[AUTOMATIC VISUAL QA REPAIR — HIGHEST PRIORITY]\n' + result.repairInstruction + '\nPreserve every already-correct hero identity, age, story outfit, illustration style, lighting and scene element. Do not add new people, objects, text or plot events.';
}


async function apiRequest(options) {
  return await this.helpers.httpRequest({
    ...options,
    headers: {
      Authorization: 'Bearer ' + $env.FAIRYTELLER_API_TOKEN,
      ...(options.headers || {}),
    },
    json: true,
  });
}

async function patchJob(body) {
  return await apiRequest.call(this, {
    method: 'PATCH',
    url: 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId,
    headers: { 'Content-Type': 'application/json' },
    body,
    timeout: 30000,
  });
}

async function fetchJsonArtifact(fileName) {
  return await apiRequest.call(this, {
    method: 'GET',
    url: 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId + '/artifacts/' + fileName,
    timeout: 30000,
  });
}

async function fetchVisualsArtifactWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= 96; attempt += 1) {
    try {
      const artifact = await fetchJsonArtifact.call(this, 'visuals.json');
      if (artifact?.visuals?.visualBible) return artifact;
      lastError = new Error('visuals.json exists but visualBible is missing');
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('visuals.json was not ready for full visuals: ' + (lastError?.message || 'unknown error'));
}

async function fetchImageBase64(url) {
  if (!url) return null;
  const absoluteUrl = url.startsWith('http') ? url : 'https://fairyteller.ru' + url;
  const separator = absoluteUrl.includes('?') ? '&' : '?';
  const payload = await apiRequest.call(this, {
    method: 'GET',
    url: absoluteUrl + separator + 'base64=1',
    timeout: 30000,
  });
  if (!payload?.contentBase64) throw new Error('Fetched reference image has no base64 content');
  return { mimeType: payload.contentType || 'image/png', data: payload.contentBase64, bytes: payload.bytes || Buffer.from(payload.contentBase64, 'base64').length };
}

async function fetchReferenceImages(visuals, visualBible) {
  const cards = (visualBible?.heroReferenceCards || visuals.heroReferenceCards || []).filter((card) => card.status === 'ready' && card.url);
  const images = [];
  for (const card of cards) {
    const image = await fetchImageBase64.call(this, card.url);
    if (image?.data) {
      images.push({ ...image, type: 'hero_card', hero: card.hero, name: card.name || '', ageGroup: card.ageGroup || 'unknown', url: card.url });
    }
  }

  const expectedHeroCount = (visualBible?.characters || visuals.characters || order.heroes || [])
    .filter((hero) => hero?.name || hero?.description || hero?.referenceCardUrl || hero?.hasPhoto || hero?.ageGroup).length;
  const readyCardHeroCount = new Set(images.filter((image) => image.type === 'hero_card').map((image) => Number(image.hero))).size;
  const hasPortraitSheet = visuals.portraitSheet?.status === 'ready' && visuals.portraitSheet?.url;
  const needsPortraitSheet = hasPortraitSheet && (!images.length || (expectedHeroCount > 0 && readyCardHeroCount < expectedHeroCount));

  if (needsPortraitSheet) {
    const image = await fetchImageBase64.call(this, visuals.portraitSheet.url);
    if (image?.data) {
      images.push({ ...image, type: 'portrait_sheet', hero: null, name: 'combined reference sheet', ageGroup: 'mixed', url: visuals.portraitSheet.url });
    }
  }

  return images;
}

function referenceMapLines(referenceImages) {
  return referenceImages.map((image, index) => {
    if (image.type === 'hero_card') return 'Attached reference image ' + (index + 1) + ' = Hero ' + image.hero + ' (' + (image.name || 'unnamed') + '), age group ' + (image.ageGroup || 'unknown');
    return 'Attached reference image ' + (index + 1) + ' = combined hero reference sheet';
  }).join('\n');
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function safetyCleanText(value) {
  let text = cleanText(value);
  const replacements = [
    [/\bfinal battle\b/gi, 'final magical choice'],
    [/\bbattle\b/gi, 'dramatic magical confrontation'],
    [/\bfight\b/gi, 'brave challenge'],
    [/\battack\b/gi, 'approach'],
    [/\bweapon\b/gi, 'ancient artifact'],
    [/\bblood\b/gi, 'red light'],
    [/\bdeath\b/gi, 'danger'],
    [/\bkill\b/gi, 'stop'],
    [/\bevil\b/gi, 'mysterious dark force'],
    [/\bdarkness\b/gi, 'shadowed atmosphere'],
    [/\bantagonist\b/gi, 'mysterious rival'],
    [/\bthreat\b/gi, 'mystery'],
    [/битв[а-я]*/gi, 'магическое испытание'],
    [/сражен[а-я]*/gi, 'магическое испытание'],
    [/бой/gi, 'испытание'],
    [/атак[а-я]*/gi, 'приближение'],
    [/оружи[а-я]*/gi, 'древний артефакт'],
    [/ледоруб[а-я]*/gi, 'альпинистский ледовый инструмент'],
    [/\bice\s*(?:pick|axe)\b/gi, 'mountaineering ice axe tool'],
    [/кров[а-я]*/gi, 'красный свет'],
    [/смерт[а-я]*/gi, 'опасность'],
    [/уби[а-я]*/gi, 'остановить'],
    [/зло/gi, 'таинственная сила'],
    [/тьм[а-я]*/gi, 'теневая атмосфера'],
    [/антагонист[а-я]*/gi, 'таинственный соперник'],
    [/приспешник[а-я]*/gi, 'таинственная фигура'],
    [/угроз[а-я]*/gi, 'тайна'],
  ];
  for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
  return text;
}

function visualSafetySceneText(value) {
  return safetyCleanText(value)
    .replace(/предупрежда[а-я]*\s+об\s+опасн[а-я]*/gi, 'объясняет правило дальнейшего пути')
    .replace(/попасть\s+в\s+ловушк[а-я]*/gi, 'встретить препятствие')
    .replace(/вход\s+запрещен/gi, 'закрытый вход')
    .replace(/проникает\s+туда/gi, 'исследует это место')
    .replace(/проника[а-я]*/gi, 'исследует')
    .replace(/взлом[а-я]*/gi, 'открывает старый механизм')
    .replace(/опасн[а-я]*/gi, 'сложный путь')
    .replace(/ловушк[а-я]*/gi, 'препятствие')
    .replace(/охранн[а-я]*\s+систем[а-я]*/gi, 'старый защитный механизм')
    .replace(/нарушител[а-я]*/gi, 'путешественник')
    .replace(/монтировк[а-я]*/gi, 'ручной инструмент')
    .replace(/погиб[а-я]*/gi, 'не вернуться вовремя')
    .replace(/угрожа[а-я]*/gi, 'предупреждает')
    .replace(/сталкиваются\s+с/gi, 'оказываются рядом с')
    .replace(/напада[а-я]*/gi, 'приближается');
}

function safeImportantObject(value) {
  const text = cleanText(value);
  if (/ледоруб/i.test(text)) return 'альпинистский ледовый инструмент / ice axe as safe mountaineering equipment, held calmly as travel gear, not a weapon';
  if (/ice\s*(pick|axe)/i.test(text)) return 'ice axe as safe mountaineering equipment, held calmly as travel gear, not a weapon';
  return safetyCleanText(text);
}

function normalizeStylePrompt(value) {
  let prompt = safetyCleanText(value || 'photorealistic cinematic book illustration, realistic people, natural light, print-ready composition');
  prompt = prompt.replace(/original character designs?/gi, 'faithful rendering of the attached identity references').replace(/original characters?/gi, 'faithful rendering of the attached identity references');
  prompt = prompt.replace(/use uploaded photos as strong identity references when available;?/ig, 'use the attached generated character reference cards as required visual canon; preserve the same face shape, hairline, hair, facial hair/accessories, age, clothing colors, body type and silhouette;');
  if (/photorealistic|realistic/i.test(prompt)) {
    prompt += ' Use only the attached generated character reference material as the required visual canon; avoid injury, weapons, gore, scary violence, or aggressive action.';
  }
  return prompt;
}

function normalizeWorldVisual(value) {
  let result = safetyCleanText(value);
  if (order.illustrationStyle === 'photorealistic') {
    result = result
      .replace(/textured painterly surfaces?/gi, 'natural material textures')
      .replace(/painterly/gi, 'photographic')
      .replace(/watercolou?r/gi, 'natural color')
      .replace(/storybook/gi, 'cinematic')
      .replace(/illustrated/gi, 'photographic');
    result += ' Rendering technique is strictly camera-like photorealism with natural skin and materials, plausible lens depth, coherent anatomy and physically believable light.';
  }
  return safetyCleanText(result);
}

function compactChapterText(chapter) {
  const raw = chapter.text || (Array.isArray(chapter.textBlocks) ? chapter.textBlocks.join(' ') : '');
  return safetyCleanText(raw).slice(0, 900);
}

function safeChapterScene(chapter) {
  const summary = visualSafetySceneText(chapter.summary || '');
  if (Number(chapter.n) === 4) {
    const safeSummary = summary
      .replace(/сталкиваются\s+с/gi, 'оказываются рядом с')
      .replace(/сталкива[а-я]*/gi, 'встречают')
      .replace(/противосто[а-я]*/gi, 'наблюдают')
      .replace(/напада[а-я]*/gi, 'приближаются');
    return [
      'Calm chapter-four discovery and decision tableau, not a confrontation or attack.',
      'Keep the main heroes together in the foreground or middle ground. Place any antagonist or opposing figure at a respectful distance with a neutral, readable pose; no threatening gestures, weapons, chase, injury, horror or aggressive action.',
      'Visualize tension through distance, environment, light, a portal, a magical source, a meaningful gesture or a change in the environment. Preserve wonder and leave room for a hopeful resolution.',
      safeSummary,
    ].join(' ').slice(0, 900);
  }
  return summary.slice(0, 700);
}

function characterLine(hero) {
  const label = hero.name || ('Hero ' + (hero.hero || hero.n || ''));
  const age = hero.ageGroup || 'unknown';
  const ageNote = age === 'unknown' ? 'age group: unknown/infer from reference image' : 'age group: ' + age + ' (mandatory)';
  const ref = hero.referenceCardUrl ? 'reference card: ' + hero.referenceCardUrl : '';
  return [label, ageNote, ref, hero.description || '', hero.relation ? 'relation: ' + hero.relation : ''].filter(Boolean).join('; ');
}

function selectedReferenceImages(chapter, referenceImages) {
  const requested = new Set((Array.isArray(chapter.heroNumbers) ? chapter.heroNumbers : []).map(Number).filter(Number.isFinite));
  if (!requested.size) return referenceImages;
  const selected = referenceImages.filter((image) => image.type === 'hero_card' && requested.has(Number(image.hero)));
  const sheets = referenceImages.filter(image => image.type !== 'hero_card');
  return selected.length === requested.size ? selected : [...selected, ...sheets];
}

const SCENE_DETAIL_INSTRUCTION = 'Enrich this exact location with 3-5 story-relevant secondary details: believable architecture or furniture, material and surface texture, small traces of everyday life, and supporting props. Build readable foreground, middle ground and background layers. Keep the mapped heroes and current action as the unmistakable focal point. Supporting people are allowed only as listed in the written scene lock. Do not add unrelated people, duplicate heroes, readable text, random symbols or unrelated decoration. Use details specific to this chapter and avoid reusing the same background-prop arrangement as an adjacent chapter. Render all detail strictly in the selected STYLE; do not turn a simple, naive, watercolor, brick, clay, yarn or cartoon style into photorealism.';
const RETRY_DETAIL_INSTRUCTION = 'Use a visually rich, lived-in environment with layered foreground, middle ground and background and 3-5 story-relevant secondary details. Keep the hero and action dominant. Supporting people are allowed only as listed in the written scene lock. Do not add unrelated people, duplicate heroes, readable text or unrelated decoration. Preserve the selected rendering style.';
const WATERCOLOR_RENDERING_LOCK = "FULL-COLOR CLASSIC STORYBOOK ILLUSTRATION CONTRACT — HIGHEST PRIORITY:\nCreate a richly finished traditional fairy-tale book illustration built from colored-pencil drawing and dense dry opaque pigment on textured paper.\nUse fine pencil-drawn contours and thousands of short, overlapping directional strokes to construct faces, hair, clothing, foliage, stone, architecture, clouds and reflected light. Every surface must contain visible hand-made marks and subtle pencil texture.\nThe image must be fully colored and richly filled, not a sparse sketch. Use dense layered color with very little exposed white paper except for deliberate highlights.\nUse a warm luminous storybook palette: golden light, amber and ochre highlights, muted olive greens, earthy browns, dusty blue-grays and restrained accents. Create atmospheric depth through softer, lighter and less detailed distant scenery.\nCharacters must remain recognizable and anatomically believable, but clearly interpreted as hand-drawn book characters rather than photographic people. Preserve natural expressions, readable silhouettes and gently idealized storybook proportions.\nRender the environment with abundant narrative detail. Build surfaces from small visible pencil strokes rather than smooth digital gradients.\nThe finish must resemble a lavishly illustrated classic European fairy-tale book plate: tactile, warm, intricate, nostalgic and luminous.\nUse the attached references only to identify WHO the heroes are: face shape, age, hairstyle, proportions and distinctive features. The references never determine HOW the image is rendered.\nNo watercolor washes, wet-on-wet edges, transparent pigment blooms, sparse sketching, monochrome graphite, ink outlines, marker, pastel haze, smooth digital painting, vector surfaces, photographic skin, pores, lens realism, cinematic depth of field, hyperrealism, 3D render or photo-composite.\nRecognizable identity and unmistakable traditional storybook rendering are co-equal requirements. Never sacrifice the hand-rendered quality for facial precision.";
const WATERCOLOR_PRIORITY = "HARD PRIORITY ORDER: 1) richly finished traditional colored-pencil storybook rendering AND recognizable identity; 2) age and number of people; 3) scene action and relationships; 4) physical placement; 5) story outfit lock; 6) composition and print safety; 7) environmental detail.";
const GENERIC_IMAGE_PRIORITY = "HARD PRIORITY ORDER: 1) character identity and facial geometry; 2) age and number of people; 3) scene action and relationships; 4) physical placement and believable scene mechanics; 5) story outfit lock; 6) composition and print safety; 7) selected illustration style; 8) environmental detail. Preserve both identity and the selected rendering style.";
function watercolorRenderingLock(styleId, stylePrompt) {
  return String(styleId || '').toLowerCase() === 'watercolor' || /watercolou?r/i.test(String(stylePrompt || ''))
    ? WATERCOLOR_RENDERING_LOCK
    : '';
}
function illustrationPriority(styleId, stylePrompt) {
  return watercolorRenderingLock(styleId, stylePrompt) ? WATERCOLOR_PRIORITY : GENERIC_IMAGE_PRIORITY;
}

function chapterPrompt(chapter, visualBible, referenceImages) {
  const bible = text.bible || {};
  const world = visualBible?.world || {};
  const stylePrompt = normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'cinematic book illustration');
  const renderingLock = watercolorRenderingLock(visualBible?.style?.id || order.illustrationStyle, stylePrompt);
  const imagePriority = illustrationPriority(visualBible?.style?.id || order.illustrationStyle, stylePrompt);
  const referenceMap = referenceMapLines(referenceImages || []);
  const hasApprovedStoryBrief = Boolean(String(order.approvedStoryBrief || '').trim());
  const effectiveArtifactCanon = hasApprovedStoryBrief
    ? safetyCleanText(order.approvedArtifactCanon || bible.artifactCanon || '').slice(0, 360)
    : safetyCleanText(bible.artifactCanon || world.artifactCanon || world.artifact || order.artifact || bible.artifact || '').slice(0, 360);
  const useArtifactCanon = chapter.useArtifactCanon === true && Boolean(effectiveArtifactCanon);
  const artifactCanon = useArtifactCanon ? effectiveArtifactCanon : '';
  const outfitCanon = safetyCleanText(bible.outfitCanon || '');
  const requiredObjects = (Array.isArray(chapter.requiredObjects) ? chapter.requiredObjects : []).map(safetyCleanText).filter(Boolean).slice(0, 4).join('; ');
  const objectScale = useArtifactCanon ? safetyCleanText(chapter.objectScale || '').slice(0, 180) : '';
  const artifactRole = useArtifactCanon ? safetyCleanText(chapter.artifactRole || '').slice(0, 180) : '';
  const shotType = safetyCleanText(chapter.shotType || '').slice(0, 140);
  const forbiddenElements = (Array.isArray(chapter.forbiddenElements) ? chapter.forbiddenElements : []).map(safetyCleanText).filter(Boolean).slice(0, 3).join('; ');
  const physicalPlacement = safetyCleanText(chapter.physicalPlacement || '').slice(0, 360);
  const spatialRelations = (Array.isArray(chapter.spatialRelations) ? chapter.spatialRelations : []).map(safetyCleanText).filter(Boolean).slice(0, 3).join('; ');
  const forbiddenMisreads = (Array.isArray(chapter.forbiddenMisreads) ? chapter.forbiddenMisreads : []).map(safetyCleanText).filter(Boolean).slice(0, 3).join('; ');
  return [
    'Generate an IMAGE only. No explanatory text.',
    'Square 1:1 full-bleed book illustration for chapter ' + chapter.n + ', final page 136 x 136 mm.',
    'The generated pixels must fill all four edges. No frame, matte, inset picture, white border, image-within-an-image, readable text, letters, captions, labels, logos, UI or collage.',
    renderingLock,
    imagePriority,
    'STYLE: ' + stylePrompt,
    localSceneImagePrompt(chapter),
    'LOCATION: ' + safetyCleanText(world.location || order.location || bible.location || ''),
    artifactCanon ? 'OBJECT CANON: ' + artifactCanon : '',
    artifactRole ? 'OBJECT ROLE IN THIS SCENE: ' + artifactRole : '',
    shotType ? 'SHOT TYPE: ' + shotType : '',
    objectScale ? 'OBJECT SCALE LOCK: ' + objectScale : '',
    requiredObjects ? 'REQUIRED OBJECTS: ' + requiredObjects : '',
    localWardrobePrompt(outfitCanon),
    physicalPlacement ? 'PHYSICAL PLACEMENT — MANDATORY: ' + physicalPlacement : '',
    spatialRelations ? 'SPATIAL RELATIONS — MANDATORY: ' + spatialRelations : '',
    forbiddenMisreads ? 'FORBIDDEN SCENE MISREADS: ' + forbiddenMisreads : '',
    forbiddenElements ? 'DO NOT SHOW: ' + forbiddenElements : '',
    referenceMap ? 'REFERENCE MAP:\n' + referenceMap : '',
    referenceImages?.length ? 'The attached generated hero cards are mandatory identity canon for visible heroes. Preserve each mapped face shape, apparent age, hair, body type, proportions and role silhouette. Clothing shown in identity cards is not wardrobe canon: if it differs, follow STORY OUTFIT LOCK exactly. Do not swap, merge, beautify, de-age or replace a hero with a generic person. Preserve identity while following the assigned action, gaze and posture. Additional people may appear only as listed in the written scene lock. Never duplicate or merge heroes.' : '',
    'SCENE DETAIL: ' + SCENE_DETAIL_INSTRUCTION,
    'One coherent storybook moment from this written chapter with natural anatomy, hands and believable scene mechanics. Follow the assigned shot type and avoid repeating the same pose, camera angle, framing or hero placement used by a typical adjacent chapter. Keep faces, hands and key scene details away from the left 15% gutter and outer 3mm trim. Keep depiction age-appropriate and non-graphic; preserve the written tension, movement and consequences.',
  ].filter(Boolean).join('\n');
}
function findInlineImage(response) {
  return (response.candidates?.[0]?.content?.parts || []).find((part) => part.inlineData?.data);
}

function responseText(response) {
  return (response.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join(' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
  const status = Number(error?.response?.status || error?.statusCode || error?.status || 0);
  const message = String(error?.message || '');
  return status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500 || /timeout|ECONNRESET|ETIMEDOUT|socket|network/i.test(message);
}

async function imageRequestWithRetry(request, label) {
  const provider = String(source.order?.imageProvider || 'gemini').toLowerCase();
  const openAIModel = source.order?.openaiImageModel || 'gpt-5.6-terra';
  const geminiModel = provider === 'openlux' ? (source.order?.openluxImageModel || 'gemini-2.5-flash-image') : (source.geminiPortraitModel || source.geminiImageModel || 'gemini-2.5-flash-image');
  const waits = [6000, 12000, 24000];
  let lastError;

  for (let attempt = 0; attempt <= waits.length; attempt += 1) {
    try {
      if (provider === 'openai') {
        if (!$env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
        const parts = (request?.contents || []).flatMap((content) => content?.parts || []);
        const prompt = parts.map((part) => part.text || '').filter(Boolean).join('\n').trim();
        const aspectRatio = request?.generationConfig?.imageConfig?.aspectRatio || '1:1';
        const outputSize = aspectRatio === '3:2' ? '1536x1024' : (aspectRatio === '2:3' ? '1024x1536' : '1024x1024');
        const content = [{ type: 'input_text', text: prompt }];
        for (const part of parts.filter((candidate) => candidate?.inlineData?.data)) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          content.push({ type: 'input_image', image_url: 'data:' + mimeType + ';base64,' + part.inlineData.data, detail: 'auto' });
        }
        const response = await this.helpers.httpRequest({
          method: 'POST',
          url: 'https://api.openai.com/v1/responses',
          headers: { Authorization: 'Bearer ' + $env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
          body: {
            model: openAIModel,
            input: [{ role: 'user', content }],
            tools: [{ type: 'image_generation', size: outputSize, quality: 'medium' }],
          },
          json: true,
          timeout: 300000,
        });
        const call = (response?.output || []).find((item) => item?.type === 'image_generation_call' && item?.result);
        if (!call?.result) throw new Error('OpenAI image generation returned no image: ' + ((response?.output || []).flatMap((item) => item?.content || []).map((item) => item?.text || '').filter(Boolean).join(' ') || 'empty output'));
        return {
          candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: call.result } }] }, finishReason: response.status || 'completed' }],
          responseId: response.id || null,
          openaiResponseId: response.id || null,
          revisedPrompt: call.revised_prompt || null,
        };
      }


      if (provider === 'grok') {
        if (!$env.OPENLUX_API_KEY) throw new Error('OPENLUX_API_KEY is not configured for Grok image transport');
        const parts = (request?.contents || []).flatMap((content) => content?.parts || []);
        const rawPrompt = parts.map((part) => part.text || '').filter(Boolean).join('\n').trim();
        if (!rawPrompt) throw new Error('Grok image request has no prompt');
        const GROK_OPENLUX_PROMPT_MAX_BYTES = 7600;
        function utf8Bytes(value) {
          return Buffer.byteLength(String(value || ''), 'utf8');
        }
        function utf8PrefixAtWord(value, maxBytes) {
          let result = '';
          for (const character of String(value || '')) {
            if (utf8Bytes(result + character) > maxBytes) break;
            result += character;
          }
          const wordBoundary = Math.max(result.lastIndexOf('\n'), result.lastIndexOf(' '));
          if (wordBoundary >= Math.floor(result.length * 0.72)) result = result.slice(0, wordBoundary);
          return result.trimEnd();
        }
        function utf8SuffixAtLine(value, maxBytes) {
          const characters = Array.from(String(value || ''));
          let result = '';
          for (let index = characters.length - 1; index >= 0; index -= 1) {
            const next = characters[index] + result;
            if (utf8Bytes(next) > maxBytes) break;
            result = next;
          }
          const lineBoundary = result.indexOf('\n');
          if (lineBoundary >= 0 && lineBoundary <= Math.floor(result.length * 0.28)) result = result.slice(lineBoundary + 1);
          return result.trimStart();
        }
        function compactGrokPrompt(value, maxBytes) {
          const original = String(value || '').trim();
          const originalBytes = utf8Bytes(original);
          if (originalBytes <= maxBytes) {
            return { prompt: original, originalBytes, finalBytes: originalBytes, compacted: false };
          }

          let prompt = original;
          const semanticCompactions = [
            (text) => text.replace(/^\s*Portrait sheet URL:\s*none\s*$/gim, ''),
            (text) => text.replace(/^\s*Hero reference cards:\s*.*$/gim, ''),
            (text) => text.replace(/;\s*reference card:\s*\S+/gi, ''),
            (text) => text.replace(/^Consistency:.*$/gim, 'Consistency: keep each attached hero identity separate; preserve face, age, hair, body, outfit and silhouette; never swap, merge, average or beautify identities.'),
            (text) => text.replace(/^Use the attached individual hero reference images as the primary identity canon\..*$/gim, 'Attached hero reference images are mandatory identity canon; map one image to one hero and preserve face, age, hair, body and outfit.'),
            (text) => text.replace(/^Enrich the environment with 3-5 story-relevant secondary details.*$/gim, 'Add 3-5 story-relevant environmental details with believable materials, depth and lighting; no extra people or unrelated props.'),
            (text) => text.replace(/^If STYLE is photorealistic or realistic,.*$/gim, 'For realistic styles, keep attached identities and natural anatomy; render a fictional book illustration, not an ID photo.'),
            (text) => text.replace(/^Readable silhouettes, clear focal hierarchy,.*$/gim, 'Use clear silhouettes and focal hierarchy, layered depth, natural anatomy and gestures, full-bleed print-safe composition; no text, borders or cropped heads or hands.'),
          ];
          for (const compact of semanticCompactions) {
            if (utf8Bytes(prompt) <= maxBytes) break;
            prompt = compact(prompt).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
          }

          if (utf8Bytes(prompt) > maxBytes) {
            const separator = '\n[COMPACTED FOR OPENLUX BYTE LIMIT]\n';
            const tailBudget = 1400;
            const headBudget = maxBytes - tailBudget - utf8Bytes(separator);
            prompt = utf8PrefixAtWord(prompt, headBudget) + separator + utf8SuffixAtLine(prompt, tailBudget);
          }
          if (utf8Bytes(prompt) > maxBytes) prompt = utf8PrefixAtWord(prompt, maxBytes);
          return { prompt, originalBytes, finalBytes: utf8Bytes(prompt), compacted: true };
        }
        const promptInfo = compactGrokPrompt(rawPrompt, GROK_OPENLUX_PROMPT_MAX_BYTES);
        const prompt = promptInfo.prompt;
        const aspectRatio = request?.generationConfig?.imageConfig?.aspectRatio || '1:1';
        const internalReference = /hero\s+\d+\s+(?:strict\s+identity\s+)?reference|combined\s+hero\s+reference/i.test(label);
        const allInputImages = parts
          .filter((part) => part?.inlineData?.data)
          .map((part) => ({
            type: 'image_url',
            url: 'data:' + (part.inlineData.mimeType || 'image/png') + ';base64,' + part.inlineData.data,
          }));
        const inputImages = allInputImages.slice(0, 3);
        const resolution = internalReference ? '1k' : '2k';
        const grokModel = source.order?.grokImageModel || 'grok-imagine-image-2.0';
        const body = {
          model: grokModel,
          prompt,
          aspect_ratio: aspectRatio,
          resolution,
          quality: 'low',
          format: 'jpeg',
          response_format: 'url',
        };
        if (inputImages.length) body.images = inputImages;
        const response = await this.helpers.httpRequest({
          method: 'POST',
          url: 'https://api.openlux.ai/v1/images/' + (inputImages.length ? 'edits' : 'generations'),
          headers: { Authorization: 'Bearer ' + $env.OPENLUX_API_KEY, 'Content-Type': 'application/json' },
          body,
          json: true,
          timeout: 300000,
        });
        const output = response?.data?.[0] || response?.images?.[0] || null;
        let imageBase64 = output?.b64_json || output?.base64 || null;
        let mimeType = output?.mime_type || output?.mimeType || 'image/jpeg';
        if (!imageBase64 && output?.url) {
          const downloaded = await this.helpers.httpRequest({
            method: 'GET',
            url: output.url,
            encoding: 'arraybuffer',
            timeout: 180000,
          });
          imageBase64 = Buffer.from(downloaded).toString('base64');
          if (/\.png(?:\?|$)/i.test(output.url)) mimeType = 'image/png';
          else if (/\.webp(?:\?|$)/i.test(output.url)) mimeType = 'image/webp';
        }
        if (!imageBase64) throw new Error('Grok image generation returned no image URL or base64 payload');
        return {
          candidates: [{ content: { parts: [{ inlineData: { mimeType, data: imageBase64 } }] }, finishReason: 'completed' }],
          responseId: response?.id || output?.id || null,
          grokResponseUrl: output?.url || null,
          grokUsage: response?.usage || null,
          grokResolution: resolution,
          grokQuality: 'low',
          grokReferenceImagesUsed: inputImages.length,
          grokReferenceImagesDropped: Math.max(0, allInputImages.length - inputImages.length),
          grokPromptOriginalBytes: promptInfo.originalBytes,
          grokPromptBytes: promptInfo.finalBytes,
          grokPromptCompacted: promptInfo.compacted,
        };
      }


      const geminiApiKey = provider === 'openlux' ? $env.OPENLUX_API_KEY : $env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error((provider === 'openlux' ? 'OPENLUX_API_KEY' : 'GEMINI_API_KEY') + ' is not configured');
      return await this.helpers.httpRequest({
        method: 'POST',
        url: (provider === 'openlux' ? 'https://api.openlux.ai' : 'https://generativelanguage.googleapis.com') + '/v1beta/models/' + geminiModel + ':generateContent',
        headers: provider === 'openlux'
          ? { Authorization: 'Bearer ' + geminiApiKey, 'Content-Type': 'application/json' }
          : { 'x-goog-api-key': geminiApiKey, 'Content-Type': 'application/json' },
        body: request,
        json: true,
        timeout: 180000,
      });
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || error?.response?.statusCode || error?.statusCode || error?.status || 0);
      const errorDetails = [
        error?.message,
        error?.response?.data?.error?.message,
        error?.response?.data?.message,
        error?.response?.body,
      ].filter(Boolean).map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' ');
      const promptLengthError = /(?:8000|maximum|max(?:imum)?\s+(?:allowed\s+)?length|length\s+(?:exceeds|exceeded)|too\s+long|长度.*(?:超过|超出)|关键词.*(?:限制|长度))/i.test(errorDetails);
      const retryable = !promptLengthError && (status === 0 || [408, 409, 425, 429].includes(status) || status >= 500 || /timeout|ECONNRESET|ETIMEDOUT|socket|network|temporarily|rate/i.test(String(error?.message || '')));
      if (!retryable || attempt === waits.length) break;
      const waitMs = provider === 'grok' && status === 429
        ? [15000, 30000, 60000][attempt]
        : waits[attempt];
      await sleep(waitMs);
    }
  }
  const providerLabel = provider === 'openai' ? 'OpenAI' : (provider === 'openlux' ? 'OpenLux' : (provider === 'grok' ? 'Grok via OpenLux' : 'Gemini'));
  throw new Error(providerLabel + ' image request failed for ' + label + ': ' + (lastError?.message || 'unknown error'));
}

function noReferenceChapterPrompt(chapter, visualBible, fallbackHeroes) {
  const bible = text.bible || {};
  const world = visualBible?.world || {};
  const stylePrompt = normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'cinematic book illustration');
  const showHeroes = fallbackHeroes.length > 0;
  const hasApprovedStoryBrief = Boolean(String(order.approvedStoryBrief || '').trim());
  const effectiveArtifactCanon = hasApprovedStoryBrief
    ? safetyCleanText(order.approvedArtifactCanon || bible.artifactCanon || '').slice(0, 360)
    : safetyCleanText(bible.artifactCanon || world.artifactCanon || world.artifact || order.artifact || bible.artifact || '').slice(0, 360);
  const useArtifactCanon = chapter.useArtifactCanon === true && Boolean(effectiveArtifactCanon);
  const writtenHeroes = fallbackHeroes.map((hero) => [hero.name || ('Hero ' + (hero.hero || hero.n || '')), hero.ageGroup ? 'age group: ' + hero.ageGroup : '', hero.description || '', hero.relation ? 'relation: ' + hero.relation : ''].filter(Boolean).join('; ')).join('\n');
  return [
    'Generate an IMAGE only. Do not answer with text.',
    'Create a unique square 1:1 full-page interior book illustration for chapter ' + chapter.n + '.',
    showHeroes
      ? 'This is a privacy-safe final retry without attached identity images. The named main hero must remain clearly visible and central. Create a fictional book character from the written age and description below; do not imitate a private real person or invent a different foreground hero. Supporting people are permitted only as listed in the written scene lock.'
      : 'This is an environment-focused safety fallback. No profiled hero is required in this scene; show only the location, architecture, landscape, portal, magical effect, animal or story action.',
    'No readable text anywhere: no chapter numbers, title, signs, letters, labels, captions, logo, watermark or UI.',
    'Target page: 136 x 136 mm square, full bleed edge-to-edge, no white margins, no border. Keep important details away from the left 15% gutter and outer 3mm trim.',
    'Style: ' + stylePrompt,
    'World visual language: ' + normalizeWorldVisual(world.visual || bible.worldVisual || ''),
    'Location: ' + safetyCleanText(world.location || order.location || bible.location || ''),
    useArtifactCanon ? 'Important object canon: ' + safeImportantObject(effectiveArtifactCanon) : '',
    'Chapter title for context only, do NOT render words: ' + safetyCleanText(chapter.title || ''),
    localSceneImagePrompt(chapter),
    showHeroes ? 'Required written hero description:\n' + writtenHeroes : '',
    RETRY_DETAIL_INSTRUCTION,
    showHeroes ? 'Mood: wonder, discovery, mystery, warm magic, cinematic light. Keep the depiction age-appropriate and non-graphic while preserving the assigned action and reaction.' : 'Mood: wonder, discovery, mystery, warm light. Environment and objects only.',
  ].join('\n');
}

async function generateChapterImage(chapter, visualBible, referenceImages) {
  referenceImages = selectedReferenceImages(chapter, referenceImages || []);
  let prompt = chapterPrompt(chapter, visualBible, referenceImages);
  const parts = [{ text: prompt }];
  for (const image of referenceImages || []) {
    if (image?.data) parts.push({ inlineData: { mimeType: image.mimeType || 'image/png', data: image.data } });
  }
  const request = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'], temperature: 0.3, imageConfig: { aspectRatio: '1:1' } },
  };
  let response = await imageRequestWithRetry.call(this, request, 'chapter ' + chapter.n + ' primary image');
  let part = findInlineImage(response);
  let textReason = responseText(response);
  let generationAttempt = 'primary_with_reference_cards';
  let referenceReduced = false;
  if (!part) {
    const retryPrompt = [
      'Generate an IMAGE only. Do not answer with text.',
      'Privacy-safe book illustration for chapter ' + chapter.n + '. Title is context only, do NOT render words: ' + safetyCleanText(chapter.title || ''),
      localSceneImagePrompt(chapter),
      localWardrobePrompt(text.bible?.outfitCanon),
      'Use the attached generated individual hero reference cards as required identity canon if present. Keep the same face shape, apparent age, hairline, hair, facial hair/accessories, body type and silhouette. Do not beautify, de-age, swap identities or replace with a generic person.',
      'Style: ' + normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'book illustration'),
      RETRY_DETAIL_INSTRUCTION,
      'Target final page: 136 x 136 mm square interior page, 1:1 aspect ratio, full bleed edge-to-edge. No text or text-like marks, no letterboxing, no borders, no white margins, no blank paper background. Keep important faces and scene details away from the left 15% inner gutter/spine zone and outer 3mm trim edge.',
      'Keep the depiction age-appropriate and non-graphic. Preserve the assigned scene and required objects rather than replacing them with a generic calm portrait.',
    ].join('\n');
    response = await imageRequestWithRetry.call(this, { contents: [{ role: 'user', parts: [{ text: retryPrompt }, ...(referenceImages || []).filter((image) => image?.data).map((image) => ({ inlineData: { mimeType: image.mimeType || 'image/png', data: image.data } }))] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.18, imageConfig: { aspectRatio: '1:1' } } }, 'chapter ' + chapter.n + ' safe referenced image');
    part = findInlineImage(response);
    textReason = responseText(response) || textReason;
    prompt = retryPrompt;
    generationAttempt = 'safe_with_reference_cards';
  }
  if (!part && (referenceImages || []).some((image) => image?.data)) {
    const likenessPrompt = [
      'Generate an IMAGE only. Square 1:1 full-bleed book illustration. No text, letters, border or collage.',
      localSceneImagePrompt(chapter),
      localWardrobePrompt(text.bible?.outfitCanon),
      'Use every attached generated hero card as mandatory identity canon. Show the mapped heroes clearly with the same face, apparent age, hair, body type, outfit colors and silhouette. Do not add unrelated people.',
      'Style: ' + normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'book illustration'),
      RETRY_DETAIL_INSTRUCTION,
      'Keep anatomy, hands and key scene details simple and coherent. Keep the depiction age-appropriate and non-graphic; preserve the assigned action and reaction.',
    ].join('\n');
    response = await imageRequestWithRetry.call(this, { contents: [{ role: 'user', parts: [{ text: likenessPrompt }, ...referenceImages.filter((image) => image?.data).map((image) => ({ inlineData: { mimeType: image.mimeType || 'image/png', data: image.data } }))] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.12, imageConfig: { aspectRatio: '1:1' } } }, 'chapter ' + chapter.n + ' likeness referenced image');
    part = findInlineImage(response);
    textReason = responseText(response) || textReason;
    prompt = likenessPrompt;
    generationAttempt = 'safe_likeness_with_reference_cards';
  }
  const hasReadyIdentityReferences = (referenceImages || []).some((image) => image?.type === 'hero_card' && image?.data);
  if (!part && !hasReadyIdentityReferences) {
    const requestedHeroNumbers = new Set((Array.isArray(chapter.heroNumbers) ? chapter.heroNumbers : []).map(Number).filter(Number.isFinite));
    const allWrittenHeroes = visualBible?.characters || order.heroes || [];
    const fallbackHeroes = requestedHeroNumbers.size
      ? allWrittenHeroes.filter((hero) => requestedHeroNumbers.has(Number(hero.hero || hero.n)))
      : allWrittenHeroes.slice(0, 1);
    const environmentPrompt = noReferenceChapterPrompt(chapter, visualBible, fallbackHeroes);
    response = await imageRequestWithRetry.call(this, { contents: [{ role: 'user', parts: [{ text: environmentPrompt }] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.22, imageConfig: { aspectRatio: '1:1' } } }, 'chapter ' + chapter.n + ' safe environment image');
    part = findInlineImage(response);
    textReason = responseText(response) || textReason;
    prompt = environmentPrompt;
    generationAttempt = fallbackHeroes.length ? 'safe_character_no_references' : 'safe_environment_no_references';
    referenceReduced = true;
  }
  if (!part) {
    throw new Error('Selected image provider did not return an inline image for chapter ' + chapter.n + ': ' + (textReason || response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason || 'unknown reason'));
  }
  const visualQaContract = {
    slot: 'chapter_' + chapter.n,
    scene: chapter.visualBrief || chapter.summary || '',
    visibleHeroes: Array.isArray(chapter.heroNumbers) ? chapter.heroNumbers : [],
    backgroundPeople: chapter.backgroundPeople || '',
    shotType: chapter.shotType || '',
    outfitCanon: text.bible?.outfitCanon || '',
    physicalPlacement: chapter.physicalPlacement || '',
    spatialRelations: Array.isArray(chapter.spatialRelations) ? chapter.spatialRelations : [],
    requiredObjects: Array.isArray(chapter.requiredObjects) ? chapter.requiredObjects : [],
    forbiddenMisreads: Array.isArray(chapter.forbiddenMisreads) ? chapter.forbiddenMisreads : [],
    forbiddenElements: Array.isArray(chapter.forbiddenElements) ? chapter.forbiddenElements : [],
    noExtraPeople: !chapter.backgroundPeople,
    noReadableText: true,
  };
  const initialQa = await runVisualQa.call(this, part, visualQaContract, 'chapter ' + chapter.n);
  let finalQa = initialQa;
  let qaRetried = false;
  if (shouldRetryVisualQa(initialQa)) {
    const repairPrompt = visualQaRepairPrompt(prompt, initialQa);
    const repairParts = [{ text: repairPrompt }, ...(referenceImages || []).filter((image) => image?.data).map((image) => ({ inlineData: { mimeType: image.mimeType || 'image/png', data: image.data } }))];
    const repairedResponse = await imageRequestWithRetry.call(this, {
      contents: [{ role: 'user', parts: repairParts }],
      generationConfig: { responseModalities: ['IMAGE'], temperature: 0.16, imageConfig: { aspectRatio: '1:1' } },
    }, 'chapter ' + chapter.n + ' visual QA repair');
    const repairedPart = findInlineImage(repairedResponse);
    if (repairedPart) {
      response = repairedResponse;
      part = repairedPart;
      prompt = repairPrompt;
      generationAttempt += '_visual_qa_retry';
      qaRetried = true;
      finalQa = await runVisualQa.call(this, part, visualQaContract, 'chapter ' + chapter.n + ' repaired');
    } else {
      finalQa = { ...initialQa, status: 'repair_failed_no_image' };
    }
  }
  const visualQa = { initial: initialQa, final: finalQa, retried: qaRetried, retryCount: qaRetried ? 1 : 0 };
  const mimeType = part.inlineData.mimeType || 'image/png';
  const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
  const fileName = 'chapter-' + chapter.n + '.' + ext;
  await apiRequest.call(this, {
    method: 'PUT',
    url: 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId + '/files/' + fileName,
    headers: { 'Content-Type': 'application/json' },
    body: { contentType: mimeType, contentBase64: part.inlineData.data },
    timeout: 60000,
  });
  const url = '/api/fairyteller/jobs/' + jobId + '/files/' + fileName;
  return {
    slot: 'chapter_' + chapter.n,
    chapter: Number(chapter.n),
    status: 'ready',
    fileName,
    url,
    absoluteUrl: 'https://fairyteller.ru' + url,
    mimeType,
    bytes: Buffer.from(part.inlineData.data, 'base64').length,
    prompt,
    provider: (source.order?.imageProvider || 'gemini'),
    model: (source.order?.imageProvider === 'openai' ? (source.order?.openaiImageModel || 'gpt-5.6-terra') : (source.order?.imageProvider === 'openlux' ? (source.order?.openluxImageModel || 'gemini-2.5-flash-image') : (source.order?.imageProvider === 'grok' ? (source.order?.grokImageModel || 'grok-imagine-image-2.0') : (source.geminiImageModel || source.geminiPortraitModel || 'gemini-2.5-flash-image')))),
    targetPageSizeMm: INTERIOR_IMAGE_TARGET.pageSizeMm,
    targetAspectRatio: INTERIOR_IMAGE_TARGET.aspectRatio,
    role: 'interior_full_page_right_spread',
    referenceSheetUrl: visualBible?.portraitSheetUrl || null,
    characterReferenceCardUrls: (visualBible?.heroReferenceCards || []).map((card) => card.url).filter(Boolean),
    visualBibleVersion: visualBible?.version || 1,
    generationAttempt,
    referenceReduced,
    visualQa,
  };
}

await patchJob.call(this, {
  artifacts: { fullVisuals: { status: 'generating', requestedAt: new Date().toISOString(), completed: 0, total: chapters.length } },
});

try {
  if (!source.pipeline?.localSequentialRun) throw new Error('Missing local generation run key');
  const existingArtifact = await fetchVisualsArtifactWithRetry.call(this);
  const existingVisuals = existingArtifact.visuals || {};
  const visualBible = existingVisuals.visualBible || {};
  const referenceImages = await fetchReferenceImages.call(this, existingVisuals, visualBible);

  const previousJobs = Array.isArray(existingVisuals.imageJobs) ? existingVisuals.imageJobs : [];
  const completedImages = [];
  const fallbackImages = [];
  function publicImage(image) {
    const { prompt, ...publicImageValue } = image;
    return publicImageValue;
  }
  function fallbackSourceImage() {
    const usedSources = new Set(fallbackImages.map((image) => image.fallbackFromSlot).filter(Boolean));
    const candidates = [
      ...[...completedImages].reverse().filter((image) => image.status === 'ready' && image.fileName && !image.fallback),
      ...previousJobs.filter((image) => image.status === 'ready' && image.fileName && !image.fallback),
      ...[...completedImages].reverse().filter((image) => image.status === 'ready' && image.fileName),
      ...previousJobs.filter((image) => image.status === 'ready' && image.fileName),
    ];
    return candidates.find((image) => image.slot && !usedSources.has(image.slot)) || candidates[0];
  }
  async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await worker(items[index], index);
      }
    });
    await Promise.all(workers);
    return results;
  }

  const generatedImages = await mapLimit(chapters, 2, async (plannedChapter) => {
    const deadline = Date.now() + 15 * 60 * 1000;
    let checkpoint;
    while (!checkpoint && Date.now() < deadline) {
      try {
        checkpoint = await fetchJsonArtifact.call(this, 'chapter-' + Number(plannedChapter.n) + '.json');
        if (checkpoint?.runKey !== source.pipeline?.localSequentialRun) {
          checkpoint = undefined;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        const statusCode = Number(error?.statusCode || error?.status || error?.httpCode
          || error?.response?.statusCode || error?.response?.status
          || String(error?.message || '').match(/\bstatus(?: code)?\s+(\d{3})\b/i)?.[1] || 0);
        if (statusCode !== 404) throw error;
        const job = await apiRequest.call(this, { method: 'GET', url: 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId, timeout: 30000 });
        if (job.status === 'failed' || job.artifacts?.fullText?.status === 'failed') {
          throw new Error('Text generation failed before chapter ' + plannedChapter.n + ' was ready');
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    const chapter = checkpoint?.chapter;
    if (checkpoint?.status !== 'ready' || checkpoint?.jobId !== jobId
      || Number(chapter?.n) !== Number(plannedChapter.n) || chapter?.visualSource !== 'written_chapter'
      || !localChapterSceneIsGrounded({ ...chapter, scene: chapter.visualBrief, sourceQuote: chapter.visualSourceQuote }, chapter.textBlocks, order.heroes)
      || qaText(chapter.visualSourceText) !== localSceneEvidence(chapter.textBlocks, chapter.visualSourceQuote)?.text) {
      throw new Error('No validated written scene for chapter ' + plannedChapter.n);
    }
    let image;
    try {
      image = await generateChapterImage.call(this, chapter, visualBible, referenceImages);
    } catch (error) {
      const identityReferencesRequired = (referenceImages || []).some((reference) => reference?.type === 'hero_card' && reference?.data);
      if (identityReferencesRequired) throw error;
      const fallback = fallbackSourceImage();
      if (!fallback) throw error;
      const fallbackReason = String(error?.message || error || 'image generation failed').replace(/\s+/g, ' ').trim().slice(0, 600);
      image = {
        ...fallback,
        slot: 'chapter_' + chapter.n,
        chapter: Number(chapter.n),
        status: 'ready',
        fallback: true,
        fallbackFromSlot: fallback.slot || null,
        fallbackReason,
        prompt: chapterPrompt(chapter, visualBible, referenceImages || []),
        provider: fallback.provider || 'fallback_existing_image',
        model: fallback.model || 'existing_ready_image',
        role: 'interior_full_page_right_spread_fallback',
      };
      fallbackImages.push(publicImage(image));
    }
    completedImages.push(image);
    const progressImages = [...completedImages].sort((a, b) => Number(a.chapter) - Number(b.chapter));
    await patchJob.call(this, {
      artifacts: { fullVisuals: { status: 'generating', completed: progressImages.length, total: chapters.length, latestChapter: Number(chapter.n), images: progressImages.map(publicImage), fallbackCount: fallbackImages.length, fallbacks: fallbackImages } },
    });
    return image;
  });

  const replacedSlots = new Set(generatedImages.map((image) => image.slot));
  const imageJobs = [
    ...previousJobs.filter((image) => !replacedSlots.has(image.slot)),
    ...generatedImages,
  ].sort((a, b) => String(a.slot).localeCompare(String(b.slot), 'en', { numeric: true }));
  const visuals = {
    ...existingVisuals,
    imageJobs,
    imagePrompts: {
      ...(existingVisuals.imagePrompts || {}),
      ...Object.fromEntries(generatedImages.map((image) => [image.slot, image.prompt])),
    },
    fullVisuals: { status: 'ready', chapterCount: generatedImages.length, generatedAt: new Date().toISOString(), fallbackCount: fallbackImages.length, fallbacks: fallbackImages },
  };
  return [{ json: { ...source, status: 'full_visuals_ready', visuals, fullVisuals: { status: 'ready', chapterCount: generatedImages.length, images: generatedImages.map(publicImage), fallbackCount: fallbackImages.length, fallbacks: fallbackImages } } }];
} catch (error) {
  const message = 'Не удалось подготовить иллюстрации полной истории: ' + error.message;
  let textFailed = false;
  try {
    const job = await apiRequest.call(this, { method: 'GET', url: 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId, timeout: 30000 });
    textFailed = job.artifacts?.fullText?.status === 'failed';
  } catch { /* Preserve the original visual failure if status cannot be read. */ }
  // A dependent image worker must not replace the root text error and its stage.
  await patchJob.call(this, { status: 'failed',
    ...(!textFailed ? { stage: 'visuals', error: { message } } : {}),
    artifacts: { fullVisuals: { status: 'failed', error: message } } });
  throw new Error(message);
}

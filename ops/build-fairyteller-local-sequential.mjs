#!/usr/bin/env node
// File-only preparation. Never imports, activates, deploys or calls a provider.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('Pass an audited production workflow export as a local file');
const baseline = JSON.parse(await readFile(resolve(baselinePath), 'utf8'));
const names = ['fairyteller_intake', 'fairyteller_text', 'fairyteller_full_text', 'fairyteller_visuals', 'fairyteller_full_visuals', 'fairyteller_cover'];
const ids = Object.fromEntries(names.map((name) => [name, 'FTLocal' + name.replace('fairyteller_', '').replaceAll('_', '')]));
const originals = names.map((name) => {
  const workflow = baseline.find((w) => w.name === name);
  if (!workflow) throw new Error('Baseline missing ' + name);
  return workflow;
});
const remap = Object.fromEntries(originals.map((w) => [w.id, ids[w.name]]));
const out = resolve(root, 'n8n/local-sequential');
await mkdir(out, { recursive: true });
const chatHelper = await readFile(resolve(root, 'n8n/code/local-sequential/openlux-chat.js'), 'utf8');
const layoutContract = (await readFile(resolve(root, 'server/fairyteller-local-layout-contract.mjs'), 'utf8')).replace(/^export /gm, '');
const wardrobeHelper = await readFile(resolve(root, 'n8n/code/local-sequential/wardrobe.js'), 'utf8');
const sceneRepair = await readFile(resolve(root, 'n8n/code/local-sequential/scene-repair.js'), 'utf8');
const layoutCheck = await readFile(resolve(root, 'n8n/code/local-sequential/check-layout.js'), 'utf8');
function replaceOnce(value, search, replacement, label) {
  if (!value.includes(search)) throw new Error('Baseline marker missing: ' + label);
  return value.replace(search, replacement);
}
const guard = `const localApiBase = String($env.FAIRYTELLER_API_BASE_URL || '').replace(/\\/$/, '');
if (!/^http:\\/\\/(?:localhost|127\\.0\\.0\\.1|\\[::1\\]|host\\.docker\\.internal)(?::\\d+)?$/.test(localApiBase)) {
  throw new Error('Local sandbox only: set a loopback FAIRYTELLER_API_BASE_URL');
}
`;
function localize(value) {
  if (Array.isArray(value)) return value.map(localize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => {
    if (key === 'jsCode' && typeof v === 'string') {
      v = v.replace(/(['"])https:\/\/fairyteller\.ru([^'"\n]*)\1/g, (_, quote, suffix) => 'localApiBase' + (suffix ? ' + ' + quote + suffix + quote : ''));
      return [key, guard + v];
    }
    if (key === 'url' && typeof v === 'string') {
      v = v.replace(/"https:\/\/fairyteller\.ru([^"\n]*)"/g, (_, suffix) => '($env.FAIRYTELLER_API_BASE_URL || "http://127.0.0.1:3101") + "' + suffix + '"');
      v = v.replaceAll('https://fairyteller.ru', 'http://127.0.0.1:3101');
      return [key, v];
    }
    if (typeof v === 'string') return [key, v.replaceAll('https://fairyteller.ru', 'http://127.0.0.1:3101')];
    return [key, localize(v)];
  }));
}
const manifest = [];
for (const original of originals) {
  const w = structuredClone(original);
  const node = (name) => {
    const found = w.nodes.find((n) => n.name === name);
    if (!found) throw new Error(w.name + ': missing ' + name);
    return found;
  };
  const code = async (filename) => readFile(resolve(root, 'n8n/code/local-sequential', filename), 'utf8');
  if (w.name === 'fairyteller_intake') {
    const relay = node('РУЧНОЕ РЕЛЕ — GEMINI / OPENAI / OPENLUX / GROK');
    relay.parameters.jsCode = replaceOnce(relay.parameters.jsCode, "const TEXT_PROVIDER = 'openlux';",
      `const TEXT_PROVIDER = 'openlux';
const localTextModel = String($env.FAIRYTELLER_LOCAL_TEXT_MODEL || 'gemini-2.5-pro').trim();
if (!['gemini-2.5-pro', 'grok-4.3', 'gpt-6.1-sol'].includes(localTextModel)) throw new Error('Unsupported local text model');`, 'local text switch');
    relay.parameters.jsCode = replaceOnce(relay.parameters.jsCode, "openluxTextModel: 'gemini-2.5-pro'",
      'openluxTextModel: localTextModel', 'persist text model');
  }
  if (w.name === 'fairyteller_text') {
    const generate = node('Generate First Chapter — Selected Provider');
    let first = generate.parameters.jsCode;
    first = replaceOnce(first,
      "      : await this.helpers.httpRequest({",
      "      : (provider === 'openlux' && (/^grok-/i.test(model) || model === 'gpt-6.1-sol')\n        ? await requestOpenLuxChat.call(this, source.geminiRequest, model, 'fairyteller_first_chapter', 240000)\n        : await this.helpers.httpRequest({", 'first chapter Grok route');
    first = replaceOnce(first, '          timeout: 240000,\n        });\n    return [{ json: response }];',
      '          timeout: 240000,\n        }));\n    return [{ json: response }];', 'first chapter Grok route close');
    first = replaceOnce(first, 'const waits = [10000, 20000, 35000, 55000];', 'const waits = [1000, 3000];\nlet layoutError = "";\nlet rejectedDraft = null;', 'bounded first retries');
    first = replaceOnce(first, '  try {\n    const response = provider', `  try {
    const request = JSON.parse(JSON.stringify(source.geminiRequest));
    for (const part of request.systemInstruction?.parts || []) part.text = String(part.text || '').replace('не используй списки и переносы строк', 'не используй списки; разделяй абзацы экранированными переносами строк внутри строк JSON');
    if (request.systemInstruction?.parts?.[0]) request.systemInstruction.parts[0].text = localWardrobeInstructions() + '\\n' + localChapterInstructions(1) + '\\nПолный текст, не краткое изложение. Для каждого из четырёх блоков планируй 850-900 знаков. Проверка длины обязательна.' + '\\n' + request.systemInstruction.parts[0].text;
    request.contents[0].parts.push({ text: localChapterInstructions(1) + '\\nВ chapter1 добавь visualScene: { scene, sourceQuote, heroNumbers, shotType, physicalPlacement, spatialRelations, backgroundPeople, supportingPeopleQuote, forbiddenMisreads, useArtifactCanon, artifactRole, requiredObjects, objectScale, forbiddenElements }. ' + localSceneSelectionInstructions() + '' + (layoutError ? '\\nИсправь ошибку предыдущего ответа: ' + layoutError : '') });
    if (rejectedDraft) request.contents[0].parts.push({ text: '\\nОТКЛОНЁННЫЙ ЧЕРНОВИК: ' + JSON.stringify(rejectedDraft) + '\\nСохрани этот план и события. Исправь chapter1: расширь короткие блоки конкретными действиями, наблюдениями и реакциями в той же сцене, до 850-900 русских знаков каждый. Одна кириллическая буква — один знак. Обычно это 130-150 слов на блок, не 70-90. Не сокращай ни один блок. Верни весь объект JSON с исправленной главой, без пояснений.' });
    const rootSchema = request.generationConfig?.responseSchema;
    if (rootSchema?.properties) {
      rootSchema.properties.wardrobeCanon = { type: 'ARRAY', minItems: source.order.heroes.length, maxItems: source.order.heroes.length, items: { type: 'OBJECT', properties: { heroNumber: { type: 'NUMBER' }, description: { type: 'STRING', minLength: 60, maxLength: 240 } }, required: ['heroNumber', 'description'] } };
      rootSchema.required = [...new Set([...(rootSchema.required || []), 'wardrobeCanon'])];
    }
    const firstSchema = rootSchema?.properties?.chapter1;
    if (firstSchema) {
      firstSchema.properties.visualScene = { type: 'OBJECT', properties: { scene: { type: 'STRING' }, sourceQuote: { type: 'STRING' }, heroNumbers: { type: 'ARRAY', items: { type: 'NUMBER' } }, shotType: { type: 'STRING' }, physicalPlacement: { type: 'STRING' }, backgroundPeople: { type: 'STRING' }, supportingPeopleQuote: { type: 'STRING' }, useArtifactCanon: { type: 'BOOLEAN' }, artifactRole: { type: 'STRING' }, requiredObjects: { type: 'ARRAY', items: { type: 'STRING' } }, objectScale: { type: 'STRING' }, forbiddenElements: { type: 'ARRAY', items: { type: 'STRING' } }, spatialRelations: { type: 'ARRAY', items: { type: 'STRING' } }, forbiddenMisreads: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['scene', 'sourceQuote', 'heroNumbers', 'shotType', 'physicalPlacement'] };
      firstSchema.required = [...new Set([...firstSchema.required, 'visualScene'])];
    }
    if (firstSchema?.properties?.textBlocks?.items) {
      firstSchema.properties.textBlocks.minItems = 4;
      firstSchema.properties.textBlocks.maxItems = 4;
      delete firstSchema.properties.textBlocks.items.minLength;
      delete firstSchema.properties.textBlocks.items.maxLength;
    }
    let sceneOnly = false;
    if (rejectedDraft?.chapter1?.textBlocks && !localChapterContentIssues({ n: 1, textBlocks: rejectedDraft.chapter1.textBlocks }).length && /visualScene/.test(layoutError)) {
      const metadataRequest = localSceneRepairRequest(rejectedDraft.chapter1, source.order?.heroes, rejectedDraft.outfitCanon, layoutError);
      delete request.systemInstruction;
      request.contents = metadataRequest.contents;
      request.generationConfig = metadataRequest.generationConfig;
      sceneOnly = true;
    }
    const response = provider`, 'first contract prompt');
    first = first.replaceAll('source.geminiRequest, model', 'request, model').replace('body: source.geminiRequest,', 'body: request,');
    first = replaceOnce(first, '    return [{ json: response }];', `    const parsedDraft = parseLocalTextObject(response.candidates[0].content.parts.filter(p => p.thought !== true).map(p => p.text || '').join(''));
    let generated;
    if (sceneOnly) {
      if (!parsedDraft.visualScene) throw new Error('Layout contract: visualScene metadata missing');
      generated = { ...rejectedDraft, chapter1: { ...rejectedDraft.chapter1, visualScene: parsedDraft.visualScene } };
    } else generated = rejectedDraft ? { ...rejectedDraft, ...parsedDraft, chapter1: { ...rejectedDraft.chapter1, ...parsedDraft.chapter1 } } : parsedDraft;
    rejectedDraft = generated;
    generated.wardrobeCanon = localValidateWardrobe(generated, source.order?.heroes);
    generated.outfitCanon = localWardrobeText(generated.wardrobeCanon);
    if (!generated.chapter1) throw new Error('Text response contract: first chapter missing');
    const firstIssues = localChapterContentIssues({ n: 1, textBlocks: generated.chapter1.textBlocks });
    if (firstIssues.length) throw new Error('Text response contract: ' + firstIssues.join('; '));
    const scene = localNormalizeSceneLists(generated.chapter1.visualScene);
    generated.chapter1.visualScene = scene;
    if (!localChapterSceneIsGrounded(scene, generated.chapter1.textBlocks, source.order?.heroes)) throw new Error('Layout contract: chapter 1 visualScene must be grounded in the written chapter');
    generated.chapter1.title = localChapterTitle(generated.chapter1.title);
    generated.chapterPlan = (generated.chapterPlan || []).map(p => ({ ...p, title: localChapterTitle(p.title) }));
    generated.chapter1.visualBrief = scene.scene;
    generated.chapterPlan = (generated.chapterPlan || []).map(p => Number(p.n) === 1 ? { ...p, ...scene, visualBrief: scene.scene } : p);
    response.candidates[0].content.parts = [{ text: JSON.stringify(generated) }];
    return [{ json: response }];`, 'first contract check');
    first = replaceOnce(first, '    lastError = error;', '    lastError = error;\n    layoutError = errorText(error);', 'first retry feedback');
    first = first.replace('attempt < waits.length && shouldRetry(error)', 'attempt < waits.length && (shouldRetry(error) || /^(?:Layout contract:|Text response contract:|Wardrobe contract:|visualScene )/.test(errorText(error)))');
    first = first.replace("const userMessage = 'Не удалось написать первую главу: выбранный сервис временно недоступен. Попробуйте запустить генерацию еще раз через пару минут.';", "const userMessage = /^Layout contract:/.test(errorText(error)) ? 'Не удалось подготовить текст первой главы для книжного формата после повторов.' : 'Не удалось написать первую главу. Попробуйте запустить генерацию еще раз через пару минут.';");
    generate.parameters.jsCode = wardrobeHelper + '\n' + layoutContract + '\n' + layoutCheck + '\n' + sceneRepair + '\n' + chatHelper + '\n' + first;
    const firstNormalize = node('Normalize First Chapter');
    firstNormalize.parameters.jsCode = firstNormalize.parameters.jsCode.replace('chapter1.textBlocks.map((block) => normalizeGeneratedStoryText(block))', 'chapter1.textBlocks.map(localBlockText)');
    firstNormalize.parameters.jsCode = firstNormalize.parameters.jsCode.replace(/if \(generatedTextBlocks\.length > 0[\s\S]*?from ' \+ generatedTextBlocks\.length\);/, '');
    firstNormalize.parameters.jsCode = layoutContract + '\n' + layoutCheck + '\n' + firstNormalize.parameters.jsCode.replace('const fullChapterText = textBlocks.join', 'const layoutIssues = localChapterContentIssues({ n: 1, textBlocks });\nif (layoutIssues.length) throw new Error(layoutIssues.join("; "));\nconst fullChapterText = textBlocks.join');
    firstNormalize.parameters.jsCode = firstNormalize.parameters.jsCode.replace('  generation: { provider:', '  printLayout: { ...LOCAL_PRINT_LAYOUT },\n  generation: { provider:');
    firstNormalize.parameters.jsCode = replaceOnce(firstNormalize.parameters.jsCode, 'chapters: [{ n: 1,', "chapters: [{ visualSource: 'written_chapter', visualSourceQuote: generated.chapter1.visualScene.sourceQuote, visualSourceText: localSceneEvidence(textBlocks, generated.chapter1.visualScene.sourceQuote).text, backgroundPeople: generated.chapter1.visualScene.backgroundPeople || '', supportingPeopleQuote: generated.chapter1.visualScene.supportingPeopleQuote || '', heroNumbers: generated.chapter1.visualScene.heroNumbers, shotType: generated.chapter1.visualScene.shotType, requiredObjects: generated.chapter1.visualScene.requiredObjects || [], objectScale: generated.chapter1.visualScene.objectScale || '', forbiddenElements: generated.chapter1.visualScene.forbiddenElements || [], n: 1,", 'persist first written scene quote');
    firstNormalize.parameters.jsCode = wardrobeHelper + '\n' + replaceOnce(firstNormalize.parameters.jsCode,
      "outfitCanon: cleanStoryText(generated.outfitCanon || ''),",
      "wardrobeVersion: LOCAL_WARDROBE_VERSION, wardrobeCanon: localValidateWardrobe(generated, source.order?.heroes), outfitCanon: localWardrobeText(localValidateWardrobe(generated, source.order?.heroes)),", 'persist wardrobe');
    const restore = node('Restore Text Payload');
    restore.parameters.jsCode = restore.parameters.jsCode.replace('return [{ json: payload }];',
      `return [{ json: { ...payload, pipeline: { ...(payload.pipeline || {}), localSequentialRun: payload.jobId + '-' + Date.now() } } }];`);
  }
  if (w.name === 'fairyteller_full_text') {
    node('Generate Full Text — Selected Provider').parameters.jsCode = wardrobeHelper + '\n' + layoutContract + '\n' + layoutCheck + '\n' + sceneRepair + '\n' + chatHelper + '\n' + await code('generate-text.js');
    node('Normalize Full Text').parameters.jsCode = layoutContract + '\n' + chatHelper + '\n' + await code('normalize-text.js');
    node('Ensure Full Text Fits').parameters.jsCode = layoutContract + '\n' + layoutCheck + '\n' + chatHelper + '\n' + await code('ensure-text-fits.js');
    const build = node('Build Full Text Prompt');
    build.parameters.jsCode = build.parameters.jsCode.replace('fullTextSystemText: systemText,',
      `fullTextSystemText: systemText + '\\nЛОКАЛЬНАЯ СХЕМА V2: визуальные описания плана предварительные. Окончательная сцена выбирается из всей написанной главы без изменения прозы ради картинки. Нельзя менять факты предыдущих глав.',`);
    const wait = { id: 'local-wait-visuals', name: 'Wait For Written Chapter Illustrations', type: 'n8n-nodes-base.code', typeVersion: 2,
      position: [2500, 300], parameters: { jsCode: await code('wait-visuals.js') } };
    w.nodes.push(wait);
    w.connections['Restore Full Visuals Payload'] = { main: [[{ node: wait.name, type: 'main', index: 0 }]] };
    w.connections[wait.name] = { main: [[{ node: 'Start Cover After Text And Early Visuals', type: 'main', index: 0 }]] };
  }
  if (w.name === 'fairyteller_full_visuals') {
    node('Generate Full Visuals').parameters.jsCode = layoutCheck + '\n' + await code('generate-visuals.js');
    // Only the text branch starts the cover, after the image barrier. No duplicate cover launch.
    delete w.connections['Restore Cover Payload'];
  }
  if (w.name === 'fairyteller_visuals') {
    const normalize = node('Normalize Chapter 1 Image');
    normalize.parameters.jsCode = replaceOnce(normalize.parameters.jsCode,
      "pipeline: { next: 'fairyteller_render_publish' }",
      "pipeline: { ...(source.pipeline || {}), next: 'fairyteller_render_publish' }", 'preserve visual run key');
  }
  // Fix wardrobe in the local copies only; production exports remain untouched.
  if (w.name === 'fairyteller_visuals') {
    const cards = node('Restore Hero Reference Payload');
    cards.parameters.jsCode = replaceOnce(cards.parameters.jsCode,
      "function buildHeroCardPrompt(hero, hasPhoto, observedIdentityMap = '') {",
      "function buildHeroCardPrompt(hero, hasPhoto, observedIdentityMap = '') {\n  const wardrobe = localWardrobeForHero(source.text?.bible, hero.n);", 'hero wardrobe');
    cards.parameters.jsCode = replaceOnce(cards.parameters.jsCode,
      "'Keep clothing, if visible and applicable, plain and close to source-image cues. No occupation costume, fantasy outfit, uniform, hat, weapon, magical object, religious symbol, story accessory or readable lettering.',",
      "wardrobe ? localWardrobePrompt(wardrobe) : 'Keep clothing, if visible and applicable, plain and close to source-image cues. No occupation costume, fantasy outfit, uniform, hat, weapon, magical object, religious symbol, story accessory or readable lettering.',", 'remove photo outfit conflict');
    cards.parameters.jsCode = replaceOnce(cards.parameters.jsCode,
      'No dramatic pose, action, scenery, text, labels, logo, watermark, frame, collage, speech bubbles or other people.',
      'Neutral identity study only. Use natural relaxed upper-body posture, empty hands and neutral expression. Ignore story actions, handheld props, instruments and narrative poses in the written hero description or source photo; preserve stable facial identity features and frozen clothing accessories. No dramatic pose, action, scenery, text, labels, logo, watermark, frame, collage, speech bubbles or other people.', 'neutral character card');
    cards.parameters.jsCode = cards.parameters.jsCode.replace('neutral readable pose, clean background', 'neutral readable pose, empty hands, no story props or instruments, clean background');
    cards.parameters.jsCode = cards.parameters.jsCode.replace('Preserve every listed asymmetry and accessory.', 'Preserve every listed asymmetry and facial identity accessory. Clothes in the identity map are observations only; the frozen wardrobe takes priority.');
    cards.parameters.jsCode = replaceOnce(cards.parameters.jsCode, "  'Generate an IMAGE, not a text answer. Create one combined character reference sheet for the whole personalized book.',",
      "  'Generate an IMAGE, not a text answer. Create one combined character reference sheet for the whole personalized book.',\n  localWardrobePrompt(source.text?.bible?.outfitCanon),", 'combined sheet wardrobe');
    const opening = node('Build Chapter 1 Image Prompt');
    opening.parameters.jsCode = opening.parameters.jsCode.replace("cleanText(source.text?.bible?.outfitCanon || '').slice(0, 320)", "cleanText(source.text?.bible?.outfitCanon || '')");
    opening.parameters.jsCode = replaceOnce(opening.parameters.jsCode,
      "(outfitCanon ? '[STORY OUTFIT LOCK — MANDATORY AND UNCHANGED]\\n' + outfitCanon + '\\n\\n' : '')",
      "(outfitCanon ? localWardrobePrompt(outfitCanon) + '\\n\\n' : '')", 'opening frozen wardrobe');
    opening.parameters.jsCode = replaceOnce(opening.parameters.jsCode,
      "const heroes = heroList.map(characterLine).join('\\n');",
      "const openingChapter = source.text?.chapters?.find(c => Number(c.n) === 1);\nif (!openingChapter || !localChapterSceneIsGrounded({ ...openingChapter, scene: openingChapter.visualBrief, sourceQuote: openingChapter.visualSourceQuote }, openingChapter.textBlocks, heroList)) throw new Error('No validated written scene for chapter 1');\nconst heroes = heroList.filter(h => openingChapter.heroNumbers.includes(Number(h.n))).map(characterLine).join('\\n');", 'first scene and visible heroes');
    opening.parameters.jsCode = replaceOnce(opening.parameters.jsCode,
      "const openingPlan = (source.text?.bible?.chapterPlan || []).find((planned) => Number(planned.n) === 1) || source.text?.chapters?.[0] || source.text?.preview || {};",
      'const openingPlan = openingChapter;', 'written opening scene priority');
    opening.parameters.jsCode = replaceOnce(opening.parameters.jsCode,
      "const sceneReferenceCards = referenceCards.filter((card) => card.name && cleanText(summary).toLocaleLowerCase('ru-RU').includes(cleanText(card.name).toLocaleLowerCase('ru-RU')));\nconst chapterReferenceCards = (sceneReferenceCards.length ? sceneReferenceCards : referenceCards).slice(0, 3);",
      'const chapterReferenceCards = referenceCards.filter(card => openingChapter.heroNumbers.includes(Number(card.hero))).slice(0, 3);', 'first numeric identity mapping');
    opening.parameters.jsCode = opening.parameters.jsCode.replace('Do not add extra people, duplicate heroes, readable text, random symbols or unrelated decoration.', 'Show supporting people only as specified by the written scene lock. Do not add unrelated people, duplicate heroes, readable text, random symbols or unrelated decoration.');
    opening.parameters.jsCode = replaceOnce(opening.parameters.jsCode,
      "  '[SCENE]\\n' + summary + '\\n\\n' +",
      "  localSceneImagePrompt(openingChapter) + '\\n\\n' +", 'first scene direction lock');
    opening.parameters.jsCode = opening.parameters.jsCode.replace("openingSceneContract: { physicalPlacement,", "openingSceneContract: { scene: openingChapter.visualBrief, visibleHeroes: openingChapter.heroNumbers, backgroundPeople: openingChapter.backgroundPeople || '', shotType: openingChapter.shotType, physicalPlacement,");
    opening.parameters.jsCode = wardrobeHelper + '\n' + layoutCheck + '\n' + opening.parameters.jsCode;
  }
  if (w.name === 'fairyteller_visuals') {
    const imageNormalize = node('Normalize Chapter 1 Image');
    let imageCode = imageNormalize.parameters.jsCode;
    imageCode = imageCode.replace('const fallbackHeroes = (source.order?.heroes || []).slice(0, 4);',
      'const fallbackHeroes = (source.order?.heroes || []).filter(h => source.text.chapters[0].heroNumbers.includes(Number(h.n)));');
    imageCode = imageCode.replaceAll('Do not add extra people,', 'Show supporting people only as listed in the written scene lock. Do not add unrelated people,');
    imageCode = imageCode.replace('or add other people.', 'or add people absent from the written scene lock.');
    imageCode = imageCode.replace('Keep the main hero calm, friendly and age-appropriate.', 'Keep the scene age-appropriate while preserving the assigned action and reaction.');
    imageCode = imageCode.replace("  noExtraPeople: true,", "  backgroundPeople: openingPlan.backgroundPeople || '',\n  noExtraPeople: !openingPlan.backgroundPeople,");
    imageCode = imageCode.replace("    'Return pass for minor ambiguity", "    'Profiled hero IDs count only mapped heroes; backgroundPeople separately authorizes supporting people. Respect screen projections and reflections as described.',\n    'Return pass for minor ambiguity");
    imageNormalize.parameters.jsCode = imageCode;
  }
  if (w.name === 'fairyteller_cover') {
    const cover = node('Generate Cover');
    cover.parameters.jsCode = cover.parameters.jsCode.replace("safetyCleanText(bible.outfitCanon || '').slice(0, 320)", "safetyCleanText(bible.outfitCanon || '')");
    cover.parameters.jsCode = replaceOnce(cover.parameters.jsCode, "outfitCanon ? 'Story outfit lock, mandatory and unchanged: ' + outfitCanon : ''", 'localWardrobePrompt(outfitCanon)', 'cover frozen wardrobe');
    cover.parameters.jsCode = replaceOnce(cover.parameters.jsCode, "    'Book promise: ' + safetyCleanText(bible.coverArtBrief", "    localWardrobePrompt(bible.outfitCanon),\n    'Book promise: ' + safetyCleanText(bible.coverArtBrief", 'cover fallback wardrobe');
  }
  for (const n of w.nodes) {
    let js = n.parameters?.jsCode;
    if (!js) continue;
    // Reference identity is fixed by cards; clothing is fixed by the book canon.
    if (w.name === 'fairyteller_full_visuals' || (w.name === 'fairyteller_visuals' && ['Generate Chapter 1 Image — Selected Provider', 'Normalize Chapter 1 Image'].includes(n.name))) js = js.replaceAll('no extra people or unrelated props.', 'supporting people only as listed in the written scene lock; no unrelated people or props.');
    js = js.replaceAll('age, clothing colors, body type', 'age, body type').replaceAll('outfit cues, ', '').replaceAll('outfits/accessories', 'facial identity accessories');
    js = js.replaceAll("    showHeroes ? 'Required written hero description:", "    localWardrobePrompt(source.text?.bible?.outfitCanon),\n    showHeroes ? 'Required written hero description:");
    if (js.includes('const promptInfo = compactGrokPrompt(rawPrompt, GROK_OPENLUX_PROMPT_MAX_BYTES);')) {
      // Covers safety retries and QA repairs too, even when they rebuild the scene prompt.
      js = js.replaceAll('const promptInfo = compactGrokPrompt(rawPrompt, GROK_OPENLUX_PROMPT_MAX_BYTES);',
        "const wardrobePrompt = localWardrobePrompt(source.text?.bible?.outfitCanon);\n        const completePrompt = rawPrompt.includes('[FROZEN WARDROBE]') || !wardrobePrompt ? rawPrompt : rawPrompt + '\\n' + wardrobePrompt;\n        const promptInfo = localFitGrokPrompt(completePrompt, GROK_OPENLUX_PROMPT_MAX_BYTES, compactGrokPrompt);");
      js = wardrobeHelper + '\n' + js;
    }
    if (w.name === 'fairyteller_visuals' && ['Generate Chapter 1 Image — Selected Provider', 'Normalize Chapter 1 Image'].includes(n.name)) {
      js = replaceOnce(js, 'const promptInfo = localFitGrokPrompt(completePrompt,',
        "const sceneLock = String(source.imagePrompt || '').match(/\\[WRITTEN SCENE LOCK\\][\\s\\S]*?\\[\\/WRITTEN SCENE LOCK\\]/)?.[0] || '';\n        const completeScenePrompt = sceneLock && !completePrompt.includes('[WRITTEN SCENE LOCK]') ? completePrompt + '\\n' + sceneLock : completePrompt;\n        const promptInfo = localFitGrokPrompt(completeScenePrompt,", 'first retry preserves scene lock');
    }
    n.parameters.jsCode = js;
  }
  // Resume only the missing continuation stages, with an authenticated local request.
  if (['fairyteller_full_text', 'fairyteller_full_visuals'].includes(w.name)) {
    const stage = w.name === 'fairyteller_full_text' ? 'text' : 'visuals';
    const entry = { id: 'local-resume-' + stage, name: 'Resume Continuation ' + stage,
      type: 'n8n-nodes-base.webhook', typeVersion: 2.1, webhookId: 'local-resume-' + stage,
      position: [-400, -300], parameters: { httpMethod: 'POST', path: 'fairyteller/resume-' + stage, responseMode: 'onReceived', options: {} } };
    const unwrap = { id: 'local-auth-resume-' + stage, name: 'Authorize Local Resume ' + stage,
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [-200, -300], parameters: { jsCode: `
const request = $input.first().json;
if (request.headers?.authorization !== 'Bearer ' + $env.FAIRYTELLER_API_TOKEN) throw new Error('Local resume requires authentication');
const payload = request.body;
if (!/^ft_lab_[a-zA-Z0-9_-]+$/.test(payload?.jobId || '') || !payload?.pipeline?.localSequentialRun || !payload?.text?.chapters?.length || !payload?.order) throw new Error('Invalid local resume payload');
return [{ json: payload }];` } };
    w.nodes.push(entry, unwrap);
    w.connections[entry.name] = { main: [[{ node: unwrap.name, type: 'main', index: 0 }]] };
    w.connections[unwrap.name] = { main: [[{ node: stage === 'text' ? 'Claim Full Text Slot' : 'Generate Full Visuals', type: 'main', index: 0 }]] };
  }
  // n8n jsonExample triggers whitelist fields and discarded the shared run key.
  for (const trigger of w.nodes.filter((n) => n.type === 'n8n-nodes-base.executeWorkflowTrigger')) {
    trigger.parameters = { inputSource: 'passthrough' };
  }
  // Guard every entry BEFORE an HTTP mutation (chapter-one starts with a PATCH).
  for (const entry of [...w.nodes].filter((n) => n.type.endsWith('Trigger') || n.type === 'n8n-nodes-base.webhook')) {
    const entryGuard = { id: 'local-guard-' + entry.id, name: 'Validate Local Target - ' + entry.name,
      type: 'n8n-nodes-base.code', typeVersion: 2, position: [entry.position[0] + 100, entry.position[1] + 100],
      parameters: { jsCode: 'return $input.all();' } };
    w.nodes.push(entryGuard);
    w.connections[entryGuard.name] = w.connections[entry.name] || { main: [] };
    w.connections[entry.name] = { main: [[{ node: entryGuard.name, type: 'main', index: 0 }]] };
  }
  for (const n of w.nodes) {
    if (n.type === 'n8n-nodes-base.executeWorkflow') {
      const oldId = n.parameters?.workflowId?.value;
      if (remap[oldId]) n.parameters.workflowId.value = remap[oldId];
      else n.disabled = true; // Disconnected legacy render placeholder must not call production.
    }
    if (n.type === 'n8n-nodes-base.webhook') {
      n.parameters.path = 'local-sequential-' + n.parameters.path;
      // n8n prepends workflow/node names when webhookId is absent, even for a full path.
      const hash = createHash('sha256').update(ids[original.name] + ':' + n.id).digest('hex');
      n.webhookId = hash.slice(0, 8) + '-' + hash.slice(8, 12) + '-4' + hash.slice(13, 16)
        + '-a' + hash.slice(17, 20) + '-' + hash.slice(20, 32);
    }
  }
  w.id = ids[original.name];
  w.name = original.name + '_local_sequential';
  w.active = false;
  w.settings = { ...w.settings, executionTimeout: 1200 };
  for (const key of ['activeVersionId', 'versionId', 'versionCounter', 'shared', 'createdAt', 'updatedAt', 'pinData', 'activeVersion']) delete w[key];
  const prepared = localize(w);
  const serialized = JSON.stringify([prepared], null, 2) + '\n';
  if (/https:\/\/fairyteller\.ru/.test(serialized)) throw new Error('Production URL remains in ' + w.name);
  const path = resolve(out, original.name + '.workflow.json');
  await writeFile(path, serialized);
  manifest.push({ name: w.name, id: w.id, active: false, baselineVersion: original.activeVersionId || original.versionId,
    sha256: createHash('sha256').update(serialized).digest('hex') });
}
await writeFile(resolve(out, 'manifest.json'), JSON.stringify({ mode: 'local_only',
  textModelSwitch: { env: 'FAIRYTELLER_LOCAL_TEXT_MODEL', default: 'gemini-2.5-pro', candidate: 'grok-4.3', provider: 'openlux', grokReasoningEffort: 'low', gptCandidate: 'gpt-6.1-sol', gptReasoningEffort: 'low', gptResponseFormat: 'json_schema_strict' },
  workflows: manifest }, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, localOnly: true, workflows: manifest.length, directory: out }));

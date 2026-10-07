// Shared short request: prose and book planning never belong to this response.
function localSceneRepairRequest(chapter, heroes, outfitCanon = '', error = '') {
  return {
    contents: [{ role: 'user', parts: [{ text:
      'Исправь только описание иллюстрации и читательскую аннотацию готовой главы. Прозу не возвращай и не переписывай. '
      + localSceneSelectionInstructions() + ' '
      + 'Укажи только присутствующих героев из списка. Не придумывай предметы, действия, смену одежды или важную деталь. '
      + 'Аннотация без развязки и спойлеров. useArtifactCanon=false, если канон не дан явно. '
      + '\nГерои: ' + JSON.stringify((heroes || []).map(h => ({ n: h.n, name: h.name })))
      + '\nКостюм: ' + outfitCanon
      + '\nОшибка: ' + error
      + '\nВСЯ НАПИСАННАЯ ГЛАВА: ' + (chapter.textBlocks || []).map(localBlockText).join('\n\n')
      + '\nТекущая аннотация: ' + String(chapter.summary || '')
      + '\nВерни JSON {summary, visualScene: {scene, sourceQuote, heroNumbers, shotType, physicalPlacement, spatialRelations, backgroundPeople, supportingPeopleQuote, forbiddenMisreads, useArtifactCanon, artifactRole, requiredObjects, objectScale, forbiddenElements}}.' }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 2000,
      thinkingConfig: { thinkingBudget: 128 },
      responseSchema: { type: 'OBJECT', properties: {
        summary: { type: 'STRING' },
        visualScene: { type: 'OBJECT', properties: {
          scene: { type: 'STRING' }, sourceQuote: { type: 'STRING' },
          heroNumbers: { type: 'ARRAY', items: { type: 'NUMBER' } },
          shotType: { type: 'STRING' }, physicalPlacement: { type: 'STRING' },
          backgroundPeople: { type: 'STRING' }, supportingPeopleQuote: { type: 'STRING' },
          spatialRelations: { type: 'ARRAY', items: { type: 'STRING' } },
          forbiddenMisreads: { type: 'ARRAY', items: { type: 'STRING' } },
          useArtifactCanon: { type: 'BOOLEAN' }, artifactRole: { type: 'STRING' },
          requiredObjects: { type: 'ARRAY', items: { type: 'STRING' } },
          objectScale: { type: 'STRING' }, forbiddenElements: { type: 'ARRAY', items: { type: 'STRING' } },
        }, required: ['scene', 'sourceQuote', 'heroNumbers', 'shotType', 'physicalPlacement'] },
      }, required: ['summary', 'visualScene'] },
    },
  };
}

// A single textual relation is equivalent to a one-item list, not a prose defect.
function localNormalizeSceneLists(scene) {
  if (!scene) return scene;
  const result = { ...scene };
  if (Array.isArray(scene.heroNumbers)) result.heroNumbers = [...new Set(scene.heroNumbers.map(Number))];
  for (const [key, limit] of [['spatialRelations', 3], ['forbiddenMisreads', 3], ['requiredObjects', 4], ['forbiddenElements', 3]]) {
    const value = scene[key];
    if (value == null || value === '') { result[key] = []; continue; }
    const list = typeof value === 'string' ? [value] : value;
    if (!Array.isArray(list) || list.some(item => typeof item !== 'string')) throw new Error('visualScene ' + key + ' must contain text or a list of strings');
    result[key] = list.map(item => item.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, limit);
  }
  return result;
}

function localWrittenScene(chapter) {
  if (chapter?.visualScene) return localNormalizeSceneLists(chapter.visualScene);
  // A flat scene is accepted only with its own written-text quote; planned briefs alone are insufficient.
  if (typeof chapter?.sourceQuote !== 'string' || typeof chapter?.visualBrief !== 'string') return null;
  const scene = { scene: chapter.visualBrief };
  for (const key of ['sourceQuote', 'heroNumbers', 'shotType', 'physicalPlacement', 'spatialRelations', 'backgroundPeople', 'supportingPeopleQuote', 'forbiddenMisreads', 'useArtifactCanon', 'artifactRole', 'requiredObjects', 'objectScale', 'forbiddenElements']) scene[key] = chapter[key];
  return localNormalizeSceneLists(scene);
}

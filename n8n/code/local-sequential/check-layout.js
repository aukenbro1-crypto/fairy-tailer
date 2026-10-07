// Scene selection is independent of physical page boundaries. No model calls.
function localSceneEvidence(textBlocks, quote) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const blocks = (Array.isArray(textBlocks) ? textBlocks : [textBlocks]).map(normalize);
  const needle = normalize(quote), text = blocks.join(' ');
  const start = needle ? text.indexOf(needle) : -1;
  if (start < 0) return null;
  let offset = 0;
  const indices = [];
  blocks.forEach((block, index) => {
    if (offset < start + needle.length && offset + block.length > start) indices.push(index);
    offset += block.length + 1;
  });
  return { indices, text: indices.map(i => blocks[i]).join(' ') };
}
function localChapterSceneIsGrounded(scene, textBlocks, heroes) {
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const available = new Set((heroes || []).map(h => Number(h.n)));
  return !!(scene && normalize(scene.scene).length >= 40 && normalize(scene.sourceQuote).length >= 24
    && localSceneEvidence(textBlocks, scene.sourceQuote) && normalize(scene.shotType) && normalize(scene.physicalPlacement)
    && Array.isArray(scene.heroNumbers) && scene.heroNumbers.length && scene.heroNumbers.every(n => available.has(Number(n)))
    && (scene.backgroundPeople == null || typeof scene.backgroundPeople === 'string')
    && (!normalize(scene.backgroundPeople) || (normalize(scene.supportingPeopleQuote).length >= 24 && localSceneEvidence(textBlocks, scene.supportingPeopleQuote))));
}
function localSceneSelectionInstructions() {
  return 'ТЗ ИЛЛЮСТРАЦИИ: после прозы выбери один выразительный момент из ВСЕЙ написанной главы, включая середину и финал. '
    + 'Покажи изменение ситуации, выбор или последствие через конкретное действие и видимую реакцию; тихий момент тоже подходит. '
    + 'Не переделывай прозу ради картинки и не ускоряй спокойное описательное начало первой главы. '
    + 'scene на английском, до 650 знаков: что происходит сейчас, что делают руки и тело, куда направлен взгляд, как реагирует другой персонаж или среда. Один момент, без монтажа и цепочки событий. '
    + 'sourceQuote — дословная непрерывная цитата от 24 знаков из любого места главы, подтверждающая выбранный момент. '
    + 'heroNumbers — только анкетные герои, видимые в этом кадре; явно различай физическое присутствие, экранное изображение, проекцию или отражение, если они есть в прозе. '
    + 'backgroundPeople — короткое английское описание нужных второстепенных людей и их действий; пустая строка, если их нет. '
    + 'При непустом backgroundPeople добавь supportingPeopleQuote — дословную цитату от 24 знаков из главы, подтверждающую этих людей. '
    + 'shotType и physicalPlacement задают масштаб, ракурс и позиции. Учитывай уже выбранные кадры, меняй композицию осмысленно, не повторяй фронтальную позу по умолчанию. '
    + 'useArtifactCanon=true только если важная деталь явно задана и видна в выбранной сцене; иначе false. В requiredObjects перечисли реальные предметы выбранного момента. Не добавляй отсутствующие предметы, людей, костюмы или важную деталь. Предварительный visualBrief плана не является источником фактов.';
}
function localSceneImagePrompt(chapter) {
  const clean = (value, limit) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  return '[WRITTEN SCENE LOCK]\n'
    + 'SCENE: ' + clean(chapter.visualBrief || chapter.scene, 650) + '\n'
    + 'VISIBLE PROFILED HERO IDS: ' + (chapter.heroNumbers || []).join(', ') + '\n'
    + 'SHOT: ' + clean(chapter.shotType, 100) + '; PLACEMENT: ' + clean(chapter.physicalPlacement, 360) + '\n'
    + 'RELATIONS: ' + clean((chapter.spatialRelations || []).join('; '), 300) + '\n'
    + 'BACKGROUND PEOPLE: ' + (clean(chapter.backgroundPeople, 360) || 'None. Do not add people.') + '\n'
    + 'Identity references define face, age, hair and proportions; frozen wardrobe defines clothing. Never copy their pose, expression, framing or held props. References do not imply physical presence. Respect projections/reflections exactly as described.\n'
    + 'Make the action and visible reaction readable through hands, posture, gaze and environment. Characters look at what matters in the scene, not at the viewer by default. Supporting people are allowed only as listed above; never clone a profiled hero.\n'
    + 'Use a single coherent moment in the assigned composition. No generic group portrait, repeated reference pose, readable text or invented plot events.\n[/WRITTEN SCENE LOCK]';
}

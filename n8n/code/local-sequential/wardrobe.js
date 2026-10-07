// Shared local wardrobe contract. No model calls or image regeneration.
const LOCAL_WARDROBE_VERSION = 'local-wardrobe-v1';
function localWardrobeInstructions() {
  return 'ЕДИНЫЙ КОСТЮМ КНИГИ: в этом же ответе создай wardrobeCanon — по одной записи { heroNumber, description } для каждого анкетного героя. '
    + 'description на английском, 60-240 ASCII-знаков: конкретные предметы одежды, крой, цвета, узор, обувь и постоянные дополнительные аксессуары. '
    + 'Уважай явно заданную одежду пользователя. Если её нет, выбери один простой подходящий истории комплект без списка вариантов. '
    + 'Этот комплект неизменен в первой главе, продолжении, карточках героев, иллюстрациях и обложке. Не переодевай героя и не добавляй детали костюма ради новой сцены. '
    + 'Не меняй внешность, очки и другие признаки личности по фото. Для естественного нечеловеческого героя не придумывай человеческую одежду: сохраняй его анатомию и референс. '
    + 'Описание костюма не является предметом сюжета. Не трать дополнительные абзацы на перечисление одежды. План и проза сразу должны соответствовать wardrobeCanon.';
}
function localValidateWardrobe(generated, heroes) {
  const records = generated?.wardrobeCanon;
  const expected = (heroes || []).map(h => Number(h.n));
  if (!Array.isArray(records) || records.length !== expected.length) throw new Error('Wardrobe contract: one outfit per supplied hero is required');
  const seen = new Set();
  const validated = records.map(value => {
    const record = value || {};
    const heroNumber = Number(record.heroNumber);
    const description = String(record.description || '').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();
    if (!expected.includes(heroNumber) || seen.has(heroNumber)) throw new Error('Wardrobe contract: unknown or duplicate hero');
    if (description.length < 60 || description.length > 240 || /[^\x20-\x7e]/.test(description)) throw new Error('Wardrobe contract: Hero ' + heroNumber + ' needs a compact English outfit of 60-240 ASCII characters');
    seen.add(heroNumber);
    return { heroNumber, name: String(heroes.find(h => Number(h.n) === heroNumber)?.name || '').trim(), description };
  });
  return validated.sort((a,b) => a.heroNumber - b.heroNumber);
}
function localWardrobeText(records) {
  return (records || []).map(r => 'Hero ' + r.heroNumber + ' (' + r.name + '): ' + r.description).join('; ');
}
function localWardrobePrompt(canon) {
  if (!canon) return '';
  return '[FROZEN WARDROBE]\n' + canon + '\nKeep these exact garments, colors, cut, pattern, shoes and clothing accessories. Never copy a conflicting outfit from a photo, identity card, style example or scene. Preserve facial identity accessories.\n[/FROZEN WARDROBE]';
}
function localWardrobeForHero(bible, heroNumber) {
  const record = (bible?.wardrobeCanon || []).find(r => Number(r.heroNumber) === Number(heroNumber));
  return record ? localWardrobeText([record]) : (bible?.outfitCanon || '');
}
function localFitGrokPrompt(raw, maxBytes, compact) {
  const original = String(raw || '').trim();
  const bytes = value => Buffer.byteLength(value, 'utf8');
  const protectedSections = /\[(FROZEN WARDROBE|WRITTEN SCENE LOCK)\][\s\S]*?\[\/\1\]/g;
  const frozen = [...original.matchAll(protectedSections)].map(m => m[0]);
  const locked = [...new Set(frozen)].join('\n');
  if (!locked) return compact(original, maxBytes);
  if (bytes(original) <= maxBytes) return {prompt:original,originalBytes:bytes(original),finalBytes:bytes(original),compacted:false};
  const reservation = bytes(locked) + 1;
  if (reservation >= maxBytes - 2000) throw new Error('Image prompt maximum length exceeded: protected wardrobe and scene leave no room for rendering instructions');
  const remaining = original.replace(protectedSections, '').trim();
  const fitted = compact(remaining, maxBytes - reservation);
  const prompt = fitted.prompt + '\n' + locked;
  if (bytes(prompt) > maxBytes || prompt.length > 8000) throw new Error('Image prompt maximum length exceeded');
  return {prompt,originalBytes:bytes(original),finalBytes:bytes(prompt),compacted:true};
}

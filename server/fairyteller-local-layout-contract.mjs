// Shared only by the opt-in local workflow and its renderer checks.
export const LOCAL_LAYOUT_VERSION = 'local-pages-v4';
export const LOCAL_PRINT_LAYOUT = { contractVersion: LOCAL_LAYOUT_VERSION, layoutStage: 'final', storyFontMode: 'regular', storyTextAlign: 'justify' };
export const LOCAL_CHAPTER_BLOCKS = { 1: 4, 2: 4, 3: 6, 4: 6, 5: 5 };
export function localBlockText(value) {
  return String(value || '').replace(/\r\n?/g, '\n').split(/\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
}
export function localChapterTarget(n) {
  const blocks = LOCAL_CHAPTER_BLOCKS[Number(n)];
  if (!blocks) throw new Error('Invalid local chapter number');
  return { blocks, min: blocks * 780, max: blocks * 920, blockMin: 680, blockMax: 1000, paragraphsMin: 2, paragraphsMax: 8 };
}
// Before images/later chapters, only content and scene integrity matter. Typography runs once at the end.
export function localChapterContentIssues(chapter) {
  const issues = [];
  if (!LOCAL_CHAPTER_BLOCKS[Number(chapter?.n)]) issues.push('invalid chapter number');
  if (!Array.isArray(chapter?.textBlocks) || !chapter.textBlocks.length
      || chapter.textBlocks.some(b => typeof b !== 'string' || !localBlockText(b))) issues.push('chapter must contain nonempty text strings');
  return issues;
}
export function localChapterIssues(chapter, { preparePages = false } = {}) {
  const n = Number(chapter?.n); const t = localChapterTarget(n);
  const blocks = (chapter.textBlocks || []).map(localBlockText);
  const issues = [];
  if (blocks.length !== t.blocks) issues.push('expected ' + t.blocks + ' text blocks, got ' + blocks.length);
  const total = blocks.reduce((sum, b) => sum + b.length, 0);
  if (total < Math.ceil(t.min * 0.97) || total > Math.floor(t.max * 1.03)) issues.push('chapter ' + n + ' has ' + total + ' characters; required ' + t.min + '-' + t.max);
  blocks.forEach((b, i) => {
    if (preparePages && i > 0) return;
    // 960 is the first-page writing target; its actual safe box decides whether 961-1000 fits.
    const max = n === 5 && i === t.blocks - 1 ? 880 : t.blockMax;
    if (b.length < t.blockMin || b.length > max) issues.push('block ' + (i + 1) + ' has ' + b.length + ' characters; required ' + t.blockMin + '-' + max);
    const paragraphs = b ? b.split('\n\n').length : 0;
    if (paragraphs < t.paragraphsMin || paragraphs > t.paragraphsMax) issues.push('block ' + (i + 1) + ' has ' + paragraphs + ' paragraphs; required 2-8');
  });
  return issues;
}
export function localChapterInstructions(n) {
  const t = localChapterTarget(n);
  return 'ПЕЧАТНЫЙ ДОГОВОР ' + LOCAL_LAYOUT_VERSION + ': глава ' + n + ' — ровно ' + t.blocks
    + ' textBlocks, общий объём ' + t.min + '-' + t.max + ' знаков с пробелами (сумма длин блоков). Сцена иллюстрации выбирается из всей главы после написания прозы; сборщик распределяет все блоки между страницами без изменения слов. '
    + 'В блоке 680-1000 знаков, в первом максимум 960; в последнем блоке главы 5 максимум 880. '
    + 'Цель 820-900 знаков на обычную страницу. Делай 2-5 содержательных абзацев, разделённых \\n\\n; с отдельными репликами допускается до 8. '
    + 'Не добавляй пустые абзацы или повторения для достижения объёма. Короткие предложения помогают переносам. '
    + 'Шрифт 10.5 pt, размер страницы фиксирован. Сборщик проверит реальную высоту; не рассчитывай на уменьшение шрифта. Эти ограничения заменяют прежние указания по печатному объёму.';
}
export function localDensityIssues(storyFont) {
  const issues = [];
  for (const c of storyFont?.pagination?.chapters || []) {
    for (const p of c.pages || []) {
      if (!Number.isFinite(p.utilization) || p.utilization > 1.001) {
        issues.push({ chapter: c.chapter, block: p.block, pageNumber: p.pageNumber, utilization: p.utilization,
          message: 'chapter ' + c.chapter + ', block ' + p.block + ': page utilization ' + Number(p.utilization).toFixed(3) + '; must fit within the safe text box' });
      }
    }
  }
  return issues;
}

export function localDensityWarnings(storyFont) {
  return (storyFont?.pagination?.chapters || []).flatMap(c => (c.pages || [])
    .filter(p => p.utilization < 0.75 || p.utilization > 0.95)
    .map(p => ({ chapter: c.chapter, block: p.block, pageNumber: p.pageNumber, utilization: p.utilization })));
}
export function localChapterTitle(value) {
  return String(value || '').replace(/^\s*глава\s+(?:\d+|[ivxlcdm]+)\s*(?:[.:—–-]\s*|$)/i, '').trim() || 'Без названия';
}

// Paragraph boundaries are presentation, not new prose. Never split dialogue or quoted material.
export function localPrepareBlockParagraphs(value) {
  const block = localBlockText(value);
  if (block.includes('\n\n') || block.length < 680 || /[—–«»"]/.test(block)) return typeof value === 'string' ? value : block;
  const boundaries = [...block.matchAll(/[.!?…]\s+(?=[А-ЯЁA-Z])/g)]
    .map(m => m.index + 1)
    .filter(i => i >= 160 && block.length - i >= 160 && !/(?:^|\s)(?:г|ул|д|им|рис|стр)\.$/i.test(block.slice(0, i)));
  if (!boundaries.length) return block;
  const split = boundaries.reduce((best, i) => Math.abs(i - block.length / 2) < Math.abs(best - block.length / 2) ? i : best);
  return block.slice(0, split).trimEnd() + '\n\n' + block.slice(split).trimStart();
}

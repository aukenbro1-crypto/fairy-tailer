import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
for (const [name, nodeName] of [['fairyteller_text', 'Build First Chapter Prompt'], ['fairyteller_full_text', 'Build Full Text Prompt']]) {
 const path = new URL('n8n/workflows/' + name + '.workflow.json', root);
 const docs = JSON.parse(await readFile(path, 'utf8'));
 const node = docs[0].nodes.find(n => n.name === nodeName);
 if (node.parameters.jsCode.includes('ANTAGONIST_ROLE_V1')) throw Error('Already applied');
 const policy = `// ANTAGONIST_ROLE_V1: the constructor uses the existing persisted relation field.
const antagonistHero = activeHeroes.find(hero => Number(hero.n) === 2 && hero.relation === 'Антагонист главного героя');
const antagonistPolicy = antagonistHero
  ? 'РОЛЬ ГЕРОЯ 2 — АНТАГОНИСТ: ' + antagonistHero.name + ' противостоит главному герою 1. Это обязательная роль, приоритетнее общих жанровых рекомендаций о паре, команде, совместном пути или романтическом сближении. Сохраняй имя, описание, возраст, факты и внешность героя 2. Дай ему собственную понятную цель и мотив; его действия создают препятствия и меняют решения героя 1. Не превращай его в напарника, постоянного помощника или романтического партнера по умолчанию. Конфликт развивается через поступки и последствия в плане и главах; не своди роль к слову злодей или декоративной ссоре. Согласуй развязку с развитием конфликта; примирение не обязательно и не отменяет противодействие задним числом. Для детской истории противодействие остается эмоционально безопасным: без жестокости, травмирующих угроз и предательства близких. Не делай внешность человека зловещей из-за сюжетной роли. При иллюстрациях выбирай героев по фактической сцене, а не обязательно вместе.'
  : '';
`;
 const anchor = 'const protagonistPolicy = protagonistPolicyFor(protagonistMode);';
 if (!node.parameters.jsCode.includes(anchor)) throw Error('Policy anchor missing');
 node.parameters.jsCode = node.parameters.jsCode.replace(anchor, policy + '\nconst protagonistPolicy = antagonistHero ? antagonistPolicy : protagonistPolicyFor(protagonistMode);');
 // System instructions survive the durable chapter-request trimming.
 const target = name === 'fairyteller_text' ? 'const systemText = storyDramaturgy' : 'const systemText = continuationDramaturgy';
 if (!node.parameters.jsCode.includes(target)) throw Error('System anchor missing');
 node.parameters.jsCode = node.parameters.jsCode.replace(target, 'const systemText = (antagonistPolicy ? antagonistPolicy + "\\n\\n" : "") + ' + (name === 'fairyteller_text' ? 'storyDramaturgy' : 'continuationDramaturgy'));
 await writeFile(path, JSON.stringify(docs, null, 2) + '\n');
}

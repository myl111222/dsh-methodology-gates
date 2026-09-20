// Offline test suite for dsh-methodology-gates.
// Captures the real tool definition with stub services, then exercises the pure
// logic (lookup / family resolution / routing) directly — no profile restart.
// Cases marked F1/F2/F4 come from the adversarial review of v0.1.1.
// Point at the INSTALLED copy by default: only there does `@deepseek-ai/dsh-tools`
// resolve (the source directory has no node_modules chain), so this tests exactly
// what the profile will load. Override with MTHD_BASE to test a mutated copy —
// which is how the mutation harness checks that these assertions CAN fail.
const base = process.env.MTHD_BASE
  || 'file:///C:/Users/Administrator/.dsh/profiles/web/node_modules/dsh-methodology-gates/lib/index.js';
const m = await import(base);

let def = null;
let sectionText = '';
const ctx = {
  get(n) {
    if (n === 'tools') return { register: (d) => { def = d; return () => {}; } };
    if (n === 'systemPrompt') return { section: (s) => { sectionText = typeof s.text === 'string' ? s.text : ''; return () => {}; } };
    if (n === 'commands') return { register: () => () => {} };
    return undefined;
  },
  effect(cb) { cb(); return () => {}; }
};
m.apply(ctx);
if (def === null) { console.log('FATAL: no tool definition captured'); process.exit(1); }

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) { pass += 1; console.log('PASS  ' + name); }
  else { fail += 1; console.log('FAIL  ' + name + '  :: ' + detail); }
}
const show = async (word) => (await def.execute(word === undefined ? { action: 'show' } : { action: 'show', word })).text;
const list = async (family) => (await def.execute(family === undefined ? { action: 'list' } : { action: 'list', family })).text;
const route = async (task) => (await def.execute({ action: 'route', task })).text;

// F2: a substring query matching several entries must not masquerade as exact.
const s1 = await show('思维');
check('F2 substring: warns instead of faking an exact hit', s1.includes('⚠'), s1.split('\n')[0]);
check('F2 substring: lists the other candidates', s1.includes('逆向思维') && s1.includes('二阶思维'), s1.split('\n')[0]);

// An exact hit must stay clean.
const s2 = await show('对抗式审查');
check('exact hit stays unmarked', !s2.includes('⚠') && s2.includes('对抗式审查'), s2.split('\n')[0]);

// A unique substring hit may still pass as exact.
const s2b = await show('奥卡姆');
check('unique substring hit resolves cleanly', !s2b.includes('⚠') && s2b.includes('奥卡姆剃刀'), s2b.split('\n')[0]);

// F1: show without word must not echo `undefined`.
const s3 = await show();
check('F1 missing word: no "undefined" on screen', !s3.includes('undefined'), s3.split('\n')[0]);
check('F1 missing word: explains what to pass', s3.includes('需要 word'), s3.split('\n')[0]);

// F4: a single-letter family must not match a label by substring.
const l1 = await list('e');
check('F4 single-letter family rejected', l1.includes('没有名为'), l1.split('\n')[0]);

// The documented family inputs still work.
const l2 = await list('工程与设计');
check('chinese family label still works', l2.includes('本族 8 条'), l2.split('\n')[0]);
const l2b = await list('thinking');
check('family id still works', l2b.includes('本族 8 条'), l2b.split('\n')[0]);

// Totals and routing.
const l3 = await list();
check('catalog reports 36 entries', l3.includes('共 36 条'), l3.split('\n')[0]);
const r1 = await route('交付');
check('route detects the deliver phase', r1.includes('deliver'), r1.split('\n')[0]);
check('route separates phase gates from wording hits', r1.includes('【阶段闸门】'), r1.split('\n')[1]);

// --- retrieval (recall@6): a ranked retriever must be judged on whether the
// right entry is REACHED, not on an exact ordering. Each case is phrased the way
// a person would actually say it.
const recall = async (task, expected) => {
  const out = await route(task);
  check('route recall@6: "' + task + '" reaches ' + expected, out.includes(expected), out.split('\n').slice(0, 4).join(' | '));
};
await recall('改一段没有测试覆盖的代码', '红绿重构');
await recall('线上出了事故，要写复盘', '无指责复盘');
await recall('方案定了，准备开工', '事前验尸');
await recall('想加一层缓存提高性能', '奥卡姆剃刀');
await recall('系统应该能扛住断网，但从没验证过', '混沌工程');
await recall('同一份数据存了两个地方', '单一事实来源');
await recall('想推倒重写整个模块', '加尔定律');
await recall('要采纳另一个 agent 的结论', '保持独立思考');

// --- review findings on the retrieval logic (F1 / F2 / F4) ---
// F1: a mixed task must not lose the delivery gates to a design word.
const mixed = await route('重构并上线');
check('F1 mixed task keeps the delivery gates', mixed.includes('对抗式审查') && mixed.includes('消融实验'), mixed.split('\n').slice(0, 3).join(' | '));
check('F1 mixed task names every matched phase', mixed.includes('还命中'), mixed.split('\n')[0]);
// F2: colloquial phrasing must reach the right entry, not a generic pipeline.
await recall('线上崩了要写复盘', '无指责复盘');
await recall('测试挂了一片', '红绿重构');
await recall('这段代码没人敢动', '切斯特顿栅栏');
// F2b: a genuine miss must say so instead of prescribing heavy gates.
const miss = await route('今天天气不错');
check('F2b a miss refuses to prescribe', !miss.includes('消融实验') && miss.includes('未命中'), miss.split('\n')[0]);
// F4: every answer carries its build identity.
check('F4 route output identifies the build', mixed.startsWith('[mth@'), mixed.split('\n')[0]);
const idList = await list();
check('F4 list output identifies the build', idList.startsWith('[mth@'), idList.split('\n')[0]);
check('catalog pipeline is generated from data', idList.includes('第一性原理') && idList.includes('→'), idList.split('\n').slice(-1)[0]);

// --- survivors found by mutation testing (added in 0.1.7) --------------------
// These five behaviours had NO assertion checking them; each mutation below the
// comment proved it by surviving a full green run.
// (a) the leading phase must be the highest-priority match, not merely "a" match
check('mixed task leads with deliver, not design', mixed.includes('阶段 = deliver'), mixed.split('\n')[0]);
// (b) a single ASCII letter must not reach the fuzzy fallback through "Agent"
const singleLetter = await show('e');
check('single letter does not produce a fuzzy hit list', !singleLetter.includes('⚠'), singleLetter.split('\n')[0]);
// (c) the catalog pipeline line must carry the real pipeline, in order
const pipeLine = idList.split('\n').slice(-1)[0];
check(
  'catalog pipeline names every entry in order',
  pipeLine.indexOf('第一性原理') !== -1
    && pipeLine.indexOf('第一性原理') < pipeLine.indexOf('高内聚低耦合')
    && pipeLine.indexOf('高内聚低耦合') < pipeLine.indexOf('列出所有不自信的点'),
  pipeLine
);
// (d) the hard-dependency list must actually declare all three registries
const inj = Array.isArray(m.inject) ? m.inject : [];
check(
  'inject declares systemPrompt + tools + commands',
  inj.indexOf('systemPrompt') !== -1 && inj.indexOf('tools') !== -1 && inj.indexOf('commands') !== -1,
  JSON.stringify(inj)
);

// route without a task must ask for one instead of guessing.
const r2 = await route('');
check('route without task asks for it', r2.includes('需要 task'), r2.split('\n')[0]);
check('route output shows the matched terms', r1.includes('命中') || r1.includes('阶段命中'), r1.split('\n')[1]);

// The always-on section must be GENERATED from the table (single source of truth),
// so a rename or a removed entry cannot leave stale prose behind.
const core8 = ['第一性原理', '对抗式审查', '消融实验', '奥卡姆剃刀', '列出所有不自信的点', '保持独立思考', '批判性思维', '高内聚低耦合'];
const missingCore = core8.filter((w) => !sectionText.includes(w));
check('section carries all 8 core words', missingCore.length === 0, 'missing: ' + missingCore.join('、'));
const pointers = ['事前验尸', '五个为什么', '红绿重构', 'YAGNI', '切斯特顿栅栏'];
const missingPtr = pointers.filter((w) => !sectionText.includes(w));
check('section points at non-core entries too', missingPtr.length === 0, 'missing: ' + missingPtr.join('、'));
check('section tells the agent to route first', sectionText.includes('action=route'), sectionText.split('\n')[1]);
check('section states the two hard gates', sectionText.includes('没做，就明说'), sectionText.split('\n').slice(-1)[0]);

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);

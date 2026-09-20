// dsh-methodology-gates — Host half.
//
// Delivers three capabilities, all scoped to the mounting context's layer:
//   1. an always-on prompt section: the 8 agent-work trigger words and the two
//      rules that must NOT stay inside one context (adversarial review needs a
//      context that did not implement; ablation needs a baseline and a real re-run);
//   2. the `methodology` model tool: list / show / route over a 36-entry,
//      6-family catalog;
//   3. the `/methodology` human command.
//
// No service is published, so the row needs no isolate realm.

import { defineTool } from '@deepseek-ai/dsh-tools';
import { createRequire } from 'node:module';

// Every answer carries its own build identity. An adversarial review once burned
// its whole budget discovering that the RUNNING build was three versions behind
// the file it had been told to review; a self-identifying output makes "which
// build answered me" answerable forever instead of inferable never.
let VERSION = 'unknown';
try {
  VERSION = createRequire(import.meta.url)('../package.json').version;
} catch {
  // Keep 'unknown': identity is diagnostic, never load-bearing.
}
const TAG = '[mth@' + VERSION + '] ';

/** Cordis plugin name. */
const name = 'methodology-gates';
/**
 * Hard dependencies. Declaring them makes this row WAIT for the two registries
 * instead of racing them. Observed failure with the optional `ctx.get()` form:
 * the prompt section landed but the tool did not, because `tools.register()`
 * threw inside a later `ctx.effect` and the row kept its partial success.
 */
const inject = ['systemPrompt', 'tools', 'commands'];

const FAMILIES = [
  { id: 'core', label: 'Agent 工作闸门（题图）' },
  { id: 'thinking', label: '思考与决策' },
  { id: 'engineering', label: '工程与设计' },
  { id: 'verification', label: '验证与质量' },
  { id: 'process', label: '流程与交付' },
  { id: 'team', label: '协作与组织' }
];
const TABLE = [
{ id: 'first-principles', word: '第一性原理', family: 'core', src: '题图', route: 'self',
  when: '方案是抄来的、“大家都这么做”、需求写成“优化现有流程”时',
  steps: ['把目标写成可判定的形式：做到什么算成功，谁能看出来', '列出当前方案继承的每一条前提假设', '逐条问：这是事实还是习惯？删掉它，目标还成立吗', '只从剩下的事实重建方案，不在旧方案上打补丁'],
  artifact: '一条被删掉的前提 + 从事实重建的最小方案', anti: '变成重新造轮子；判据是“目标可判定”，不是“做法新颖”',
  mechanism: '自己走完四步；理由里一旦出现“一直以来都这样”，停下来重问',
  draft: '用「第一性原理」重做这个方案：先写出可判定的目标，再列出它继承的前提假设，逐条问“这是事实还是习惯”，只从剩下的事实重建。' },
{ id: 'adversarial-review', word: '对抗式审查', family: 'core', src: '题图 + 维基（无我编程）', route: 'external',
  when: '实现完成、自己觉得没问题时（越自信越要做）',
  steps: ['另开一个没参与实现的上下文（subagent 或团队成员）', '只给它实现契约 + 验收标准 + 产物本身，不给你的自述和结论', '要求每条问题都带 file:line 和可复现的命令', '先收可复现的失败，再谈风格', '讨论只对事实与后果，不对作者：批评代码不等于批评人'],
  artifact: 'findings 清单，可复现的失败排在意见前面', anti: '自己审自己会继承同一套错误假设；让审查者动手改，就变成第二个实现者',
  mechanism: 'subagent 新上下文，或 AgentTeams 的 review 任务；不能在同一条上下文里自查',
  draft: '用「对抗式审查」审这份实现：另开一个没参与实现的上下文，只给它契约+验收标准+产物，要求每条问题带 file:line 和复现命令。Prove it, don’t tell me.' },
{ id: 'ablation', word: '消融实验', family: 'core', src: '题图', route: 'external',
  when: '方案里有几条规则、工具或抽象，只是“感觉有用”时',
  steps: ['先跑基线：同一输入、同一评测，记下当前数字', '一次只删一个组件（规则／工具／抽象层／提示词段落）', '删完必须真跑，不许用“看起来没用”代替实测', '记录每个组件的差异，没有差异的就是可以删的'],
  artifact: '每个机制“起没起作用”的实测证据', anti: '没基线就删、一次删两个变量、删了不跑',
  mechanism: '真跑项目里的验证命令（测试／构建／lint），不是空想',
  draft: '用「消融实验」验证这套机制：先跑基线记录数字，再一次只删一个组件重跑，给出每个组件是否起作用的实测证据。' },
{ id: 'occam', word: '奥卡姆剃刀', family: 'core', src: '题图 + 通识（Taleb 否定法）', route: 'self',
  when: '设计阶段，以及每次想加缓存、队列、抽象层、第二个 Agent 时',
  steps: ['先列出当前让你难受的三件事：改进常来自删除，不是添加', '对每个新增机制问一句：删掉它，哪条验收会挂', '答不出来的机制直接删', '先删最脏最笨最绕的那一版，再谈优化'],
  artifact: '更少的机制 + 每条机制存在的理由', anti: '当作“少写代码”的借口，把复杂度藏进别人的模块',
  mechanism: '自己走；说不清价值的机制，交给消融实验去证伪',
  draft: '用「奥卡姆剃刀」过一遍这个设计：先列出让我难受的三件事，再对每个新增机制问“删掉它哪条验收会挂”，答不出来的直接删。' },
{ id: 'unknowns', word: '列出所有不自信的点', family: 'core', src: '题图', route: 'self',
  when: '交付前，尤其是测试全绿、自己觉得稳的时候',
  steps: ['列出我不确定的部分', '每条写清它会怎么错', '每条给出我怎么知道有没有错（验证手段）', '把清单转成后续任务，而不是免责声明'],
  artifact: '不确定性清单，每条都带验证方式', anti: '写成“可能有问题”这类免责声明；没有验证方式的不确定性等于没写',
  mechanism: '自己走；与审查 findings 合并成同一张表',
  draft: '用「列出所有不自信的点」收尾：逐条写出我不确定什么、它会怎么错、我怎么验证——“全部通过”不等于没有风险。' },
{ id: 'independent-judgment', word: '保持独立思考', family: 'core', src: '题图', route: 'self',
  when: '要采纳别人（或上一个 Agent）的结论时',
  steps: ['先独立产出自己的结论，哪怕粗糙', '再看对方的方案', '最后才合并，并说清我改了哪条、被哪条证据说服'],
  artifact: '带归属的判断：哪是我的、哪是别人的', anti: '变成固执；判据是你能指出对方哪条证据改变了你',
  mechanism: '自己走；合并结论时把“被说服的点”写出来',
  draft: '用「保持独立思考」处理这个观点：先给出我自己的判断，再看对方的证据，最后说明哪一条证据改变了我的结论。' },
{ id: 'critical-thinking', word: '批判性思维', family: 'core', src: '题图 + 通识（波普尔）', route: 'self',
  when: '听到“架构升级”“智能化”“端到端优化”这类大词时',
  steps: ['追问：具体在哪个文件、哪一行', '改完哪个数字会变', '怎么测出来', '换一个解释是否同样成立', '问：什么观察能证明它错了——答不出来，这个说法就不承载信息'],
  artifact: '可验证的差异，而不是一个更大的说法', anti: '变成抬杠；批判的落点必须是可验证的差异',
  mechanism: '自己走；判据是这句话反过来写是否同样成立，成立就等于没信息量',
  draft: '用「批判性思维」看这个说法：它具体落在哪个文件哪一行、改完哪个数字会变、怎么测——反过来写也成立的话，它就没有信息量。' },
{ id: 'cohesion-coupling', word: '高内聚低耦合', family: 'core', src: '题图', route: 'self',
  when: '划模块边界、拆任务、做上下文分片时',
  steps: ['问：这个单元能不能独立说清它做什么', '跨边界只留显式接口', '一个任务只服务一个目标', '把“不用管的东西”移出上下文——上下文预算就是边界'],
  artifact: '边界清楚的单元，每个单元一句话能说清', anti: '为了分层而抽象，产出的接口比问题还多',
  mechanism: '自己走；拆任务时按同一把尺子切，别按文件切',
  draft: '用「高内聚低耦合」重切这个任务：让每个单元能独立说清它做什么，跨边界只留显式接口，把不用管的东西移出上下文。' },
{ id: 'inversion', word: '逆向思维', family: 'thinking', src: '通识（Munger／Jacobi）', route: 'self',
  when: '想不出好方案，或要评估一个已定方案的风险时',
  steps: ['反过来问：要保证这件事失败，我该做什么', '把这些失败因子列出来', '逐条设防，或直接避开'],
  artifact: '一份“避免清单”，而不只是“目标清单”', anti: '变成消极劝退；它是用来设防的，不是用来否定目标的',
  mechanism: '自己走；与事前验尸连用效果最好' },
{ id: 'second-order', word: '二阶思维', family: 'thinking', src: '通识', route: 'self',
  when: '一个决策看起来有明显收益、准备拍板时',
  steps: ['问“然后呢”', '再问一次“再然后呢”', '把二阶后果写下来，和一阶收益并列比较'],
  artifact: '一阶收益 vs 二阶后果的对照', anti: '无限推演导致瘫痪；只推到第二、三层就停',
  mechanism: '自己走；把二阶后果写成具体场景，不写“可能有影响”' },
{ id: 'five-whys', word: '五个为什么', family: 'thinking', src: '通识（丰田）', route: 'self',
  when: '出了问题、拿到一个“原因”就想收工时',
  steps: ['对现象问“为什么”', '拿答案再问一次，最多 5 轮', '问到“再问下去就是客观限制”为止', '在最后一层动手'],
  artifact: '一条从现象到根因的链条', anti: '每一层都归到“人的疏忽”；那样只能得出“要更小心”',
  mechanism: '自己走；根因要用消融实验验证，不能只靠说得通' },
{ id: 'mece', word: 'MECE', family: 'thinking', src: '通识（麦肯锡）', route: 'self',
  when: '拆解问题、列清单、划分类时',
  steps: ['检查每一项是否互斥（不重叠）', '检查合起来是否穷尽（无遗漏）', '缺的那一格往往就是盲区'],
  artifact: '一张不重不漏的结构', anti: '为了穷尽硬凑格子；穷尽不了就明确写“未知”',
  mechanism: '自己走；拆完回头检查一次重叠与遗漏' },
{ id: 'bayesian-update', word: '贝叶斯更新', family: 'thinking', src: '通识', route: 'self',
  when: '手上有新证据、要改判断时',
  steps: ['写下当前的先验判断', '写下新证据', '问：如果判断为真，这条证据出现的概率是多少', '更新结论，并记下什么证据会再次翻转它'],
  artifact: '一个带“什么能改变它”的结论', anti: '把先验当真理（无视证据），或把先验清零（被最新消息带走）',
  mechanism: '自己走；结论必须写出可翻转条件' },
{ id: 'chesterton-fence', word: '切斯特顿栅栏', family: 'thinking', src: '通识（Chesterton）', route: 'self',
  when: '看到一段“没用、丑陋、多余”的代码或流程，想删掉时',
  steps: ['先查清它为什么在那（git log、blame、注释、测试）', '说得出理由再动手', '说不出就先留着并标记'],
  artifact: '删除前的一条理由记录', anti: '变成“什么都不许删”；栅栏是用来理解的，不是供奉的',
  mechanism: '自己走；删改前用 git log/blame 找证据' },
{ id: 'circle-of-competence', word: '能力圈', family: 'thinking', src: '通识（Munger）', route: 'self',
  when: '要在一个自己说不清边界的领域下结论时',
  steps: ['划出“我能说清机制”的范围', '圈内给判断，圈外明说不知道', '圈外只做能验证的小实验'],
  artifact: '一份“我懂／我不懂”的分界', anti: '拿能力圈当挡箭牌拒绝学习；它管的是下结论，不是学不学',
  mechanism: '自己走；圈外的判断必须降级为假设' },
{ id: 'leverage-points', word: '杠杆点', family: 'thinking', src: '维基：Twelve leverage points', route: 'self',
  when: '想改进一个复杂系统（流程、团队、代码库）时',
  steps: ['按效力从低到高找位置：参数 → 缓冲 → 结构 → 延迟 → 反馈回路 → 信息流 → 规则 → 目标 → 范式', '多数人只调参数（改数字）', '往“信息流／规则／目标”那一端找'],
  artifact: '一个“改了它别处会跟着变”的位置', anti: '把调参数当成改进；改数字最省事也最没用',
  mechanism: '自己走；源自 Meadows 十二杠杆点' },
{ id: 'yagni', word: 'YAGNI', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '想为一个“以后可能会用到”的场景加抽象时',
  steps: ['问：现在哪个验收需要它', '答不出来就删', '等真需要时再加，那时能看清形态'],
  artifact: '更少的代码', anti: '用它拒绝合理的前置设计；判据是“当前有没有验收”',
  mechanism: '自己走' },
{ id: 'gall', word: '加尔定律', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '想推倒重写，或设计一个复杂系统时',
  steps: ['先让简单版本真正跑起来', '在跑得起来的系统上小步演化', '拒绝“一次设计到位”'],
  artifact: '一个先能工作、再变复杂的东西', anti: '变成“永远不许调整架构”；它反驳的是没跑起来的大设计',
  mechanism: '自己走' },
{ id: 'hyrum', word: '海勒姆定律', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '要改一个被外部依赖的行为，或想说“这只是内部实现”时',
  steps: ['列出所有可观察行为（输出格式、时序、错误文案、顺序）', '假设任何一条都会被依赖', '要改就显式版本化'],
  artifact: '一份“对外契约”清单', anti: '拿它当“什么都不能改”；它要求显式变更，不是禁止变更',
  mechanism: '自己走' },
{ id: 'postel', word: '稳健性原则', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '写接口输入输出、解析外部数据时',
  steps: ['自己发出的：严格、最小、可预测', '接收的：宽容但记录', '不要把宽容变成静默接受脏数据'],
  artifact: '一个有明确边界又不脆的接口', anti: '宽容被滥用成静默接受错误输入',
  mechanism: '自己走' },
{ id: 'least-astonishment', word: '最小惊讶原则', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '命名、默认行为、错误处理的设计时',
  steps: ['问：使用者会预期它做什么', '让默认行为符合直觉', '反直觉的地方必须显式且响亮'],
  artifact: '不用读文档就能猜对的行为', anti: '把“惯性”当成直觉；二者要分开',
  mechanism: '自己走' },
{ id: 'ssot', word: '单一事实来源', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '同一份数据或状态出现在两个地方时',
  steps: ['找出每个事实的唯一所有者', '其他位置只留引用或派生', '派生值必须能随时重建'],
  artifact: '一张“谁拥有哪个事实”的表', anti: '把缓存当成事实来源；缓存要能随时丢掉',
  mechanism: '自己走' },
{ id: 'tesler', word: '复杂度守恒定律', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '觉得“这个设计很简单”、想把复杂度藏起来时',
  steps: ['找出被藏起来的复杂度去了哪', '问它落在谁身上（使用者／调用方／维护者）', '把它放在可测、可定位的地方'],
  artifact: '一份“复杂度落点”的说明', anti: '当成“所以别简化”；守恒说的是不能凭空消失，不是不能变少',
  mechanism: '自己走' },
{ id: 'worse-is-better', word: '更差即更好', family: 'engineering', src: '维基：软件开发哲学清单', route: 'self',
  when: '在“完美但难交付”和“粗糙但能用”之间选时',
  steps: ['先交付能跑的最小版本', '用真实反馈决定下一步', '完美版本留到需求清楚之后'],
  artifact: '一个已经在用的东西', anti: '变成给低质量开脱；关键在“能用”',
  mechanism: '自己走' },
{ id: 'red-green-refactor', word: '红绿重构', family: 'verification', src: '通识（TDD）', route: 'external',
  when: '要改一段没有测试覆盖的行为时',
  steps: ['先写一个会失败的测试（红）', '用最小改动让它通过（绿）', '再重构，并保持绿'],
  artifact: '一个先失败后通过的测试 + 可安全重构的代码', anti: '先写实现再补测试；那样测的是实现而不是需求',
  mechanism: '真跑测试命令，不能只在脑子里演' },
{ id: 'ab-experiment', word: 'A/B 实验', family: 'verification', src: '通识', route: 'external',
  when: '要判断“这个改动到底有没有用”、或有两种做法时',
  steps: ['动手前就定好指标和成功阈值', '单变量、设对照组', '跑够样本再下结论'],
  artifact: '带对照组的对比数据', anti: '事后挑指标；先定指标才是这条的全部价值',
  mechanism: '真跑：同一输入两组对比' },
{ id: 'pre-mortem', word: '事前验尸', family: 'verification', src: '通识（Klein）', route: 'external',
  when: '方案或计划刚定、大家都觉得可行时',
  steps: ['假设“半年后它彻底失败了”', '每个人独立写出失败原因，先不讨论', '汇总后按可能性逐条设防'],
  artifact: '一份提前发现的失败清单', anti: '变成走过场的“风险讨论”；关键是假设它已经失败',
  mechanism: '换一个上下文做更好（用 subagent 独立写，再汇总）' },
{ id: 'blameless-postmortem', word: '无指责复盘', family: 'verification', src: '通识（SRE）', route: 'external',
  when: '事故或严重 bug 处理完之后',
  steps: ['只描述发生了什么、时间线、系统为什么允许它发生', '禁止写“谁疏忽了”', '产出可验证的行动项（带负责人和期限）', '跟进行动项直到关闭'],
  artifact: '一份只讲机制、带行动项的复盘', anti: '变成追责会；一旦指向人，信息就停止流动',
  mechanism: '真写文档；行动项必须带验证方式' },
{ id: 'mutation-testing', word: '变异测试', family: 'verification', src: '通识', route: 'external',
  when: '测试全绿，但你不知道这些测试到底有没有用',
  steps: ['故意把实现改坏一点点（改条件、删一行、换常量）', '跑测试', '如果还是全绿，说明这里没被测到', '补测试后恢复实现'],
  artifact: '一份“测试实际覆盖了什么”的证据', anti: '追求高分而堆测试；目的是找无效测试',
  mechanism: '真跑：改坏 → 跑 → 恢复' },
{ id: 'chaos-engineering', word: '混沌工程', family: 'verification', src: '通识', route: 'external',
  when: '系统“应该能扛住”某种故障，但从没验证过时',
  steps: ['先限定爆炸半径，确保可回滚', '主动注入故障（断网、超时、杀进程）', '观察是否按预期降级', '稳态假设被打破的地方就是缺陷'],
  artifact: '一份真实的降级行为记录', anti: '在生产上乱来；没有可控范围就不要注入',
  mechanism: '真注入；先限定范围' },
{ id: 'ooda', word: 'OODA 循环', family: 'process', src: '通识（Boyd）', route: 'self',
  when: '环境在快速变化、计划赶不上变化时',
  steps: ['观察：拿到新事实', '判断：更新模型', '决策', '行动，然后立刻回到观察'],
  artifact: '一轮比对手更快的完整循环', anti: '停在“判断”里反复分析；胜负在循环速度',
  mechanism: '自己走；每一步都要有新事实进来' },
{ id: 'pdca', word: 'PDCA 循环', family: 'process', src: '通识（戴明）', route: 'self',
  when: '要持续改进一件反复做的事时',
  steps: ['计划：改什么、怎么衡量', '执行', '检查：数据对比', '处理：固化或放弃，然后进入下一轮'],
  artifact: '一轮有数据的改进', anti: '只有 P 和 D，没有 C 和 A；那样只是重复劳动',
  mechanism: '自己走；每轮都要有数字' },
{ id: 'theory-of-constraints', word: '约束理论', family: 'process', src: '维基：Twelve leverage points（参见）', route: 'self',
  when: '想提升整体产出（速度、吞吐）时',
  steps: ['找出当前真正的瓶颈，通常只有一个', '让瓶颈不停工', '其他环节迁就瓶颈', '瓶颈解决后，重新找下一个'],
  artifact: '一个吞吐提升的实证', anti: '优化非瓶颈；局部优化反而拖慢整体',
  mechanism: '真测吞吐数字，不靠感觉' },
{ id: 'spike', word: '技术探针', family: 'process', src: '通识（XP）', route: 'external',
  when: '对某个技术方案“能不能行”没把握时',
  steps: ['设一个时间盒（例如半天）', '只回答那一个问题，不写生产代码', '写下结论：可行／不可行／代价多大', '探针代码可以丢弃'],
  artifact: '一个消除不确定性的结论', anti: '把探针做成半成品留在主干上',
  mechanism: '真跑一个小实验' },
{ id: 'adr', word: '架构决策记录', family: 'process', src: '通识', route: 'self',
  when: '做了一个以后会被问“为什么这么设计”的决定时',
  steps: ['记背景：当时的约束是什么', '记选项和各自的代价', '记决定', '记后果，以及什么条件下该重新考虑'],
  artifact: '一份可追溯的决策记录', anti: '事后补写美化；价值在于记录当时的真实约束',
  mechanism: '写进文件或文档，别只留在脑子里' },
{ id: 'conway', word: '康威定律', family: 'team', src: '维基：软件开发哲学清单', route: 'self',
  when: '设计系统结构，或发现模块边界很别扭时',
  steps: ['先看协作结构（谁和谁沟通、谁向谁汇报）', '系统结构会复制它', '想要不同的架构，就先调整协作方式'],
  artifact: '一份“协作结构 → 架构”的对应', anti: '只改架构图不改协作；那样会反弹',
  mechanism: '自己走；对多 Agent 团队同样成立' }
];
const CORE_COUNT = TABLE.filter((t) => t.family === 'core').length;
const GEN_COUNT = TABLE.length - CORE_COUNT;
const PIPELINE = ['first-principles', 'cohesion-coupling', 'ablation', 'adversarial-review', 'occam', 'unknowns'];
const PHASES = [
  { phase: 'design', keys: ['设计', '方案', '选型', '架构', '怎么做', '重构', '优化', '规划'], ids: ['first-principles', 'cohesion-coupling', 'occam'] },
  { phase: 'deliver', keys: ['交付', '完成', '做完了', '全绿', '测试通过', '发布', '收尾', '上线', '提交'], ids: ['adversarial-review', 'ablation', 'occam', 'unknowns'] },
  { phase: 'debug', keys: ['为什么', '报错', '失败', '根因', '排查', 'bug', '不对', '坏了'], ids: ['first-principles', 'five-whys', 'critical-thinking', 'independent-judgment'] },
  { phase: 'implement', keys: ['实现', '改写', '迁移', '开发', '加一个', '接上'], ids: ['cohesion-coupling', 'ablation', 'red-green-refactor'] }
];
// Retrieval aliases: the colloquial / synonym phrasings a person actually uses,
// kept next to the data they describe. Literal bigrams over `when` alone have no
// generalisation — "线上崩了要写复盘" matched nothing until 复盘/崩了/事故 were
// listed here. This is the one place to extend when a real phrasing misses.
const ALIASES = {
  'adversarial-review': '上线 发布 提交 交付 完成 验收',
  'ablation': '删掉 去掉 没用 感觉有用 多余 简化',
  'red-green-refactor': '测试挂了 挂了一片 没测 加测试 补测试 测试失败',
  'blameless-postmortem': '复盘 事故 崩了 挂了 线上 故障 出事',
  'chesterton-fence': '没人敢动 不敢动 想删掉 看不懂',
  'pre-mortem': '准备开工 要开工 开始做 准备动手',
  'chaos-engineering': '扛不住 断网 挂掉 故障演练',
  'theory-of-constraints': '太慢 瓶颈 提不动 卡住',
  'unknowns': '交付 收尾 风险',
  'yagni': '以后可能用到 提前设计 预留'
};
function aliasOf(id) {
  return ALIASES[id] === undefined ? '' : ALIASES[id];
}
const FAMILY_IDS = FAMILIES.map((f) => f.id).join('／');
// The always-on map is DATA, not prose. Hardcoding entry names into the prompt
// text made the section a second place to maintain: rename an entry and the
// prompt goes stale silently — the very coupling this plugin preaches. Each
// situation names entry IDs; names are looked up, and an unknown id is skipped
// the same way routeText skips one.
const SITUATIONS = [
  { when: '要交付 / 说“完成”了', ids: ['adversarial-review', 'ablation', 'unknowns'], note: '前者要另开上下文；后者要先基线、再删一个组件真跑' },
  { when: '方案刚定、都觉得可行', ids: ['pre-mortem'] },
  { when: '出问题 / 找根因', ids: ['first-principles', 'five-whys', 'critical-thinking'] },
  { when: '要改没有测试覆盖的代码', ids: ['red-green-refactor'] },
  { when: '想为“以后可能用到”加东西', ids: ['yagni', 'chesterton-fence'] },
  { when: '要动手做 / 划边界', ids: ['first-principles', 'cohesion-coupling', 'occam'] },
  { when: '听到大词 / 漂亮解释', ids: ['critical-thinking'] },
  { when: '要采纳别人的结论', ids: ['independent-judgment'] }
];
const HARD_GATES = ['adversarial-review', 'ablation'];
function wordOf(id) {
  const t = TABLE.find((x) => x.id === id);
  return t === undefined ? '' : t.word;
}
const SITUATION_LINES = SITUATIONS.map((s) => {
  const words = s.ids.map(wordOf).filter((w) => w !== '');
  if (words.length === 0) return '';
  return '· ' + s.when + ' → ' + words.join(' + ') + (s.note === undefined ? '' : '（' + s.note + '）');
}).filter((x) => x !== '').join('\n');
const HARD_LINE = '交付前' + HARD_GATES.map(wordOf).filter((w) => w !== '').join(' / ') + '没做，就明说“没做”。';
const SECTION_TEXT = '方法论闸门（由 dsh-methodology-gates 插件注入）：按情境启用——说出词即启用，流程已在你能力里。\n开工前先调 methodology action=route（task=你当前要做的事），按情境从 ' + TABLE.length + ' 条里取相关闸门；某条不确定怎么用就 action=show。\n' + SITUATION_LINES + '\n' + HARD_LINE + '全目录：action=list。';
const TOOL_DESC = '方法论闸门：按情境取用 ' + TABLE.length + ' 条方法论。action=route 用 task（一句话说你当前要做的事）按情境取相关闸门并标出命中词；action=list 看目录（可配 family）；action=show 用 word 取某一条完整用法（什么时候用／动作／产出物／误用／执行机构／来源）。8 个核心触发词已在系统提示的“方法论闸门”段逐字列出，此处不重复（重复会每步重复计费）。注意：对抗式审查必须另开一个没参与实现的上下文，消融实验必须先有基线再删一个组件真跑一遍——这两条不能只在脑子里做。';

function famLabel(id) {
  const f = FAMILIES.find((x) => x.id === id);
  return f === undefined ? id : f.label;
}
function resolveFamily(input) {
  if (input === undefined || input === null) return undefined;
  const raw = String(input).trim();
  if (raw === '' || raw.toLowerCase() === 'all') return undefined;
  const low = raw.toLowerCase();
  const hit = FAMILIES.find((f) => f.id === low)
    || FAMILIES.find((f) => f.label === raw)
    || (raw.length >= 2 ? FAMILIES.find((f) => f.label.indexOf(raw) >= 0) : undefined);
  return hit === undefined ? null : hit;
}
function draftOf(t) {
  return t.draft === undefined ? '用「' + t.word + '」审视当前工作：' + t.steps.slice(0, 2).join('；') + '。' : t.draft;
}
function find(input) {
  const raw = input === undefined || input === null ? '' : String(input).trim();
  if (raw === '') return { hit: undefined, loose: false, others: [] };
  const q = raw.toLowerCase();
  const exact = TABLE.find((t) => t.id === q) || TABLE.find((t) => t.word === raw);
  if (exact !== undefined) return { hit: exact, loose: false, others: [] };
  // A substring hit is NOT an exact hit: “思维” matches 批判性思维, 逆向思维 and
  // 二阶思维. Returning the first one silently made the answer depend on table
  // order. Only a unique substring hit may pass as exact; several must announce
  // themselves and list the alternatives.
  const subHits = TABLE.filter((t) => t.word.indexOf(raw) >= 0);
  const idHits = q.length >= 3 ? TABLE.filter((t) => t.id.indexOf(q) >= 0) : [];
  const near = subHits.length > 0 ? subHits : idHits;
  if (near.length === 1) return { hit: near[0], loose: false, others: [] };
  if (near.length > 1) return { hit: near[0], loose: true, others: near.slice(1).map((t) => t.word) };
  if (raw.length >= 2) {
    const loose = TABLE.filter((t) => t.when.indexOf(raw) >= 0);
    if (loose.length > 0) return { hit: loose[0], loose: true, others: loose.slice(1).map((t) => t.word) };
  }
  return { hit: undefined, loose: false, others: [] };
}
function brief(t, loose, others) {
  const head = loose
    ? '⚠ 没有精确匹配，下面是模糊匹配到的条目'
      + (others.length > 0 ? '（同样匹配的还有：' + others.join('／') + '，要哪条请写全名）' : '') + '：\n'
    : '';
  return head + '【' + t.word + '】' + famLabel(t.family) + ' · '
    + (t.route === 'external' ? '必须换上下文或真跑' : '自查即可')
    + '\n什么时候用：' + t.when
    + '\n动作：' + t.steps.map((s, i) => '\n  ' + (i + 1) + ') ' + s).join('')
    + '\n产出物：' + t.artifact
    + '\n判据／误用：' + t.anti
    + '\n执行机构：' + t.mechanism
    + '\n来源：' + t.src
    + '\n可直接发出的指令：' + draftOf(t);
}
function notFound(raw) {
  return '没有匹配到「' + String(raw) + '」。可用：\n· 中文词或 ascii id（如 “对抗式审查” 或 ablation）\n· 族名或族 id：'
    + FAMILIES.map((f) => f.label + '＝' + f.id).join('／')
    + '\n· 全部词：' + TABLE.map((x) => x.word).join('／');
}
function catalog(family) {
  const fam = resolveFamily(family);
  if (fam === null) {
    return '没有名为「' + String(family) + '」的族。可用 family（也接受中文族名）：'
      + FAMILIES.map((f) => f.id + '＝' + f.label).join('／') + '；省略或 all = 全部。';
  }
  const groups = fam === undefined ? FAMILIES : [fam];
  const rows = fam === undefined ? TABLE : TABLE.filter((t) => t.family === fam.id);
  const out = [];
  groups.forEach((f) => {
    const rs = rows.filter((t) => t.family === f.id);
    if (rs.length === 0) return;
    out.push('── ' + f.label + '（' + rs.length + '）');
    rs.forEach((t, i) => {
      out.push('  ' + (i + 1) + '. ' + t.word + (t.route === 'external' ? '［外部机构］' : '［自查］') + ' — ' + t.when);
    });
  });
  const head = fam === undefined
    ? '方法论目录：共 ' + TABLE.length + ' 条（核心 ' + CORE_COUNT + ' 条常驻，其余 ' + GEN_COUNT + ' 条按需查）'
    : '方法论目录 · ' + fam.label + '：本族 ' + rows.length + ' 条（全局共 ' + TABLE.length + ' 条）';
  const tail = fam === undefined
    ? '\n\n用 action=show + word 看某一条的完整用法；family 可用 ' + FAMILY_IDS + '（也接受中文族名）。\n核心流水线顺序：' + PIPELINE.map(wordOf).filter((w) => w !== '').join(' → ') + '。'
    : '\n\n看全部：action=list 不带 family（或 family=all）。';
  return TAG + head + '\n' + out.join('\n') + tail;
}
// Collect EVERY matching phase instead of returning the first one. First-match
// return let a design word hijack a task that also says “上线”, silently dropping
// the delivery gates — the task then looked gated while skipping adversarial
// review and ablation entirely. Priority decides which phase leads; the other
// matching phases' gates are merged in rather than discarded.
const PHASE_PRIORITY = ['deliver', 'debug', 'design', 'implement'];
function phasesOf(task) {
  const s = String(task === undefined || task === null ? '' : task);
  const hits = [];
  for (let i = 0; i < PHASES.length; i += 1) {
    const p = PHASES[i];
    for (let k = 0; k < p.keys.length; k += 1) {
      if (s.indexOf(p.keys[k]) >= 0) { hits.push(p); break; }
    }
  }
  return hits.sort((a, b) => PHASE_PRIORITY.indexOf(a.phase) - PHASE_PRIORITY.indexOf(b.phase));
}
// Retrieval index: each entry's own `when` IS its retrieval key, so adding an
// entry makes it retrievable with no second place to maintain (single source of
// truth). Scoring is literal character-bigram overlap — no tokenizer, no
// embeddings, no classifier: 36 static rows do not need them (Occam's razor).
// Every hit is printed, so a wrong pick is visible instead of silent.
const GRAM_STOP = ['的时', '时候', '一个', '什么', '这个', '那个', '可以', '需要', '不是', '没有', '就是', '以及', '或者', '进行', '自己', '别人'];
function bigrams(text) {
  const t = String(text).replace(/[\s，。；：、（）()「」“”"'·—…!?！？,.;:0-9]/g, '');
  const out = [];
  for (let i = 0; i + 1 < t.length; i += 1) {
    const g = t.slice(i, i + 2);
    if (GRAM_STOP.indexOf(g) === -1) out.push(g);
  }
  return out;
}
function routeText(task) {
  const raw = String(task === undefined || task === null ? '' : task).trim();
  if (raw === '') {
    return TAG + 'route 需要 task：一句话描述你当前要做的事（例如“改一段没有测试的代码”“重构并上线”），我按情境从 ' + TABLE.length + ' 条里取相关的几条。';
  }
  const phases = phasesOf(raw);
  const phaseRows = [];
  for (const p of phases) {
    for (const id of p.ids) {
      const t = TABLE.find((x) => x.id === id);
      if (t !== undefined && phaseRows.indexOf(t) === -1) phaseRows.push(t);
    }
  }
  const taskGrams = bigrams(raw);
  const hitRows = TABLE.map((t) => {
    const hits = [];
    for (const g of bigrams(t.when + ' ' + aliasOf(t.id))) {
      if (taskGrams.indexOf(g) !== -1 && hits.indexOf(g) === -1) hits.push(g);
    }
    return { t, hits };
  }).filter((r) => r.hits.length > 0).sort((a, b) => b.hits.length - a.hits.length);
  const extra = hitRows.filter((r) => phaseRows.indexOf(r.t) === -1).slice(0, 5);

  if (phaseRows.length === 0 && extra.length === 0) {
    // No generic pipeline here on purpose: handing a debugging task the heavy
    // delivery gates (ablation + adversarial review) is worse than saying so.
    return TAG + '未命中：没有条目的“什么时候用”与你的描述重合，也没识别出阶段。\n'
      + '不要硬套，二选一：\n'
      + '· 把 task 写成你实际会说的话，带上关键名词（如“测试”“事故”“缓存”“重写”“上线”）\n'
      + '· action=list 看全 ' + TABLE.length + ' 条，或 action=show <词> 直接取';
  }

  const one = (t, why, n) => n + '. ' + t.word + '（' + famLabel(t.family) + '）' + (why === '' ? '' : ' · ' + why)
    + '\n   什么时候用：' + t.when
    + '\n   动作：' + t.steps.join('；')
    + '\n   产出物：' + t.artifact
    + (t.route === 'external' ? '\n   ⚠ 必须换上下文或真跑：' + t.mechanism : '');

  const parts = [];
  if (phases.length === 0) parts.push('未识别出阶段。');
  else if (phases.length === 1) parts.push('阶段 = ' + phases[0].phase + '。');
  else parts.push('阶段 = ' + phases[0].phase + '（还命中 ' + phases.slice(1).map((x) => x.phase).join('、') + '，其闸门已并入下面）。');
  if (phaseRows.length > 0) {
    parts.push('【阶段闸门】');
    phaseRows.forEach((t, i) => parts.push(one(t, '', i + 1)));
  }
  if (extra.length > 0) {
    parts.push('【情境命中】' + (phaseRows.length > 0 ? '（按命中词数排序，已排除上面的阶段闸门）' : ''));
    extra.forEach((r, i) => parts.push(one(r.t, '命中：' + r.hits.join('、'), i + 1)));
  }
  parts.push('命中词已标出；都不对就用 action=show <词> 精确取，或把 task 写具体些。');
  parts.push('外部机构那几条没做就明说没做，不要默认通过。');
  return TAG + parts.join('\n');
}

/**
 * Register the prompt section, the model tool, and the human command into the
 * mounting context's layer.
 * @param ctx - the mounting context.
 */
function apply(ctx) {
  const systemPrompt = ctx.get('systemPrompt');
  if (systemPrompt !== undefined) {
    ctx.effect(() => systemPrompt.section({
      name: 'methodology-gates:triggers',
      order: 250,
      text: SECTION_TEXT
    }));
  }
  const tools = ctx.get('tools');
  if (tools === undefined) {
    console.error('[methodology-gates] tools registry unavailable at apply time; the `methodology` tool was NOT registered');
  } else {
    try {
      ctx.effect(() => tools.register(defineTool({
        name: 'methodology',
        description: TOOL_DESC,
        parameters: {
          action: { type: 'string', required: true, enum: ['list', 'show', 'route'], description: 'list 列目录（可配 family）；show 看一条；route 让任务决定顺序。' },
          word: { type: 'string', description: 'action=show 时的词（中文词或 ascii id，如 “对抗式审查” 或 ablation）。' },
          family: { type: 'string', description: 'action=list 时的族过滤：' + FAMILY_IDS + '（也接受中文族名）；省略或 all 为全部。' },
          task: { type: 'string', description: 'action=route 时的当前任务或产物描述，用来判断处于设计／实现／排查／交付哪个阶段。' }
        },
        output: {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: { text: { type: 'string', required: true } }
          },
          render: (_args, value) => [{ type: 'text', text: value && value.text ? value.text : String(value) }]
        },
        async execute(args) {
          const a = args === undefined || args === null ? {} : args;
          const action = a.action === undefined || a.action === null ? 'list' : String(a.action);
          if (action === 'show') {
            if (a.word === undefined || a.word === null || String(a.word).trim() === '') {
              return { text: 'action=show 需要 word：给中文词（如 “对抗式审查”）或 ascii id（如 ablation）。\n· 看全部：action=list\n· 让任务决定顺序：action=route + task' };
            }
            const r = find(a.word);
            return r.hit === undefined
              ? { text: notFound(a.word) }
              : { text: brief(r.hit, r.loose, r.others) };
          }
          if (action === 'route') return { text: routeText(a.task) };
          return { text: catalog(a.family) };
        }
      })), 'methodology-gates.tool()');
    } catch (error) {
      console.error('[methodology-gates] tool registration FAILED:', error && error.message ? error.message : String(error));
    }
  }
  const commands = ctx.get('commands');
  if (commands === undefined) {
    console.error('[methodology-gates] commands registry unavailable at apply time; /methodology was NOT registered');
  } else {
    try {
      ctx.effect(() => commands.register({
        name: 'methodology',
        description: '用方法论闸门审视当前工作（共 ' + TABLE.length + ' 条，六族）',
        input: { hint: '留空=列目录；可写 “对抗式审查”、ascii id（如 ablation），或族名（thinking／工程与设计）' },
        handler: (inv) => {
          const raw = inv && inv.rawInput ? String(inv.rawInput).trim() : '';
          if (raw === '') return { kind: 'success', text: catalog(undefined) };
          const fam = resolveFamily(raw);
          if (fam !== undefined && fam !== null) return { kind: 'success', text: catalog(fam.id) };
          const r = find(raw);
          return { kind: 'success', text: r.hit === undefined ? notFound(raw) : brief(r.hit, r.loose, r.others) };
        }
      }), 'methodology-gates.command()');
    } catch (error) {
      console.error('[methodology-gates] command registration FAILED:', error && error.message ? error.message : String(error));
    }
  }
}

export { apply, inject, name };

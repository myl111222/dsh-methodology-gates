# dsh-methodology-gates

Methodology gates for [DeepSeek Harness](https://github.com/deepseek-ai) — turn eight well-known agent-work trigger words into executable gates, backed by a 36-entry on-demand catalog.

**中文简介**：把 8 个"一句顶一万句"的方法论触发词接进 DSH：常驻词表 + 可召唤工具 + 斜杠命令 + 36 条六族目录。

## What it delivers

| Capability | What it is |
|---|---|
| **Always-on prompt section** | The 8 agent-work trigger words, plus the two rules that must NOT stay inside one context |
| **`methodology` model tool** | `action=list` (catalog, filterable by family) · `action=show` (one entry's full usage) · `action=route` (task → which gates, in what order) |
| **`/methodology` human command** | Same catalog from the composer; the result lands in the session log, so the model reads it on the next turn |

The eight always-on words:

> 第一性原理 · 对抗式审查 · 消融实验 · 奥卡姆剃刀 · 列出所有不自信的点 · 保持独立思考 · 批判性思维 · 高内聚低耦合

Two of them cannot be done inside your own head, and the plugin says so out loud:

- **对抗式审查 (adversarial review)** must open a context that did **not** implement the thing;
- **消融实验 (ablation)** needs a baseline and a real re-run after deleting one component.

If those two were not done, the plugin's rule is to **say "没做" rather than pass by default**.

## Install

```sh
# from this repository (local path or packed tarball)
pnpm pack
dsh plugin --profile <profile> add ./dsh-methodology-gates-0.1.0.tgz

# then restart the profile so the host composes the bundle
```

The bundle patch (`cordis.patch.yml`) inserts one row:

```yaml
- insert:
    - id: methodology-gates
      name: dsh-methodology-gates
```

The package publishes no service, so the row needs no `isolate` realm.

## The catalog

36 entries in six families. The first eight are the always-on gates; the rest are **not** injected and cost nothing until you ask for them.

| Family | Count | Examples |
|---|---|---|
| Agent 工作闸门 | 8 | 第一性原理 · 对抗式审查 · 消融实验 · 奥卡姆剃刀 · 列出所有不自信的点 · 保持独立思考 · 批判性思维 · 高内聚低耦合 |
| 思考与决策 | 8 | 逆向思维 · 二阶思维 · 五个为什么 · MECE · 贝叶斯更新 · 切斯特顿栅栏 · 能力圈 · 杠杆点 |
| 工程与设计 | 8 | YAGNI · 加尔定律 · 海勒姆定律 · 稳健性原则 · 最小惊讶原则 · 单一事实来源 · 复杂度守恒定律 · 更差即更好 |
| 验证与质量 | 6 | 红绿重构 · A/B 实验 · 事前验尸 · 无指责复盘 · 变异测试 · 混沌工程 |
| 流程与交付 | 5 | OODA 循环 · PDCA 循环 · 约束理论 · 技术探针 · 架构决策记录 |
| 协作与组织 | 1 | 康威定律 |

Each entry carries: when to use it · the steps · the artifact it must produce · its misuse mode · **which mechanism actually executes it** (`self` = a thinking step; `external` = a separate context or a real re-run) · its source.

## Design notes

- **Always-on cost is bounded and constant.** Only the 8 trigger words are injected; the other 28 live in the catalog. Every count in the injected text and tool description is *computed from the table*, so adding entries cannot desynchronise them.
- **`route` is a phase machine.** It reads the task text and returns the gates for `design` / `implement` / `debug` / `deliver`, defaulting to the full pipeline.
- **Fuzzy matches announce themselves.** A lookup that only matched a `when` clause says so and lists the other candidates, instead of quietly returning whichever row happens to come first.
- **No client half, by design.** A browser card wall would have to duplicate the 36-entry table or invent a transport; the three host capabilities are what the gates actually run on.

## Provenance

Sources are recorded per entry and shown by `action=show`:

- `题图` — the eight words come from a conference slide deck (10/23) on agent methodologies;
- `维基：软件开发哲学清单` — [List of software development philosophies](https://en.wikipedia.org/wiki/List_of_software_development_philosophies);
- `维基：Twelve leverage points` — [Twelve leverage points](https://en.wikipedia.org/wiki/Twelve_leverage_points);
- `通识（作者）` — general knowledge, with the usual attribution (Munger, Popper, Taleb, Klein, Boyd, Deming, Meadows, …).

Merged entries keep their provenance in the `src` field, so nothing is silently dropped when two entries are folded together.

## How this was verified

Nothing here is asserted because it looked right. In the order it happened:

| Step | Method | Result |
|---|---|---|
| Unit / retrieval | `node test/smoke.mjs` — 39 assertions over lookup, family resolution, situation routing and the generated prompt section | 39 passed, 0 failed |
| **Mutation testing** | 14 deliberate breakages of `lib/index.js`, each one a real past regression (the first-match phase bug, the alias table, the version tag, the `inject` list, the generated section, …), re-run against the suite | **14 killed, 0 survived** — i.e. the suite is able to fail |
| Adversarial review | A separate context that did not implement it, given only the contract, acceptance criteria and the artifact, required to attach `file:line` evidence | Two rounds, 9 findings, all closed and turned into regression cases |
| Live self-check | Every `route` / `list` answer begins with `[mth@<version>]`, so “which build answered me” is never inferred | `[mth@0.1.6]` while the installed version is `0.1.6` |

Run the suite against any build with `MTHD_BASE`:

```sh
MTHD_BASE=file:///path/to/dsh-methodology-gates/lib/index.js node test/smoke.mjs
```

The default points at a Windows profile install, because the module needs `@deepseek-ai/dsh-tools` resolvable — which is why it is tested where it is installed rather than from the source directory.

### The one thing that is NOT verified

The always-on section costs **694 characters (~511 tokens) on every step of every session**, and there is **no evidence yet that it changes behaviour**: self-initiated use of the tool measured ≈ 0 (39 calls, all of them a verification run).

The cost is measured. The benefit is not.

So the decision rule is written down **before** the data arrives, so that it cannot be rationalised afterwards:

> One week after the 0.1.6 install, run the usage meter over the newest session logs. If `methodology` is still called ≈ 0 times in real work, **delete the always-on section** (keep the tool and the command) and re-measure.

An ablation whose outcome is decided after seeing the numbers is not an ablation.

## License

MIT

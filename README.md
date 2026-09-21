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

- **All 36 are equal; the scenario decides.** The always-on section names **no** methodology — a privileged subset would be a ranking the data does not support. What stays resident is the *selection mechanism* (the trigger that makes the choice happen) plus the one rule that cannot be satisfied by thinking. Measured cost: **501 characters (~366 tokens) per step per session**, against 694 (~511) for the earlier 13-name map and ~1943 (~1473) if all 36 were injected.
- **`route` selects by situation, not by rank.** It matches the task against every entry's own `when` (plus an alias list for colloquial phrasings), reports the matched terms, and separates *phase gates* from *wording hits*. Phase detection collects **every** matching phase rather than the first one, so a task that says both “重构” and “上线” cannot lose its delivery gates.
- **Fuzzy matches announce themselves.** A lookup that only matched a `when` clause, or a substring that matches several entries, says so and lists the alternatives, instead of quietly returning whichever row happens to come first.
- **The two hard gates are a rule, not a ranking.** 对抗式审查 needs a context that did not implement; 消融实验 needs a baseline and a real re-run. Those two cannot be done inside one head, so the section names them — and only them.
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
| Live self-check | Every `route` / `list` answer begins with `[mth@<version>]`, so “which build answered me” is never inferred | `[mth@0.2.0]` while the installed version is `0.2.0` |

Run the suite against any build with `MTHD_BASE`:

```sh
MTHD_BASE=file:///path/to/dsh-methodology-gates/lib/index.js node test/smoke.mjs
```

The default points at a Windows profile install, because the module needs `@deepseek-ai/dsh-tools` resolvable — which is why it is tested where it is installed rather than from the source directory.

### The one thing that is NOT verified

The always-on section costs **501 characters (~366 tokens) on every step of every session**, and there is **no evidence yet that it changes behaviour**: self-initiated use of the tool measured ≈ 0 (39 calls, all of them a verification run).

The cost is measured. The benefit is not.

So the comparison and its decision rule are written down **before** the data arrives, so that they cannot be rationalised afterwards:

| Variant | Always-on content | Cost | Status |
|---|---|---|---|
| **A** | a 13-name situation map (8 from the slide deck + 5 pointers) | 694 chars (~511 tok) | retired — see below |
| **B** | **zero names**: the selection mechanism + the two hard gates | **501 chars (~366 tok)** | current (0.2.0) |
| **C** | B's text plus a session-event hook that injects the gates by itself | ~501 chars + hook | not built |

A was retired on a *measured* saving, not on a taste: the 13-name map's membership came from a slide deck rather than from evidence, while its cost was real and its benefit unmeasured. B is strictly cheaper and strictly more neutral.

> One week after the 0.2.0 install, run the usage meter over the newest session logs.
> **B ≥ A** → keep B (cheaper and more neutral — it wins either way).
> **B < A** → concrete situation hooks trigger behaviour better than an abstract instruction, so build **C** (make the trigger a mechanism, not a sentence).
> **Both ≈ 0** → the prompt layer cannot move behaviour at all; go to C or drop the always-on section entirely.

An ablation whose outcome is decided after seeing the numbers is not an ablation.

## License

MIT

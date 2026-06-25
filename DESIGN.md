# StarCore MedLink — 系统设计文档

> 最后更新：2026-06-25
> 状态：Phase 0 基础设施改造已完成。Phase 1 知识检索扩展待开始。

---

## 1. 产品画像

### 一句话定位

个人健康 AI 伙伴 —— 记住用户完整健康历史，在任何医学咨询场景下提供"结合个人情况"的个性化回答。

### 用户与系统的关系：知情伙伴

不是医生，不是搜索引擎，是"住在家里的那个医学院毕业的朋友"——知道你的病史，能看懂检验报告，会提醒你吃药，该去医院时会坚持让你去。

### 与通用 AI Chatbot 的差异

通用 AI（豆包、DeepSeek）给所有人的医学回答都一样。本系统的核心差异是 **个性化层**：

| | 通用 AI Chatbot | 本系统 |
|---|---|---|
| "头痛怎么办" | "多休息，多喝水" | "你正在服用阿司匹林，头痛可能是副作用之一。你上周记录的血压是 145/90..." |
| 上传皮肤照片 | 不支持或通用描述 | 专用分割模型 + 结合过敏史分析 |
| "这个药能吃吗" | 通用禁忌说明 | 对照当前用药清单，检查相互作用 |
| 记忆 | 单次对话后遗忘 | 永久记录，趋势追踪 |

### 目标用户画像

受教育程度较高的普通人群，关注自身健康，习惯使用 AI 工具获取信息，希望获得有据可查的健康建议而非泛泛而谈。

---

## 2. 系统三大记忆层

### 第一层：个人记忆（你的身体数据）

```
健康档案：年龄、性别、身高体重、慢病、过敏史
历史日志：血压、血糖、体重、用药记录、症状日记
医疗记录：检验报告、影像检查、就诊记录
日常行为：睡眠、运动、饮食（如有接入）
```

**所有 AI 回答的基础不是通用知识，而是这层个人记忆。**

### 第二层：医学记忆（人类的医学知识）

```
RAG 文献库：教科书、临床指南、论文
实时搜索：最新研究、疫情动态、药品说明书
影像模型：MRI / X 光 / 皮肤病变的检测和分割
```

**让系统说的每句话有据可查。对教育程度高的用户，"为什么"比"是什么"更重要。**

### 第三层：系统记忆（功能元认知）

```
功能说明、操作指南、隐私政策、技术局限
用户操作历史
```

**管家知道自己能做什么、不能做什么、用户用过什么。**

---

## 3. AI 管家（核心决策中枢）

### 定位

AI 管家不是某个 UI 组件，而是系统的决策中枢。同一套智能层，在不同界面有不同交互深度：

```
                    ┌──────────────────┐
                    │   AI 管家（脑）    │
                    │  - 意图识别       │
                    │  - 个人记忆检索   │
                    │  - 能力路由       │
                    │  - 回复包装       │
                    │  - 主动提醒       │
                    └──────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       Dashboard       ChatPage        未来入口
      管家（快答）    管家（深聊）    （通知/Widget）
```

| | Dashboard 管家 | ChatPage 对话 |
|---|---|---|
| 交互形式 | 卡片 + 简短对话 | 沉浸式聊天 |
| 适合场景 | 快问快答、系统导航 | 深度健康咨询、影像追问 |
| 回答深度 | 结论先行，点到为止 | 展开论证，附来源 |
| 隐喻 | 走廊里碰到，打个招呼 | 坐下来，认真聊 |

### 管家的三个角色

**角色 1：健康提醒者（主动推送）**

```
数据来源：health_logs + health_profiles
触发机制：后台定时任务 + 规则引擎
表现：
  - "你今天还没记录血压，上次测量是 3 天前"
  - "阿司匹林的库存按剂量应该快用完了，需要提醒复诊吗？"
  - "本周血压有 3 次超过 140，建议咨询医生"
```

**角色 2：系统导航者（引导用户）**

```
数据来源：系统功能元数据 + 用户使用历史
触发机制：用户提问
表现：
  - "影像分析怎么用？" → 简要步骤说明
  - "我的数据安全吗？" → 隐私保护说明
  - "怎么看历史趋势？" → 操作指引
```

**角色 3：健康咨询入口（委托下游 Agent）**

```
数据来源：PatientContext 按需检索
触发机制：用户提出医学问题
表现：
  - 管家自己不回答复杂医学问题
  - 补全相关健康事实 → 路由到正确 Agent → 用对话口吻包装返回
```

### Dashboard 与 ChatPage 同源

- 共用同一个 `thread_id`（即 session_id）
- 共用同一套 LangGraph checkpoint
- Dashboard 调 `/chat`，ChatPage 调 `/chat/stream`
- 从 Dashboard 点"深入讨论"跳转 ChatPage 时，对话历史无缝衔接

---

## 4. PatientContext：按需检索，而非始终注入

### 核心原则

豆包的做法：个人健康数据当作私有 RAG 知识库，按需检索，而非无脑注入。

| | 始终注入 | 按需检索（采纳方案） |
|---|---|---|
| 用户问"今天天气怎么样" | 硬塞一句"该用户有高血压病史" | 不触发健康记忆，正常回答 |
| 用户问"最近头痛" | 注入全部病史 | 检索到"高血压 + 血压近期波动"并注入 |
| 用户闲聊 | 每次都带病史，累赘且违和 | 不相关则不触发 |

### 技术方案

1. 将 `health_profiles` 和 `health_logs` 中的每条信息拆成可检索的 fact chunks
2. 每条 fact 生成 embedding，存入独立 Qdrant collection `personal_health_facts`
3. 用户 query 来 → `recognize_intent` 判断是否涉及健康讨论 → 是则并行检索两个 collection，各取 top-k → 合并进入 prompt
4. 与医学文献 RAG 使用同一套检索/重排机制，只区分 collection

**示例 fact chunks**：
```
"用户患有 2 型糖尿病，确诊于 2020 年"
"用户每日服用盐酸二甲双胍 500mg，早晚各一次"
"用户对青霉素过敏"
"用户最近一次糖化血红蛋白为 7.2%，测量于 2024-06-15"
```

### 实现策略

**Phase 0 直接落地按需检索方案**，不做"先全量注入再改造"的中间态。

- `health_db.py`：PHR 存储层，保留。新增写入后触发 fact 重新索引的钩子
- `health_db.build_health_context()`：重构为 fact chunk 生成器——遍历 profile + logs，输出 `List[str]` 供 fact_indexer 消费。不再直接用于 prompt 拼接
- 新建 `agents/fact_indexer.py`：接收 health_db 的 fact chunks → embedding → 写入 Qdrant `personal_health_facts` collection
- 新建 `agents/agent_decision.py:enrich_context` 节点：意图判断（Phase 0 用关键词规则，Phase 2 升级为 LLM）→ 并行检索 `personal_health_facts` + `medical_assistance_rag` → 合并 → 重排 → 附到 state
- `rag_agent/vectorstore_qdrant.py`：新增 collection 参数，支持在 `personal_health_facts` 和 `medical_assistance_rag` 间切换
- `rag_agent/reranker.py`：两类来源的检索结果统一重排

---

## 5. Agent 编排架构（修正后）

### 完整流程图

```
Entry
  │
  ▼
analyze_input          ← 安全检查（改为规则引擎为主，减少 LLM 调用）
  │
  ▼
recognize_intent       ← [NEW] 意图分类
  │                      健康咨询 / 影像理解 / 系统帮助 / 闲聊
  │
  ▼
enrich_context         ← [NEW] 按意图类型检索上下文
  │                      健康咨询 → 检索 personal_health_facts
  │                      系统帮助 → 检索 system_knowledge
  │                      闲聊     → 跳过
  │                      影像     → 直接路由，不检索
  │
  ▼
route_to_agent         ← 基于 intent + 上下文路由（prompt 需重写）
  │
  ├── CONVERSATION_AGENT    ← prompt 开头带上相关健康 fact
  ├── RAG_AGENT             ← query expansion 融合健康背景
  ├── WEB_SEARCH_AGENT      ← search query 关联病史关键词
  ├── IMAGE_CV_AGENT        ← 结果解释用患者能懂的语言
  └── SYSTEM_HELP_AGENT     ← [NEW] RAG over 系统知识库
  │
  ▼
package_response       ← [NEW] 管家统一包装
  │                      置信度声明 + 来源引用 + 就医建议 + 深入讨论入口
  │
  ▼
apply_guardrails       ← 输出审查（改为规则 + prompt 内置）
  │
  ▼
END
```

### 相比现有架构的变化

| 变化 | 说明 |
|------|------|
| **新增 `recognize_intent` 节点** | 区分健康咨询/影像理解/系统帮助/闲聊四类意图 |
| **新增 `enrich_context` 节点** | 按意图按需检索健康事实或系统知识，不再无条件注入 |
| **新增 `package_response` 节点** | 管家统一包装：置信度、来源、就医建议 |
| **新增 `SYSTEM_HELP_AGENT`** | RAG over 系统功能文档，支撑管家角色 2 |
| **新增 `personal_health_facts` collection** | Qdrant 中独立的个人健康事实库 |
| **新增 `system_knowledge` collection** | Qdrant 中独立的系统知识库 |
| **移除 `human_validation` 节点** | to-C 没有医生做验证，改为 `package_response` 中的置信度声明 |
| **重构 `route_to_agent`** | 从"给 6 个 Agent 选一个"改为两级路由（意图 → Agent） |
| **重构 Guardrails** | 输入用规则引擎做 O(1) 拦截，输出约束写入各 Agent prompt |
| **接入 Brain Tumor 模型** | `run_brain_tumor_agent` 从占位文本改为实际调用模型 |
| **删除死代码** | `AgentConfig.DECISION_MODEL`、`AgentConfig.VISION_MODEL` 等 |

---

## 6. 数据存储体系

| 存储 | 内容 | 技术 |
|------|------|------|
| `checkpoints.db` | 对话历史（LangGraph checkpoint） | SQLite + pickle（→ msgpack） |
| `health.db` | 健康档案 + 日志 | SQLite（JSON 字段） |
| `personal_health_facts` | 个人健康事实 embedding | Qdrant collection [NEW] |
| `medical_assistance_rag` | 医学文献 embedding | Qdrant collection（现有） |
| `system_knowledge` | 系统功能文档 embedding | Qdrant collection [NEW] |
| 文件上传 | 临时影像文件 | 本地磁盘（→ 对象存储） |

### 检索策略

- 健康相关 query → 并行检索 `personal_health_facts` + `medical_assistance_rag` → 合并 → 重排 → 生成
- 系统帮助 query → 检索 `system_knowledge` → 生成
- 闲聊 → 不检索，直接对话
- 影像相关 → 不检索，直接路由 CV Agent

---

## 7. 现状审计：六维度成熟度评估

> 2026-06-25 审计。目标：从"功能陈列室"改造为"工业级产品"。

### 7.1 记忆系统 — 40%

| 现有能力 | 缺失 |
|----------|------|
| 对话记忆：LangGraph SqliteSaver，永久存储，按 thread_id 隔离 | 对话记忆与健康记忆之间完全无桥接——Agent 能读对话历史但读不到健康档案 |
| 健康记忆：health.db（profiles + logs），结构化 JSON 字段 | 无语义记忆——不支持 "最近容易累" 匹配到 "贫血史" |
| | 无事实提取层——对话中"父亲有糖尿病"这类关键信息不被提取为长期记忆 |
| | 无遗忘/归档机制——checkpoint 无限增长，无 TTL |

### 7.2 上下文管理 — 20%

| 现有能力 | 缺失 |
|----------|------|
| AgentState 全量携带 messages 列表 | 无 token 计数——不知是否超出 LLM 上下文窗口 |
| `max_conversation_history` 控制消息数量 | 控制方式仅按条数截断，无语义摘要/压缩策略 |
| 对话历史以纯文本拼入 prompt | 无上下文优先级——最近 3 条闲聊和 3 天前的关键诊断结果，权重相同 |
| | **PatientContext 从未注入任何 Agent 的 prompt**（核心断裂） |

### 7.3 工具调用 — 10%

| 现有能力 | 缺失 |
|----------|------|
| Tavily 搜索：import 了 `TavilySearchResults` LangChain tool | **完全不使用 LLM function calling 模式**——tool 被当普通函数调用 |
| CV 模型：Python 函数直接调用 | Agent 不能自主决定"这次需要搜索"——靠 prompt → JSON parse → if-else 路由 |
| 所有外部能力通过硬编码函数调用 | 不能组合工具（先搜索再检索再分析） |
| | 新增能力 = 新增 Agent 节点 + 新增路由规则 + 硬编码调用，无即插即用 |

### 7.4 知识检索 — 80%

| 现有能力 | 缺失 |
|----------|------|
| Docling 文档解析（PDF/DOCX/图片） | `personal_health_facts` 检索不存在——个人记忆层缺失 |
| Qdrant Hybrid 检索（dense + BM25 sparse） | `system_knowledge` 检索不存在——系统导航能力缺失 |
| Cross-Encoder 重排序（ms-marco-TinyBERT-L-6） | 检索不感知用户健康背景 |
| LLM Query Expansion | PubMed 搜索已实现但注释掉，未接入 |
| 来源引用（路径 hardcode `localhost:8000`） | 来源路径不可移植 |

### 7.5 可观测性 — 10%

| 现有能力 | 缺失 |
|----------|------|
| `logging_config.py`：`basicConfig(level=INFO, force=True)` | 无请求级 trace_id——一个请求全链路无法串联 |
| `agent_decision.py`：`logger.info("Selected agent: %s")` | 无结构化日志——文本格式，无法被 ELK/Loki 高效检索 |
| RAG 各模块：关键步骤有 logger 调用 | 无延迟统计——路由决策耗时？RAG 各步骤耗时？无从得知 |
| | 无 Token 用量统计——每次请求消耗？哪个 Agent 最费？ |
| | 无 LLM 调用审计日志（prompt 内容、返回内容、模型名） |
| | 无错误率/成功率监控 |
| | `pretty_print` 被 `try/except UnicodeEncodeError` 包裹，Windows 下静默跳过 |

### 7.6 安全控制 — 30%

| 现有能力 | 缺失 |
|----------|------|
| 输入护栏：LLM 判断 SAFE/UNSAFE（多一次 LLM 调用） | 无身份认证——session_id 即 UUID Cookie，任何人可伪造 |
| 输出护栏：LLM 审查并修正（再多一次 LLM 调用） | 无授权——任何人可访问任意 session_id 的对话历史 |
| 文件上传：扩展名 + 大小校验 | 扩展名校验不查内容，伪造扩展名可绕过 |
| `secure_filename` 防路径遍历 | 中文文件名变空字符串（有 uuid 前缀兜底） |
| Cookie-based session 隔离 | `config.api.rate_limit = 10` 定义了但**未在任何路由执行** |
| `.env` 管理 secrets | 无数据加密——SQLite 文件明文存储 |
| | 无敏感信息脱敏——日志中可能打印完整 query 和回答 |
| | 无审计日志 |
| | 无 CORS 显式配置 |

---

## 8. 工业化改造路线图

### Phase 0：核心基础设施 — 个人记忆检索（已完成 ✅）

**优先级：最高。`personal_health_facts` 是整个系统的底座——没有它，所有 Agent 都无法提供个性化回答。**

| # | 任务 | 涉及文件 | 状态 |
|---|------|----------|------|
| 0.1 | 删除死代码 | `agent_decision.py` | ✅ `DECISION_MODEL`/`VISION_MODEL` 类变量移除 |
| 0.2 | 新建 `personal_health_facts` Qdrant collection | 新建 `agents/fact_indexer.py` | ✅ 独立 collection，hybrid 检索 |
| 0.3 | Fact chunk 生成器 | `health_db.py:get_fact_chunks()` | ✅ profile + logs → `List[str]` |
| 0.4 | `enrich_context` 节点 | `agent_decision.py` | ✅ 关键词意图检测 + 语义检索 |
| 0.5 | Conversation/RAG/WebSearch 注入 | `agent_decision.py` | ✅ 三个 Agent 均注入 `enriched_context` |
| 0.6 | 前端 Placeholder 页面 | `frontend/src/components/Placeholder.tsx` | ✅ 已有完善 Coming Soon 组件 |
| 0.7 | `local_file_store.py` 去留 | 删除该文件；`vectorstore_qdrant.py` 重构 | ✅ 删除，直接用 `chunk.page_content` |
| 0.8 | 接入脑肿瘤模型 | `brain_tumor_agent/` 重写, `image_analysis_agent/__init__.py`, `agent_decision.py` | ✅ mateuszbuda U-Net 架构内嵌，离线验证通过 |
| 0.9 | 统一 CV 模型交付 | 三个 CV Agent `model_download.py`, `config.py`, `.env` | ✅ gdown + 本地双路径，全部可配置 |

> **为什么 Phase 0 直接做 `personal_health_facts` 而不是临时用 `build_health_context()` 全量注入？**
> 全量注入 = 我们明确反对的"始终注入"方案。`enrich_context` 的按需语义检索是整个个性化层的根基，必须从第一天按正确方式建立。`health_db.build_health_context()` 重构为 fact chunk 生成器的数据源，不再直接用于 prompt 拼接。

### Phase 1：知识检索扩展 — 系统记忆 + 增强（预计 2 天）

**优先级：高。补齐系统记忆层，让管家能导航用户。**

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|----------|----------|
| 1.1 | 新建 `system_knowledge` Qdrant collection + 系统文档索引 | 新建 `data/system_docs/` | 功能说明、FAQ、隐私政策、技术局限可检索 |
| 1.2 | `SYSTEM_HELP_AGENT` 节点实现 | `agent_decision.py` | "影像分析怎么用？" 类问题返回系统知识库结果 |
| 1.3 | 接入 PubMed 搜索（作为 Web Search 的第二数据源） | `web_search_agent.py:16,24-25` | Web Search 结果包含 PubMed 文献链接 |
| 1.4 | 修复来源路径（localhost:8000 → 相对路径或配置化） | `reranker.py:109`, `vectorstore_qdrant.py:119` | 来源 URL 可在不同部署环境正常工作 |

### Phase 2：Agent 架构升级 — 工具调用（预计 3 天）

**优先级：高。从"硬编码路由"到"LLM 自主决策调用哪些工具"，是 Agent 系统质的飞跃。**

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|----------|----------|
| 2.1 | 定义 Tool 接口：`search_web`, `search_medical_knowledge`, `search_personal_health`, `analyze_image`, `search_system_help` | 新建 `agents/tools.py` | 5 个 LangChain Tool 定义，含 name/description/args_schema |
| 2.2 | `recognize_intent` 节点实现（升级 Phase 0 的简易意图判断） | `agent_decision.py` | 输入 query → 输出 intent 分类（health/vision/system/chat） |
| 2.3 | 重构 `route_to_agent`：改为 `llm.bind_tools(tools) + tool_choice` 模式 | `agent_decision.py` | Agent 自主决策调用哪些 tool，非 prompt → JSON parse → if-else |
| 2.4 | `package_response` 节点实现 | `agent_decision.py` | 统一包装：置信度声明 + 来源引用 + 就医建议 + "深入讨论"入口 |
| 2.5 | 移除 `human_validation` 节点 | `agent_decision.py` | 节点删除，逻辑合并入 `package_response` 的置信度声明 |

### Phase 3：可观测性体系（预计 2 天）

**优先级：高。无观测则无生产运维。**

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|----------|----------|
| 3.1 | 结构化日志改造 | `logging_config.py`, 全项目 | JSON 格式日志，含 `trace_id`, `timestamp`, `level`, `module`, `message`, `extra` |
| 3.2 | 请求级 trace_id | `app.py`（middleware）, `agent_decision.py`（state 携带） | 一个请求从 FastAPI entry → LangGraph → LLM → response 全链路可追踪 |
| 3.3 | LLM 调用审计日志 | 新建 `agents/audit.py` | 记录每次 LLM 调用：prompt（截断）、response（截断）、模型名、token 消耗、延迟 |
| 3.4 | 关键路径延迟打点 | `agent_decision.py`, `rag_agent/__init__.py` | 路由决策/RAG 检索/重排/LLM 生成各阶段延迟可量化 |
| 3.5 | Token 用量统计 | `agents/audit.py` | 按 Agent、按会话、按日维度的 Token 消耗统计 |

### Phase 4：安全加固（预计 2 天）

**优先级：高。健康数据是最高敏感级别的个人数据。**

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|----------|----------|
| 4.1 | 速率限制实际执行 | `app.py`（middleware 或 依赖注入） | 每 session 每分钟限制 N 次请求，超限返回 429 |
| 4.2 | 输入护栏改为规则引擎 | `guardrails/local_guardrails.py` | 第一层正则+关键词 O(1) 拦截，只对可疑内容调 LLM |
| 4.3 | 输出护栏合并到 Agent prompt | 各 Agent prompt 模板 | 护栏规则内嵌为 "Response Format" 约束，不再单独调 LLM |
| 4.4 | 文件上传内容校验 | `app.py:upload_image` | 用 `PIL.Image.open()` 验证文件是真实图片，非仅查扩展名 |
| 4.5 | 基础身份认证（API Key 或简单 Token） | `app.py`（middleware） | 未认证请求无法访问 `/chat`, `/health/*` 等敏感端点 |
| 4.6 | 日志脱敏 | `logging_config.py` | 日志中不打印完整 query（截断）、不打印 PHR 数据 |

### Phase 5：上下文管理升级（预计 2 天）

**优先级：中。长短对话场景下确保回答质量稳定。**

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|----------|----------|
| 5.1 | Token 计数工具 | 新建 `agents/context_manager.py` | 基于 tiktoken 计算当前 messages 的 token 总量 |
| 5.2 | 上下文摘要策略 | `agents/context_manager.py` | 超出窗口时，对早期消息做 LLM 摘要而非直接截断 |
| 5.3 | 上下文优先级标记 | `AgentState` | 诊断结论、检验异常等关键信息标记 `important`，摘要时保留 |
| 5.4 | checkpoint 自动清理 | `agent_decision.py` + Cron | N 天前的 thread 自动归档或删除 |

### Phase 6：生产就绪（预计 2 天）

**优先级：中。代码质量与交付能力。**

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|----------|----------|
| 6.1 | 统一错误处理中间件 | `app.py` | 所有未捕获异常返回结构化 JSON `{"error": "...", "trace_id": "..."}` |
| 6.2 | 配置校验 | `config.py` | 启动时检查必填配置项（API Key、模型路径），缺失即 fail-fast |
| 6.3 | CV 模型存在性校验 | `image_analysis_agent/__init__.py` | 启动时检查 `.pth` 文件存在，缺失时该 Agent 标记为不可用 |
| 6.4 | Docker 镜像优化 | `Dockerfile` | 多层构建 + ffmpeg + 模型预下载 |
| 6.5 | 健康检查增强 | `app.py:/health` | 检查 SQLite 文件可读写、Qdrant 可连接、LLM API 可达 |

---

## 9. 待定/待讨论

- [ ] AI 管家的"人设"风格：专业医生助理 / 家庭健康顾问 / 数据驱动健康教练？（影响 prompt 设计和 UI 风格）
- [ ] 系统知识库的具体内容范围（功能说明、FAQ、隐私政策、技术局限？）
- [ ] 主动提醒的推送通道（仅 Dashboard 内 / Web Push / 邮件？）
- [ ] CV 模型结果的呈现形式（分割图 + 通俗文字说明 + 就医建议？）
- [ ] 个人健康 fact 的 TTL（3 年前的血压记录还检索吗？还是只保留最近 N 个月？）

---

## 10. 达成共识的关键决策记录

1. **产品定位**：To-C 个人健康 AI 伙伴，不是医生端 CDSS，不是多模态演示平台
2. **PatientContext 策略**：按需检索（豆包模式），而非始终注入。技术方案 = 独立 Qdrant collection `personal_health_facts` + `enrich_context` 节点
3. **PatientContext 落地时机**：Phase 0 直接建 `personal_health_facts` Qdrant collection，不做中间态。拒绝"先用 `build_health_context()` 全量注入、以后再改"的妥协方案——因为全量注入违背核心设计原则，且会在 prompt 中塞入无关健康信息
4. **AI 管家定位**：系统决策中枢，不是 UI 组件。Dashboard 和 ChatPage 共用同一管家
5. **UI 间上下文连续性**：共享 `thread_id`，不做消息摘要传递
6. **Web Search Agent**：保留并增强——搜索 query 应与患者病史关联；接入 PubMed 作为第二数据源
7. **影像分析**：保留——患者也有理解自己影像报告的需求；CV 结果解释用患者能懂的语言
8. **Human Validation**：移除——to-C 场景无医生验证，改为 `package_response` 中的置信度声明
9. **Guardrails**：输入改为规则引擎 + LLM 两级过滤；输出护栏规则嵌入 Agent prompt
10. **工具调用**：从"prompt → JSON parse → if-else 硬编码路由"升级为 LLM function calling 模式
11. **可观测性**：JSON 结构化日志 + trace_id + LLM 审计日志 + 延迟打点 + Token 统计
12. **安全基线**：速率限制执行 + 文件内容校验 + 基础身份认证 + 日志脱敏

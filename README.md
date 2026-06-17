<div align="center">

![StarCore MedLink](assets/logo.png)

<h1>StarCore MedLink</h1>

**星核互联 · Agent 驱动的智慧医疗平台**

多 Agent 协作的医学 AI 系统，集成 RAG 文献检索、医学影像分析、网络搜索和个人健康档案管理。

![Python - Version](https://img.shields.io/badge/PYTHON-3.11+-blue?style=for-the-badge&logo=python&logoColor=white)
![LangGraph - Version](https://img.shields.io/badge/LangGraph-1.2+-teal?style=for-the-badge&logo=langgraph)
![LangChain - Version](https://img.shields.io/badge/LangChain-1.3+-teal?style=for-the-badge&logo=langchain)
![FastAPI - Version](https://img.shields.io/badge/FastAPI-0.115+-teal?style=for-the-badge&logo=fastapi)
![React - Version](https://img.shields.io/badge/React-19+-blue?style=for-the-badge&logo=react)
![TypeScript - Version](https://img.shields.io/badge/TypeScript-5.7+-blue?style=for-the-badge&logo=typescript)
![Qdrant - Version](https://img.shields.io/badge/Qdrant-1.18+-red?style=for-the-badge&logo=qdrant)
[![Generic badge](https://img.shields.io/badge/License-Apache-<COLOR>.svg?style=for-the-badge)](./LICENSE)

</div>

---

## 目录

- [概述](#概述)
- [界面预览](#界面预览)
- [系统架构](#系统架构)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [使用说明](#使用说明)
- [项目结构](#项目结构)
- [许可证与致谢](#许可证与致谢)

---

## 概述

**Medical AI Assistant** 是一个多 Agent 协作的医学 AI 咨询平台，通过 LangGraph 编排多个专业 Agent，提供医学文献检索、影像分析、网络搜索和对话咨询等功能。

系统集成了**个人健康档案（PHR）管理**，用户的健康信息（基本资料、病史、用药记录等）会自动注入 AI 对话上下文，提供个性化的医学咨询体验。

### Agent 体系

| Agent | 职责 |
|-------|------|
| **Conversation Agent** | 通用医学对话、健康咨询 |
| **RAG Agent** | 基于向量库的医学文献检索与问答 |
| **Web Search Agent** | 实时网络搜索，获取最新医学信息 |
| **Brain Tumor Agent** | 脑肿瘤 MRI 影像分割 |
| **Chest X-Ray Agent** | COVID-19 胸部 X 光分类 |
| **Skin Lesion Agent** | 皮肤病变分割与分类 |

通过 **置信度路由（Confidence-Based Routing）** 和 **Agent 间交接（Agent-to-Agent Handoff）**，系统在 RAG 检索结果置信度不足时自动切换至网络搜索，确保回答质量。

---

## 界面预览

### AI Consult — 多 Agent 医学咨询

![AI Consult](assets/ai_consult.jpg)

### Dashboard — 个人健康仪表盘

![Dashboard](assets/dashboard.jpg)

---

## 系统架构

![Technical Flow Chart](assets/final_medical_assistant_flowchart_light_rounded.png)

---

## 核心功能

- **多 Agent 协作** — LangGraph 状态图编排 6 个专业 Agent，动态路由与任务分发
- **高级 RAG 检索** — Docling 文档解析 + 语义分块 + Qdrant 混合检索 + Cross-Encoder 重排序
- **医学影像分析** — 脑肿瘤 MRI、胸部 X 光（COVID-19）、皮肤病变三类影像诊断
- **个人健康档案（PHR）** — 健康资料与日常指标管理，自动注入 AI 对话上下文
- **网络搜索集成** — Tavily 实时搜索最新医学资讯
- **语音交互** — Eleven Labs STT/TTS，支持语音输入与播报
- **安全护栏** — 输入/输出 Guardrails，过滤有害内容和提示注入
- **人机验证** — 医学影像诊断结果需人工确认

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端框架** | FastAPI + Uvicorn |
| **Agent 编排** | LangGraph + LangChain |
| **前端** | React 19 + TypeScript + Vite + Tailwind CSS |
| **LLM** | DashScope Qwen / OpenAI / DeepSeek (可切换) |
| **视觉模型** | Qwen-VL / GPT-4o |
| **向量数据库** | Qdrant (本地模式) |
| **文档解析** | Docling |
| **重排序** | HuggingFace Cross-Encoder (`ms-marco-TinyBERT-L-6`) |
| **嵌入模型** | text-embedding-v3 |
| **语音** | Eleven Labs API |
| **网络搜索** | Tavily Search API |
| **CV 模型** | PyTorch + torchvision (U-Net, ResNet) |

---

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 20+
- ffmpeg（语音功能需要）

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd Medical-Assistant
```

### 2. 后端安装

```bash
# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入 API Key：

```bash
# 必填
LLM_API_KEY=your-api-key         # DashScope / OpenAI / DeepSeek
LLM_MODEL=qwen-plus              # 可选 gpt-4o / deepseek-chat
VISION_MODEL=qwen-vl-plus        # 多模态视觉模型

# 可选
ELEVEN_LABS_API_KEY=             # 语音功能
TAVILY_API_KEY=                  # 网络搜索
HUGGINGFACE_TOKEN=               # Cross-Encoder 重排序
```

> 默认使用阿里云 DashScope（Qwen 系列），切换到其他 LLM 只需修改 `LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL`。

### 4. 前端安装

```bash
cd frontend
npm install
npm run build   # 构建生产版本
cd ..
```

### 5. 启动应用

```bash
python app.py
```

访问 [http://localhost:8080](http://localhost:8080)

### 6. （可选）注入 RAG 数据

```bash
# 单文件
python ingest_rag_data.py --file ./data/raw/your-document.pdf

# 整个目录
python ingest_rag_data.py --dir ./data/raw
```

---

## 使用说明

- **AI 咨询** — 在聊天界面输入医学问题，Agent 自动路由到合适的处理单元
- **影像分析** — 上传 MRI / X 光 / 皮肤病变图片，由专门的 CV Agent 诊断
- **健康档案** — 填写个人健康资料和日常指标，AI 咨询时自动引用
- **语音输入** — 按住麦克风按钮录音，自动转文字后发送
- **RAG 检索** — 注入医学文献后，系统优先从知识库检索回答

> 首次运行可能较慢，需要下载 CV 模型和 Cross-Encoder 模型。

---

## 项目结构

```
StarCore-MedLink/
├── agents/                     # 多 Agent 系统
│   ├── agent_decision.py       # Agent 编排与路由
│   ├── guardrails/             # 输入输出安全护栏
│   ├── rag_agent/              # RAG 检索 Agent
│   ├── web_search_processor_agent/  # 网络搜索 Agent
│   └── image_analysis_agent/   # 医学影像分析 Agent
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   └── api/                # API 客户端
│   └── package.json
├── app.py                      # FastAPI 后端入口
├── config.py                   # 配置中心
├── health_db.py                # 个人健康档案（PHR）
├── ingest_rag_data.py          # RAG 数据注入 CLI
├── logging_config.py           # 日志配置
├── requirements.txt            # Python 依赖
├── assets/                     # 截图与架构图
├── sample_images/              # 测试用医学影像
└── .env.example                # 环境变量模板
```

---

## 许可证与致谢

本项目基于 [Apache 2.0 License](LICENSE)。

Forked from [souvikmajumder26/Multi-Agent-Medical-Assistant](https://github.com/souvikmajumder26/Multi-Agent-Medical-Assistant)，在此基础上进行了以下主要改动：

- 前端从 HTML/CSS/JS 重构为 **React + TypeScript + Vite + Tailwind CSS** SPA
- LLM 从 Azure OpenAI 切换为 **DashScope Qwen 系列**（可配置切换）
- 新增 **个人健康档案（PHR）** 系统，支持健康资料和日常指标管理
- 新增健康上下文自动注入 AI 对话的能力
- 升级 LangChain/LangGraph 至 1.x 版本

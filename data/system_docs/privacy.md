# 隐私政策

## 数据收集

StarCore MedLink 会在以下情况收集数据：

1. **您主动输入的信息**：健康档案（年龄、性别、病史等）、健康日志、对话内容
2. **您上传的文件**：医学影像图片（临时存储，处理后删除）
3. **系统自动生成的信息**：会话 ID（UUID Cookie）、对话时间戳

## 数据存储

| 数据类型 | 存储位置 | 格式 |
|----------|----------|------|
| 健康档案与日志 | `data/health.db` | SQLite 明文 |
| 对话历史 | `data/checkpoints.db` | SQLite + pickle 序列化 |
| 健康事实向量 | `data/qdrant_db/` | Qdrant 向量数据库 |
| 上传文件 | `uploads/` | 临时文件（处理后删除） |

## 数据共享

- 对话内容会发送到您配置的 LLM API 服务商（如阿里云 DashScope）
- 联网搜索时，搜索 query 会发送到 Tavily Search API
- 语音转写和合成会发送到 ElevenLabs API
- 不会向第三方出售或分享您的健康数据

## 数据删除

- 删除对话历史：API `DELETE /history?session_id=xxx`
- 删除健康档案：删除 `data/health.db` 中对应记录
- 删除健康事实向量：调用 FactIndexer 的 `delete_profile` 方法

## 安全措施

- 基于 Cookie 的会话隔离
- 文件上传：扩展名 + 大小校验
- `secure_filename` 防路径遍历攻击
- API Key 通过 `.env` 文件管理，不硬编码

## 已知局限

- 当前版本无身份认证机制，session_id 即 Cookie，任何人可以伪造
- SQLite 数据库明文存储，无数据加密
- 日志中可能包含部分查询内容

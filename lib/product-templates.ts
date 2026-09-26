// 首页 Product Idea Templates 集中配置。
// 仅作为起点文案：保留信息缺口（用户/边界/形态未完全确定），
// 由后续 Clarification 节点继续澄清，不能写成完整 PRD。

export interface ProductTemplate {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export const PRODUCT_TEMPLATES: readonly ProductTemplate[] = [
  {
    id: "ai-sales-followup",
    label: "AI 应用",
    description: "整理客户沟通记录，给出跟进建议",
    prompt:
      "我想做一个帮助销售团队整理客户沟通记录的 AI 工具，把会议纪要、聊天记录和跟进信息整理在一起，并给出下一步跟进建议。第一版希望先做成网页。",
  },
  {
    id: "saas-feedback",
    label: "SaaS",
    description: "集中整理小团队的客户反馈",
    prompt:
      "我想做一个给小团队使用的客户反馈管理工具，把表单、群聊和邮件里的反馈集中整理，让产品人员更容易找到重复出现的问题。",
  },
  {
    id: "devtool-api-notes",
    label: "开发者工具",
    description: "整理 API 文档与调试记录",
    prompt:
      "我想做一个帮助开发者整理 API 文档和调试记录的小工具，可以保存常用请求、接口说明和测试结果，希望一个人也能长期维护。",
  },
  {
    id: "efficiency-freelancer",
    label: "效率工具",
    description: "管理自由职业者的多客户项目",
    prompt:
      "我想做一个帮助自由职业者管理项目待办、截止时间和交付材料的轻量工具，让多个客户项目不容易混在一起。",
  },
] as const;

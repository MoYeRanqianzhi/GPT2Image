# v2.0 架构重构：Vanilla JS → Vite + React + TypeScript

## 日期
2026-04-24

## 技术栈
- **构建工具**: Vite 8
- **框架**: React 19
- **语言**: TypeScript 5
- **路由**: React Router v7 (HashRouter)
- **状态管理**: Zustand 5
- **图标**: lucide-react (Feather 兼容)
- **Markdown**: react-markdown + remark-math + rehype-katex
- **样式**: 全局 CSS（从原 style.css 迁移，未做 CSS Modules 拆分）

## 文件结构
```
src/
├── main.tsx          # React 入口
├── App.tsx           # HashRouter + Routes + Providers
├── types.ts          # 全局 TS 类型
├── lib/
│   ├── store.ts      # Zustand (config + conversations + IndexedDB)
│   ├── api.ts        # generateImage API 客户端
│   ├── theme.ts      # 深色模式 + 径向动画
│   └── markdown.tsx  # react-markdown 封装
├── components/       # 6 个 React 组件
├── pages/            # 6 个页面视图
└── styles/
    └── globals.css   # 完整 CSS（原 style.css）
```

## 注意事项
- IndexedDB 数据库名称和 store 名称与 v1 一致，数据兼容
- localStorage key 不变（gpt2image_config, gpt2image_waterfall_warned）
- lucide-react 不含 Github 图标，Settings 页面使用内联 SVG
- CSS 未做模块化拆分（使用全局 class name），可作为后续优化
- 原始 vanilla JS 源码保留在 src-old/（未提交到 git）

## 分支
- `refactor/vite-react-ts` 分支
- Tag: `v2.0.0-rc1`

const CATEGORY_DEFINITIONS = [
  { id: 1, name: '开发与代码', icon: 'icon-md-code' },
  { id: 2, name: 'AI 与研究', icon: 'icon-a-smartrobot-fill' },
  { id: 3, name: '云服务与运维', icon: 'icon-md-planet' },
  { id: 4, name: '设计与协作', icon: 'icon-bianji' },
  { id: 5, name: '新闻与知识', icon: 'icon-wenzi' },
  { id: 6, name: '视频与媒体', icon: 'icon-md-photos' },
  { id: 7, name: '办公与效率', icon: 'icon-md-clipboard' },
  { id: 8, name: '社区与社交', icon: 'icon-interactive-fill' },
  { id: 9, name: '购物与服务', icon: 'icon-tag' },
  { id: 10, name: '学习与工具', icon: 'icon-xuexi' }
]

const SITE_DEFINITIONS = [
  {
    categoryId: 1,
    name: 'GitHub',
    url: 'https://github.com',
    description: '全球主流代码托管与协作平台'
  },
  {
    categoryId: 1,
    name: 'GitLab',
    url: 'https://gitlab.com',
    description: '支持 DevSecOps 的代码协作平台'
  },
  {
    categoryId: 1,
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    description: '开发者问答社区'
  },
  {
    categoryId: 1,
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    description: 'Web 标准与 API 文档'
  },
  {
    categoryId: 1,
    name: 'npm',
    url: 'https://www.npmjs.com',
    description: 'JavaScript 包管理与发布平台'
  },
  {
    categoryId: 1,
    name: 'jsDelivr',
    url: 'https://www.jsdelivr.com',
    description: '开源 CDN 服务'
  },
  { categoryId: 1, name: 'Vite', url: 'https://vite.dev', description: '现代前端构建工具' },
  { categoryId: 1, name: 'Vue.js', url: 'https://vuejs.org', description: '渐进式前端框架官网' },
  { categoryId: 1, name: 'React', url: 'https://react.dev', description: 'React 官方文档' },
  {
    categoryId: 1,
    name: 'Docker Hub',
    url: 'https://hub.docker.com',
    description: 'Docker 镜像仓库'
  },

  {
    categoryId: 2,
    name: 'OpenAI',
    url: 'https://openai.com',
    description: '通用人工智能产品与研究平台'
  },
  {
    categoryId: 2,
    name: 'Anthropic',
    url: 'https://www.anthropic.com',
    description: 'Claude 模型与 AI 安全研究'
  },
  {
    categoryId: 2,
    name: 'Hugging Face',
    url: 'https://huggingface.co',
    description: '开源模型与数据集社区'
  },
  { categoryId: 2, name: 'arXiv', url: 'https://arxiv.org', description: '预印本论文平台' },
  {
    categoryId: 2,
    name: 'Google Scholar',
    url: 'https://scholar.google.com',
    description: '学术搜索服务'
  },
  {
    categoryId: 2,
    name: 'Papers with Code',
    url: 'https://paperswithcode.com',
    description: '论文与代码索引平台'
  },
  {
    categoryId: 2,
    name: 'Kaggle',
    url: 'https://www.kaggle.com',
    description: '数据科学竞赛与数据集平台'
  },
  {
    categoryId: 2,
    name: 'DeepLearning.AI',
    url: 'https://www.deeplearning.ai',
    description: 'AI 课程与训练营平台'
  },
  {
    categoryId: 2,
    name: 'IEEE Xplore',
    url: 'https://ieeexplore.ieee.org',
    description: 'IEEE 学术文献数据库'
  },
  {
    categoryId: 2,
    name: 'Nature',
    url: 'https://www.nature.com',
    description: '综合科学研究期刊网站'
  },

  {
    categoryId: 3,
    name: 'Amazon Web Services',
    url: 'https://aws.amazon.com',
    description: 'AWS 云计算平台'
  },
  {
    categoryId: 3,
    name: 'Google Cloud',
    url: 'https://cloud.google.com',
    description: 'Google Cloud 官方平台'
  },
  {
    categoryId: 3,
    name: 'Microsoft Azure',
    url: 'https://azure.microsoft.com',
    description: 'Azure 云服务平台'
  },
  {
    categoryId: 3,
    name: 'Cloudflare',
    url: 'https://www.cloudflare.com',
    description: 'CDN、DNS 与边缘安全平台'
  },
  {
    categoryId: 3,
    name: 'Vercel',
    url: 'https://vercel.com',
    description: '前端托管与边缘部署平台'
  },
  {
    categoryId: 3,
    name: 'Netlify',
    url: 'https://www.netlify.com',
    description: '静态站点部署与边缘函数平台'
  },
  {
    categoryId: 3,
    name: 'DigitalOcean',
    url: 'https://www.digitalocean.com',
    description: '开发者云主机平台'
  },
  { categoryId: 3, name: 'Grafana', url: 'https://grafana.com', description: '可观测性与监控平台' },
  {
    categoryId: 3,
    name: 'Sentry',
    url: 'https://sentry.io',
    description: '错误追踪与性能监控平台'
  },
  {
    categoryId: 3,
    name: 'Jenkins',
    url: 'https://www.jenkins.io',
    description: '持续集成自动化服务器'
  },

  {
    categoryId: 4,
    name: 'Figma',
    url: 'https://www.figma.com',
    description: '界面设计与原型协作工具'
  },
  {
    categoryId: 4,
    name: 'Notion',
    url: 'https://www.notion.so',
    description: '文档、项目与知识管理工具'
  },
  { categoryId: 4, name: 'Slack', url: 'https://slack.com', description: '团队即时协作平台' },
  {
    categoryId: 4,
    name: 'Jira',
    url: 'https://www.atlassian.com/software/jira',
    description: '敏捷项目与问题跟踪工具'
  },
  {
    categoryId: 4,
    name: 'Confluence',
    url: 'https://www.atlassian.com/software/confluence',
    description: '团队知识库与文档平台'
  },
  { categoryId: 4, name: 'Miro', url: 'https://miro.com', description: '在线白板与协作画布' },
  { categoryId: 4, name: 'Trello', url: 'https://trello.com', description: '看板式任务管理工具' },
  { categoryId: 4, name: 'Canva', url: 'https://www.canva.com', description: '在线图形设计平台' },
  { categoryId: 4, name: 'Dribbble', url: 'https://dribbble.com', description: '设计作品展示社区' },
  { categoryId: 4, name: 'Behance', url: 'https://www.behance.net', description: '创意作品集平台' },

  {
    categoryId: 5,
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    description: '自由百科全书'
  },
  { categoryId: 5, name: 'Reuters', url: 'https://www.reuters.com', description: '国际新闻通讯社' },
  {
    categoryId: 5,
    name: 'Bloomberg',
    url: 'https://www.bloomberg.com',
    description: '商业与财经资讯平台'
  },
  {
    categoryId: 5,
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    description: '创业与技术新闻社区'
  },
  {
    categoryId: 5,
    name: 'The Verge',
    url: 'https://www.theverge.com',
    description: '消费科技媒体'
  },
  { categoryId: 5, name: 'TechCrunch', url: 'https://techcrunch.com', description: '科技创业媒体' },
  {
    categoryId: 5,
    name: 'The New York Times',
    url: 'https://www.nytimes.com',
    description: '综合新闻媒体'
  },
  { categoryId: 5, name: 'BBC News', url: 'https://www.bbc.com/news', description: 'BBC 新闻网站' },
  {
    categoryId: 5,
    name: 'The Economist',
    url: 'https://www.economist.com',
    description: '国际时政与商业媒体'
  },
  {
    categoryId: 5,
    name: 'Product Hunt',
    url: 'https://www.producthunt.com',
    description: '新产品发现社区'
  },

  {
    categoryId: 6,
    name: 'YouTube',
    url: 'https://www.youtube.com',
    description: '全球主流视频网站'
  },
  { categoryId: 6, name: 'Netflix', url: 'https://www.netflix.com', description: '流媒体影视平台' },
  {
    categoryId: 6,
    name: 'Spotify',
    url: 'https://open.spotify.com',
    description: '在线音乐与播客平台'
  },
  { categoryId: 6, name: 'Twitch', url: 'https://www.twitch.tv', description: '游戏与直播平台' },
  {
    categoryId: 6,
    name: 'Bilibili',
    url: 'https://www.bilibili.com',
    description: '中文视频与社区平台'
  },
  { categoryId: 6, name: 'Vimeo', url: 'https://vimeo.com', description: '创作者视频平台' },
  {
    categoryId: 6,
    name: 'Disney+',
    url: 'https://www.disneyplus.com',
    description: 'Disney 流媒体平台'
  },
  { categoryId: 6, name: 'TED', url: 'https://www.ted.com', description: '演讲与知识传播平台' },
  {
    categoryId: 6,
    name: 'SoundCloud',
    url: 'https://soundcloud.com',
    description: '音乐创作与分享社区'
  },
  {
    categoryId: 6,
    name: 'Letterboxd',
    url: 'https://letterboxd.com',
    description: '电影记录与讨论社区'
  },

  {
    categoryId: 7,
    name: 'Google Docs',
    url: 'https://docs.google.com',
    description: '在线文档编辑工具'
  },
  {
    categoryId: 7,
    name: 'Google Sheets',
    url: 'https://sheets.google.com',
    description: '在线表格工具'
  },
  { categoryId: 7, name: 'Gmail', url: 'https://mail.google.com', description: 'Google 邮件服务' },
  {
    categoryId: 7,
    name: 'Google Calendar',
    url: 'https://calendar.google.com',
    description: 'Google 日历服务'
  },
  {
    categoryId: 7,
    name: 'Microsoft 365',
    url: 'https://www.microsoft365.com',
    description: '微软在线办公套件'
  },
  {
    categoryId: 7,
    name: 'Outlook',
    url: 'https://outlook.live.com',
    description: '微软邮件与日历服务'
  },
  {
    categoryId: 7,
    name: 'Dropbox',
    url: 'https://www.dropbox.com',
    description: '云盘与文件协作平台'
  },
  {
    categoryId: 7,
    name: 'OneDrive',
    url: 'https://onedrive.live.com',
    description: '微软云盘服务'
  },
  { categoryId: 7, name: 'Zoom', url: 'https://zoom.us', description: '在线视频会议工具' },
  {
    categoryId: 7,
    name: 'Grammarly',
    url: 'https://www.grammarly.com',
    description: '英文写作辅助工具'
  },

  { categoryId: 8, name: 'Reddit', url: 'https://www.reddit.com', description: '全球讨论社区' },
  { categoryId: 8, name: 'X', url: 'https://x.com', description: '实时社交信息平台' },
  { categoryId: 8, name: 'LinkedIn', url: 'https://www.linkedin.com', description: '职业社交平台' },
  { categoryId: 8, name: 'Discord', url: 'https://discord.com', description: '社区与语音协作平台' },
  {
    categoryId: 8,
    name: 'Mastodon',
    url: 'https://mastodon.social',
    description: '去中心化社交平台实例'
  },
  { categoryId: 8, name: 'Facebook', url: 'https://www.facebook.com', description: '综合社交平台' },
  {
    categoryId: 8,
    name: 'Instagram',
    url: 'https://www.instagram.com',
    description: '图片与短视频社交平台'
  },
  {
    categoryId: 8,
    name: 'Threads',
    url: 'https://www.threads.net',
    description: 'Meta 短文本社交平台'
  },
  {
    categoryId: 8,
    name: 'Medium',
    url: 'https://medium.com',
    description: '长文写作与内容发布平台'
  },
  { categoryId: 8, name: 'Quora', url: 'https://www.quora.com', description: '问答与知识分享社区' },

  { categoryId: 9, name: 'Amazon', url: 'https://www.amazon.com', description: '全球电商平台' },
  { categoryId: 9, name: 'eBay', url: 'https://www.ebay.com', description: '拍卖与二手交易平台' },
  { categoryId: 9, name: 'Alibaba', url: 'https://www.alibaba.com', description: 'B2B 电商平台' },
  { categoryId: 9, name: 'Taobao', url: 'https://www.taobao.com', description: '淘宝电商平台' },
  { categoryId: 9, name: 'JD.com', url: 'https://www.jd.com', description: '京东电商平台' },
  { categoryId: 9, name: 'Etsy', url: 'https://www.etsy.com', description: '手工与创意商品平台' },
  {
    categoryId: 9,
    name: 'AliExpress',
    url: 'https://www.aliexpress.com',
    description: '国际零售电商平台'
  },
  { categoryId: 9, name: 'Walmart', url: 'https://www.walmart.com', description: '零售商线上商城' },
  {
    categoryId: 9,
    name: 'Best Buy',
    url: 'https://www.bestbuy.com',
    description: '消费电子零售平台'
  },
  { categoryId: 9, name: 'Costco', url: 'https://www.costco.com', description: '会员制零售平台' },

  {
    categoryId: 10,
    name: 'Coursera',
    url: 'https://www.coursera.org',
    description: '在线课程平台'
  },
  { categoryId: 10, name: 'edX', url: 'https://www.edx.org', description: '高校公开课程平台' },
  { categoryId: 10, name: 'Udemy', url: 'https://www.udemy.com', description: '职业技能课程平台' },
  {
    categoryId: 10,
    name: 'Khan Academy',
    url: 'https://www.khanacademy.org',
    description: '免费教育资源平台'
  },
  {
    categoryId: 10,
    name: 'LeetCode',
    url: 'https://leetcode.com',
    description: '算法练习与面试平台'
  },
  {
    categoryId: 10,
    name: 'Codecademy',
    url: 'https://www.codecademy.com',
    description: '交互式编程学习平台'
  },
  {
    categoryId: 10,
    name: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org',
    description: '免费编程学习社区'
  },
  {
    categoryId: 10,
    name: 'W3Schools',
    url: 'https://www.w3schools.com',
    description: '前端与后端基础教程站点'
  },
  {
    categoryId: 10,
    name: 'Can I Use',
    url: 'https://caniuse.com',
    description: '浏览器兼容性查询工具'
  },
  {
    categoryId: 10,
    name: 'Speedtest',
    url: 'https://www.speedtest.net',
    description: '网络测速工具'
  }
]

const BASE_LAST_VISITED_MS = Date.parse('2026-04-15T12:00:00.000Z')
const LAST_VISITED_STEP_MS = 6 * 60 * 60 * 1000

const buildLastVisited = (index: number) =>
  new Date(BASE_LAST_VISITED_MS - index * LAST_VISITED_STEP_MS).toISOString()

const buildSiteIconUrl = (targetUrl: string) => {
  try {
    const parsed = new URL(targetUrl)
    return `${parsed.origin}/favicon.ico`
  } catch {
    return ''
  }
}

const buildExpandedSite = (index: number) => {
  const base = SITE_DEFINITIONS[index % SITE_DEFINITIONS.length]
  const cycle = Math.floor(index / SITE_DEFINITIONS.length)
  const url =
    cycle === 0
      ? base.url
      : `${base.url}${base.url.includes('?') ? '&' : '?'}navSeed=${cycle + 1}`

  return {
    name: cycle === 0 ? base.name : `${base.name} #${cycle + 1}`,
    url,
    description:
      cycle === 0 ? base.description : `${base.description}（仿真扩展 #${cycle + 1}）`,
    categoryId: base.categoryId,
    icon: buildSiteIconUrl(base.url)
  }
}

/**
 * Build a realistic-ish bookmark dataset.
 * @param itemCount default 100 (one pass of SITE_DEFINITIONS); use 1000+ for load tests
 */
export const buildRealisticBookmarkDataset = (itemCount = SITE_DEFINITIONS.length) => {
  const count = Math.max(1, Math.floor(Number(itemCount) || SITE_DEFINITIONS.length))

  const categories = CATEGORY_DEFINITIONS.map((category, index) => ({
    ...category,
    level: 0,
    parentId: null,
    sortOrder: index
  }))

  const items = Array.from({ length: count }, (_, index) => {
    const site = buildExpandedSite(index)
    return {
      id: index + 1,
      name: site.name,
      url: site.url,
      description: site.description,
      categoryId: site.categoryId,
      icon: site.icon,
      pinned: index % 10 === 0,
      level: 0,
      clickCount: Math.max(0, 3200 - index * 2),
      lastVisited: buildLastVisited(index)
    }
  })

  return {
    categories,
    items
  }
}

export const buildRealisticJsonBackupPayload = (itemCount = SITE_DEFINITIONS.length) => {
  const content = buildRealisticBookmarkDataset(itemCount)

  return {
    meta: {
      schemaVersion: 1,
      exportedAt: new Date(BASE_LAST_VISITED_MS).toISOString(),
      categoryCount: content.categories.length,
      itemCount: content.items.length
    },
    content
  }
}

// CLI: tsx src/server/tools/realisticBookmarkDataset.ts [count] [outPath]
const isMain =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]) &&
  /realisticBookmarkDataset\.(ts|js|mjs)$/.test(String(process.argv[1]).replace(/\\/g, '/'))

if (isMain) {
  void (async () => {
    const count = Number(process.argv[2] || 1000)
    const outPath = process.argv[3]
    const payload = buildRealisticJsonBackupPayload(count)
    const text = `${JSON.stringify(payload, null, 2)}\n`
    if (outPath) {
      const fs = await import('node:fs')
      const path = await import('node:path')
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, text, 'utf8')
      console.log(`wrote ${payload.meta.itemCount} items -> ${outPath}`)
    } else {
      process.stdout.write(text)
    }
  })()
}

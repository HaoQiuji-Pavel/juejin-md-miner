// GitHub网站文章信息获取
function getGithubArticleInfo() {
  // const articleInfo = document.querySelector('article');
  // if (!articleInfo) {
  //   throw new Error('未找到GitHub文章信息');
  // }
  
  // 从URL中提取信息
  const urlParts = window.location.pathname.split('/');
  const owner = urlParts[1];
  const fileName = urlParts[urlParts.length - 1];
  
  // 文件名去掉.md扩展名作为标题
  // 直接使用 URL 上的标题：对最后一段进行解码并移除 .md 后缀
  const decodedFileName = decodeURIComponent(fileName.split('?')[0]);
  const title = decodedFileName.replace(/\.md$/i, '');
  const author = owner;
  
  // 优先从 latest-commit-details 容器中的 relative-time 读取人类可读时间，如 “Nov 29, 2019”
  const latestCommitTimeEl = document.querySelector('[data-testid="latest-commit-details"] relative-time');
  const anyRelativeTimeEl = latestCommitTimeEl || document.querySelector('relative-time');
  const date = anyRelativeTimeEl ? (anyRelativeTimeEl.textContent || '').trim() : '';

  if (!date) {
    throw new Error('未找到完整的GitHub文章信息');
  }
  
  return { title, author, date };
}

// GitHub网站文章转Markdown
function convertGithubToMarkdown() {
  const element = document.querySelector('article');
  // if (!element) {
  //   throw new Error('未找到GitHub文章内容');
  // }

  const turndownService = new TurndownService();
  
  // 从URL中提取信息
  const urlParts = window.location.pathname.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const decodedFileName = decodeURIComponent(fileName.split('?')[0]);
  
  const title = decodedFileName.replace(/\.md$/i, '');
  
  let markdown;

  // 检查URL是否包含 ?plain=1
  const urlParams = new URLSearchParams(window.location.search);
  const isPlainView = urlParams.get('plain') === '1';
  
  if (isPlainView) {
    // plain=1 模式：直接从 textarea 获取原始 markdown 内容
    const textarea = document.querySelector('#read-only-cursor-text-area');
    if (!textarea) {
      throw new Error('未找到GitHub原始文本内容');
    }
    markdown = textarea.value || textarea.textContent;
  } else{
    markdown = turndownService.turndown(element.innerHTML);
    // 将 camo 链接解码为原始 URL
    const imgRegex = /!\[([^\]]*)\]\((https:\/\/camo\.githubusercontent\.com\/[^)]+)\)/g;
    markdown = markdown.replace(imgRegex, (match, alt, camoUrl) => {
      try {
        const u = new URL(camoUrl);
        const parts = u.pathname.split('/').filter(Boolean);
        const hex = parts[1] || '';
        if (hex) {
          const bytes = hex.match(/.{1,2}/g) || [];
          const decoded = decodeURIComponent(bytes.map(b => '%' + b).join(''));
          if (/^https?:\/\//i.test(decoded)) {
            return `![${alt}](${decoded})`;
          }
        }
      } catch (e) {
        // 解码失败就保持原样
      }
      return match;
    });
  }
  
  return { title, markdown };
}
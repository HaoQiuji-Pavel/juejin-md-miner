// 其他网站文章信息获取
function getOtherArticleInfo() {
  // 其他网站页面
  const articleInfo = document.querySelector('article');
  if (!articleInfo) {
    throw new Error('未找到其他网站文章信息');
  }
  const title = document.querySelector('h1')?.textContent || '其他网站文章标题';
  const author = '其他网站文章作者';
  const date = '其他网站文章日期';
  
  return {title, author, date};
}

// 其他网站文章转Markdown
function convertOtherToMarkdown() {
  const element = document.querySelector('article');
  if (!element) {
    throw new Error('未找到其他网站文章内容');
  }
  
  const turndownService = new TurndownService();
  const title = document.querySelector('h1')?.textContent || '其他网站文章标题';
  const articleContent = element.innerHTML;
  
  let markdown = turndownService.turndown(articleContent);
  
  // 处理markdown中的相对路径图片，将其转换为绝对路径
  const imgRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g;
  markdown = markdown.replace(imgRegex, (match, alt, url) => {
    const absoluteUrl = convertToAbsoluteUrl(url);
    return `![${alt}](${absoluteUrl})`;
  });
  
  return { title, markdown };
}
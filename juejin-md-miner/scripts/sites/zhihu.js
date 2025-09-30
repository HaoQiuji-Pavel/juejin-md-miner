// 知乎专栏网站文章信息获取
function getZhihuArticleInfo() {
  // 知乎专栏页面
  const articleInfo = document.querySelector('article');
  if (!articleInfo) {
    throw new Error('未找到知乎专栏文章信息');
  }
  const title = articleInfo.querySelector('.Post-Title')?.textContent;
  const author = articleInfo.querySelector('.AuthorInfo meta[itemprop="name"]')?.content;
  const date = articleInfo.querySelector('.ContentItem-time')?.textContent || '';
  
  if (!title || !author) {
    throw new Error('未找到完整的知乎专栏文章信息');
  }
  
  return {title, author, date};
}

// 知乎专栏网站文章转Markdown
function convertZhihuToMarkdown() {
  const element = document.querySelector('article');

  if (!element) {
    throw new Error('未找到知乎专栏文章内容');
  }
  const turndownService = new TurndownService();
  const title = element.querySelector('.Post-Header h1').textContent.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '');
  const articleContent = element.querySelector('.Post-RichTextContainer #content .Post-RichText').innerHTML;
  
  // 添加数学公式处理规则
  turndownService.addRule('zhihuMath', {
    filter: function (node) {
      return node.nodeName === 'SPAN' && node.classList.contains('ztext-math');
    },
    replacement: function (content, node) {
      const tex = node.getAttribute('data-tex');
      if (tex) {
        // 去除末尾的反斜杠，避免影响Markdown渲染
        const cleanTex = tex.replace(/\\+$/, '');
        // 判断是否为行内公式还是块级公式
        // 知乎的行内公式通常较短，块级公式较长或包含特定符号
        const isBlockMath = cleanTex.length > 50 || cleanTex.includes('\\\\') || cleanTex.includes('\\begin') || cleanTex.includes('\\end');
        if (isBlockMath) {
          return '\n\n$$\n' + cleanTex + '\n$$\n\n';
        } else {
          return '$' + cleanTex + '$';
        }
      }
      return content;
    }
  });
  
  const markdown = turndownService.turndown(articleContent)
  return { title, markdown };
}
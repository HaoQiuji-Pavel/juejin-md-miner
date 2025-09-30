// 掘金网站文章信息获取
function getJuejinArticleInfo() {
  const articleInfo = document.querySelector('article');
  if (!articleInfo) {
    throw new Error('未找到掘金文章信息');
  }
  
  const title = articleInfo.querySelector('.article-title')?.textContent;
  const author = articleInfo.querySelector('.author-info-block .author-name span')?.textContent;
  const date = articleInfo.querySelector('.author-info-block .meta-box time')?.textContent;
  
  if (!title || !author || !date) {
    throw new Error('未找到完整的掘金文章信息');
  }
  
  return {title, author, date};
}

// 掘金网站文章转Markdown
function convertJuejinToMarkdown() {
  const element = document.querySelector('article');
  if (!element) {
    throw new Error('未找到掘金文章内容');
  }
  
  const turndownService = new TurndownService()
  const title = element.querySelector('h1').textContent.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '');
  const articleContent = element.querySelector('#article-root .article-viewer').innerHTML;
  turndownService.remove('style')

  turndownService.addRule('juejinCodeBlock', {
    filter: (node) => {
      return node.nodeName === 'PRE' && 
             node.querySelector('.code-block-extension-header') &&
             node.querySelector('code')
    },
    replacement: (content, node) => {
      const codeContent = node.querySelector('code').textContent
      const lang = node.querySelector('.code-block-extension-lang')?.textContent || ''
      const fence = '```'
      return `\n\n${fence}${lang}\n${codeContent}${fence}\n\n`
    }
  })

  turndownService.addRule('juejinTable', {
    filter: 'table',
    replacement: function (content, node) {
      const headers = Array.from(node.querySelectorAll('th'))
        .map(th => turndownService.turndown(th.innerHTML))
        .join(' | ')

      const separator = Array.from(node.querySelectorAll('th'))
        .map(() => '---')
        .join(' | ')

      const rows = Array.from(node.querySelectorAll('tbody tr'))
        .map(tr => {
          return Array.from(tr.querySelectorAll('td'))
            .map(td => turndownService.turndown(td.innerHTML))
            .join(' | ')
        })
        .join('\n')

      return `\n\n${headers}\n${separator}\n${rows}\n\n`
    }
  })
  
  const markdown = turndownService.turndown(articleContent)
  return { title, markdown };
}
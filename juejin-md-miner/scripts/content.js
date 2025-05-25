chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const articleInfo = document.querySelector('article');
  if (message.action === 'getArticleInfo') {
    if(!articleInfo) {
      sendResponse({ success: false, error: '未找到文章信息' });
      return;
    }    
    const {title, author, date} = getArticleInfo(articleInfo);

    if(!title || !author || !date) {
      sendResponse({ success: false, error: '未找到文章信息' });
      return;
    }
    sendResponse({ success: true, articleBasicInfo: {title, author, date} });
  }
  else if (message.action === 'convertToMarkdown') {
    const { title, markdown } = convertToMarkdown(articleInfo);
    new Promise((resolve) => { 
      downloadMarkdown(title, markdown, resolve);
    }).then(() => {  
      sendResponse({ success: true });
    });
    
    return true; // 保持消息通道开放
  }
})

function getArticleInfo(articleInfo) {
  const title = articleInfo.querySelector('.article-title').textContent;
  const author = articleInfo.querySelector('.author-info-block .author-name span').textContent;
  const date = articleInfo.querySelector('.author-info-block .meta-box time').textContent;
  return {title, author, date};
}

// html转markdown
function convertToMarkdown(element) {
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

// 下载markdown
function downloadMarkdown(title, markdown, callback) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.md`

  setTimeout(() => {
    URL.revokeObjectURL(url);
    callback();
  }, 1000);

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
// 网站适配器配置
const siteAdapters = {
  // 掘金适配器
  juejin: {
    getArticleInfo: getJuejinArticleInfo,
    convertToMarkdown: convertJuejinToMarkdown
  },
  // 知乎专栏适配器
  zhihu: {
    getArticleInfo: getZhihuArticleInfo,
    convertToMarkdown: convertZhihuToMarkdown
  }
};

// 消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 获取当前网站的适配器
  const site = message.site || 'juejin'; // 默认使用掘金适配器
  const adapter = siteAdapters[site];
  
  if (!adapter) {
    sendResponse({ success: false, error: '不支持的网站' });
    return false;
  }
  
  if (message.action === 'getArticleInfo') {
    try {
      const articleBasicInfo = adapter.getArticleInfo();
      if (!articleBasicInfo || !articleBasicInfo.title) {
        sendResponse({ success: false, error: '未找到文章信息' });
        return false;
      }
      sendResponse({ success: true, articleBasicInfo });
      return false;
    } catch (error) {
      sendResponse({ success: false, error: error.message || '获取文章信息失败' });
      return false;
    }
  }
  else if (message.action === 'convertToMarkdown') {
    try {
      const { title, markdown } = adapter.convertToMarkdown();
      
      // 根据是否需要下载图片选择不同的下载方法
      if (message.includeImages) {
        new Promise((resolve) => { 
          downloadMarkdownWithImages(title, markdown, resolve);
        }).then(() => {  
          sendResponse({ success: true, message: '已下载Markdown和图片' });
        }).catch(error => {
          sendResponse({ success: false, error: error.message || '下载失败' });
        });
      } else {
        new Promise((resolve) => { 
          downloadMarkdown(title, markdown, resolve);
        }).then(() => {  
          sendResponse({ success: true, message: '已下载Markdown' });
        }).catch(error => {
          sendResponse({ success: false, error: error.message || '下载失败' });
        });
      }
      
      return true; // 保持消息通道开放
    } catch (error) {
      sendResponse({ success: false, error: error.message || '转换失败' });
      return false;
    }
  }
  
  return false;
})


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

// 知乎专栏网站文章信息获取
function getZhihuArticleInfo() {
  // 知乎专栏页面
  const articleInfo = document.querySelector('article');
  const title = articleInfo.querySelector('.Post-Title')?.textContent;
  const author = articleInfo.querySelector('.AuthorInfo meta[itemprop="name"]')?.content;
  const date = articleInfo.querySelector('.ContentItem-time')?.textContent || '';
  
  if (!title || !author) {
    throw new Error('未找到知乎专栏信息');
  }
  
  return {title, author, date};
}

// 知乎专栏网站文章转Markdown
function convertZhihuToMarkdown() {
  const isQuestion = window.location.href.includes('/question/');
  let title, articleContent;
  
  const turndownService = new TurndownService();
  turndownService.remove('style');
  turndownService.remove('noscript');
  
  // 添加知乎专栏代码块规则
  turndownService.addRule('zhihuCodeBlock', {
    filter: (node) => {
      return node.nodeName === 'PRE' && node.querySelector('code');
    },
    replacement: (content, node) => {
      const codeContent = node.querySelector('code').textContent;
      const fence = '```';
      return `\n\n${fence}\n${codeContent}${fence}\n\n`;
    }
  });
  
  // 添加知乎专栏表格规则
  turndownService.addRule('zhihuTable', {
    filter: 'table',
    replacement: function (content, node) {
      const headers = Array.from(node.querySelectorAll('th'))
        .map(th => turndownService.turndown(th.innerHTML))
        .join(' | ');

      const separator = Array.from(node.querySelectorAll('th'))
        .map(() => '---')
        .join(' | ');

      const rows = Array.from(node.querySelectorAll('tbody tr'))
        .map(tr => {
          return Array.from(tr.querySelectorAll('td'))
            .map(td => turndownService.turndown(td.innerHTML))
            .join(' | ');
        })
        .join('\n');

      return `\n\n${headers}\n${separator}\n${rows}\n\n`;
    }
  });
  
  title = document.querySelector('.Post-Title')?.textContent;
  const postContent = document.querySelector('.Post-RichContent');
  if (!title || !postContent) {
    throw new Error('未找到知乎专栏内容');
  }
  articleContent = postContent.innerHTML;
  
  title = title.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '');
  const markdown = turndownService.turndown(articleContent);
  return { title, markdown };
}

// 获取图片扩展名
function getImageExtension(url) {
  // 移除URL参数
  const cleanUrl = url.split('?')[0];
  // 获取文件扩展名
  const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/i);
  let extension = match ? match[1].toLowerCase() : 'jpg';
  
  // 特殊处理掘金的awebp扩展名
  if (extension === 'awebp') {
    extension = 'webp';
  }
  
  return extension;
}

// 下载markdown和图片
async function downloadMarkdownWithImages(title, markdown, callback) {
  try {
    // 创建一个新的JSZip实例
    const zip = new JSZip();
    
    // 创建images文件夹
    const imagesFolder = zip.folder('images');
    
    // 提取markdown中的所有图片URL
    const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    let imgPromises = [];
    let imgMap = {};
    let modifiedMarkdown = markdown;
    
    // 收集所有图片URL
    while ((match = imgRegex.exec(markdown)) !== null) {
      const imgUrl = match[1];
      const imgExt = getImageExtension(imgUrl);
      const imgName = `image_${imgPromises.length + 1}.${imgExt}`;
      
      // 保存图片URL和对应的本地文件名
      imgMap[imgUrl] = imgName;
      
      // 添加图片下载任务
      imgPromises.push(fetchImage(imgUrl).then(blob => {
        imagesFolder.file(imgName, blob);
      }).catch(error => {
        console.error(`下载图片失败: ${imgUrl}`, error);
      }));
    }
    
    // 等待所有图片下载完成
    await Promise.all(imgPromises);
    
    // 替换markdown中的图片链接为本地路径
    for (const [imgUrl, imgName] of Object.entries(imgMap)) {
      modifiedMarkdown = modifiedMarkdown.replace(
        new RegExp(`!\\[(.*?)\\]\\(${imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
        `![$1](images/${imgName})`
      );
    }
    
    // 添加markdown文件到zip
    // 处理文件名，避免被解释为路径
    const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '_');
    zip.file(`${safeTitle}.md`, modifiedMarkdown);
    
    // 生成zip文件并下载
    zip.generateAsync({type: 'blob'}).then(content => {
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // 释放URL对象
      if (callback) callback(); // 调用回调函数
    });
  } catch (error) {
    console.error('下载Markdown和图片失败:', error);
    alert('下载Markdown和图片失败: ' + error.message);
    if (callback) callback(error); // 出错时也调用回调函数
  }
}

// 获取图片Blob
function fetchImage(url) {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.statusText}`);
      }
      return response.blob();
    });
}

// 下载markdown
function downloadMarkdown(title, markdown, callback) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.md`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  if (callback) callback(); // 调用回调函数
}
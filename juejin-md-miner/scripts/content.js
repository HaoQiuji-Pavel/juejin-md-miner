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
  },
  // GitHub适配器
  github: {
    getArticleInfo: getGithubArticleInfo,
    convertToMarkdown: convertGithubToMarkdown
  },
  // 其他网站适配器
  other: {
    getArticleInfo: getOtherArticleInfo,
    convertToMarkdown: convertOtherToMarkdown
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

// 将相对路径转换为绝对路径
function convertToAbsoluteUrl(url) {
  // 如果已经是绝对路径，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径，添加当前网站的域名
  const currentOrigin = window.location.origin;
  
  // 处理以 / 开头的绝对路径
  if (url.startsWith('/')) {
    return currentOrigin + url;
  }
  
  // 处理相对路径（不以 / 开头）
  const currentPath = window.location.pathname;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  return currentOrigin + basePath + url;
}

// 获取图片扩展名
function getImageExtension(url) {
  // 移除URL参数
  const cleanUrl = url.split('?')[0];
  // 获取文件扩展名
  const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/i);
  let extension = match ? match[1].toLowerCase() : 'jpg';
  
  // 特殊处理一些扩展名
  if (extension === 'awebp' || extension === 'image') {
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
  return fetch(url, {
    headers: {
      'Referer': window.location.href,
      'User-Agent': navigator.userAgent
    }
  })
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
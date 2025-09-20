// 全局变量，存储当前选择的网站
let currentSite = '';

document.addEventListener('DOMContentLoaded', () => {
    // 监听自定义元素site-option的site-selected事件
    document.addEventListener('site-selected', async (e) => {
        currentSite = e.detail.site;
        document.getElementById('site-selection').style.display = 'none';
        document.getElementById('article-info').style.display = 'block';
        await loadArticleInfo(currentSite);
    });

    // 返回按钮事件监听
    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('article-info').style.display = 'none';
        document.getElementById('site-selection').style.display = 'block';
    });

    // 下载Markdown按钮事件监听
    document.getElementById('download-md-btn').addEventListener('click', async () => {
        await downloadMarkdown(false);
    });

    // 下载Markdown和图片按钮事件监听
    document.getElementById('download-md-img-btn').addEventListener('click', async () => {
        await downloadMarkdown(true);
    });
});

// 加载文章信息
async function loadArticleInfo(site) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
    
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'getArticleInfo',
            site: site
        }); 
        
        const titleElement = document.getElementById('article-title');
        const authorElement = document.getElementById('article-author');
        const dateElement = document.getElementById('article-date');

        const siteNameElement = document.querySelector('.selected-site .site-name');
        const siteUrlElement = document.querySelector('.selected-site .site-url');

        if (response && response.success) {
            const {processedTitle, processedAuthor, processedDate} = getProcessedInfo(response.articleBasicInfo);

            titleElement.textContent = processedTitle;
            authorElement.textContent = processedAuthor;
            dateElement.textContent = processedDate;

            siteNameElement.textContent = getSiteName(site);
            siteUrlElement.textContent = getSiteUrl(site);
        } else {
            titleElement.textContent = `未获取到${getSiteName(site)}文章信息`;
            authorElement.textContent = '';
            dateElement.textContent = '';
            alert(`无法获取${getSiteName(site)}文章信息，请确保您正在浏览${getSiteName(site)}的文章页面。`);
            document.getElementById('site-selection').style.display = 'block';
            document.getElementById('article-info').style.display = 'none';
        }
    } catch (error) {    
        alert(`无法连接到当前页面，请确保您正在浏览${getSiteName(site)}的文章页面。`);
        document.getElementById('site-selection').style.display = 'block';
        document.getElementById('article-info').style.display = 'none';
    }
}

// 获取网站名称
function getSiteName(site) {
    const siteNames = {
        'juejin': '稀土掘金',
        'zhihu': '知乎专栏',
        'other': '其他网站'
    };
    return siteNames[site] || site;
}
// 获取网站url
function getSiteUrl(site) {
    const siteUrls = {
        'juejin': 'https://juejin.cn/post/',
        'zhihu': 'https://zhuanlan.zhihu.com/p/',
        'other': 'balabalabala~'
    };
    return siteUrls[site] || site;
}

function getProcessedInfo(articleBasicInfo){
    const { title, author, date } = articleBasicInfo;
    // 处理首尾的换行符和空格
    const processedTitle = title ? title.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '') : '';
    const processedAuthor = author ? author.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '') : '';
    const processedDate = date ? date.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '') : '';

    return {processedTitle, processedAuthor, processedDate};
}
    
// 下载Markdown
async function downloadMarkdown(includeImages) {
    const button = includeImages ? 
        document.getElementById('download-md-img-btn') : 
        document.getElementById('download-md-btn');
    const buttonText = button.querySelector('.button-text');
    const originalText = buttonText.textContent;
    
    let timer = setTimeout(()=>{
        button.disabled = true;
        buttonText.textContent = '下载中';
    }, 200)

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'convertToMarkdown',
            site: currentSite,
            includeImages: includeImages
        });        
        
        if (!response || !response.success) {
            alert(response?.error || '下载失败，请重试');
        } else if (response.message) {
            // 下载成功就不alert弹窗了
            // alert(response.message);
        }
    } catch (error) {
        alert(`下载失败: ${error.message}`);
    } finally {
        clearTimeout(timer);
        button.disabled = false;
        buttonText.textContent = originalText;
    }
}
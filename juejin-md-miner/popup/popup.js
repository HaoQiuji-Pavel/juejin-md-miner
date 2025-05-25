document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getArticleInfo' });

    const titleElement = document.getElementById('article-title');
    const authorElement = document.getElementById('article-author');
    const dateElement = document.getElementById('article-date');
    const downloadButton = document.getElementById('download-btn');

    if (response && response.success) {
        const {processedTitle, processedAuthor, processedDate} = getProcessedInfo(response.articleBasicInfo);

        titleElement.textContent = processedTitle;
        authorElement.textContent = processedAuthor;
        dateElement.textContent = processedDate;
        downloadButton.style.display = 'block';
    } else {
        titleElement.textContent = '未获取到文章信息';
        authorElement.textContent = '';
        dateElement.textContent = '';
        downloadButton.style.display = 'none';
    }
});

function getProcessedInfo(articleBasicInfo){
    const { title, author, date } = articleBasicInfo;
    // 处理首尾的换行符和空格
    const processedTitle = title ? title.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '') : '';
    const processedAuthor = author ? author.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '') : '';
    const processedDate = date ? date.replace(/^\s+|\s+$/g, '').replace(/^\n+|\n+$/g, '') : '';

    return {processedTitle, processedAuthor, processedDate};
}
    
const button = document.getElementById('download-btn');
button.addEventListener('click', async () => {
    const buttonText = document.querySelector('.button-text');
    button.disabled = true;
    buttonText.textContent = '下载中';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'convertToMarkdown' });
    
    button.disabled = false;
    buttonText.textContent = '下载Markdown';
});
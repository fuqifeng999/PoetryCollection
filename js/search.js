/* ===== 搜索功能（首页搜索框 + 搜索页） ===== */
const SearchUI = (() => {
  'use strict';

  /**
   * 在原文中高亮关键词（HTML）
   */
  function highlightText(text, keyword) {
    if (!text || !keyword) return text || '';
    const kw = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${kw})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  /**
   * 截取匹配片段（前后各取一段上下文）
   */
  function snippet(text, keyword, contextLen = 20) {
    if (!text) return '';
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return text.slice(0, 100);

    const start = Math.max(0, idx - contextLen);
    const end = Math.min(text.length, idx + keyword.length + contextLen);
    let result = '';
    if (start > 0) result += '…';
    result += text.slice(start, end);
    if (end < text.length) result += '…';
    return result;
  }

  /**
   * 渲染搜索结果列表
   */
  function renderResults(results, keyword, container) {
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🍂</div>
          <p>未找到与「<strong>${keyword}</strong>」相关的诗词</p>
          <p style="margin-top:8px;font-size:0.85rem;color:var(--color-text-muted)">试试其他关键词，如诗人名、诗句、词牌名</p>
        </div>`;
      return;
    }

    let html = '';
    results.forEach(item => {
      const title = item.title || '未知标题';
      const author = item.author || '佚名';
      const content = item.content || item.original || '';
      const excerpt = snippet(content, keyword);

      html += `
        <a href="detail.html?type=${item._type}&id=${item.id}" class="search-result-item">
          <h4>${highlightText(title, keyword)}</h4>
          <div style="color:var(--color-text-secondary);font-size:0.85rem;margin-bottom:8px;">
            <span>${author}</span>
            <span style="margin:0 8px">·</span>
            <span>${item._typeName || item._type}</span>
          </div>
          <span class="match-type">${item._matchType}</span>
          <div class="preview">${highlightText(excerpt, keyword)}</div>
        </a>`;
    });

    container.innerHTML = html;
  }

  /**
   * 初始化搜索框（绑定回车）
   */
  function initSearchBox(inputSelector, btnSelector) {
    const input = document.querySelector(inputSelector);
    const btn = document.querySelector(btnSelector);

    if (!input) return;

    const doSearch = () => {
      const val = input.value.trim();
      if (val) {
        Router.goSearch(val);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
    if (btn) {
      btn.addEventListener('click', doSearch);
    }
  }

  return {
    highlightText,
    snippet,
    renderResults,
    initSearchBox
  };
})();

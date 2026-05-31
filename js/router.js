/* ===== 前端路由 / URL 参数解析 ===== */
const Router = (() => {
  'use strict';

  /**
   * 获取 URL 查询参数
   */
  function getParams() {
    const params = {};
    const search = window.location.search.substring(1);
    if (!search) return params;
    search.split('&').forEach(pair => {
      const [key, val] = pair.split('=').map(decodeURIComponent);
      if (key) params[key] = val || '';
    });
    return params;
  }

  /**
   * 构建带参数的 URL
   */
  function buildURL(base, params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return qs ? `${base}?${qs}` : base;
  }

  /**
   * 跳转到分类列表页
   */
  function goCategory(type, filters = {}) {
    window.location.href = buildURL('category.html', { type, ...filters });
  }

  /**
   * 跳转到详情页
   */
  function goDetail(type, id) {
    window.location.href = buildURL('detail.html', { type, id });
  }

  /**
   * 跳转到搜索页
   */
  function goSearch(keyword) {
    window.location.href = buildURL('search.html', { q: keyword });
  }

  /**
   * 跳转到作者页
   */
  function goAuthor(name) {
    window.location.href = buildURL('author.html', { name });
  }

  /**
   * 替换页面标题
   */
  function setTitle(title) {
    document.title = title ? `${title} — 诗词赏析` : '诗词赏析 — 品千年诗词，赏人间风月';
  }

  return {
    getParams,
    buildURL,
    goCategory,
    goDetail,
    goSearch,
    goAuthor,
    setTitle
  };
})();

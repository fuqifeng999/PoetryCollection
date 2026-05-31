/* ===== 数据加载层 ===== */
const DataLoader = (() => {
  'use strict';

  const DATA_PATH = 'data/';
  const CACHE = {};

  /**
   * 加载单个 JSON 文件（带缓存）
   */
  async function loadJSON(filename) {
    if (CACHE[filename]) return CACHE[filename];
    try {
      const resp = await fetch(DATA_PATH + filename);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      CACHE[filename] = data;
      return data;
    } catch (err) {
      console.error(`加载 ${filename} 失败:`, err);
      return [];
    }
  }

  /**
   * 加载指定类别的诗词列表
   */
  async function loadPoems(type) {
    const map = {
      tang: 'tang.json',
      song: 'song.json',
      yuan: 'yuan.json',
      modern: 'modern.json',
      preqin: 'preqin.json',
      fivedynasty: 'fivedynasty.json',
      mingqing: 'mingqing.json'
    };
    const file = map[type];
    if (!file) return [];
    return loadJSON(file);
  }

  /**
   * 加载全部分类索引
   */
  async function loadCategories() {
    return loadJSON('categories.json');
  }

  /**
   * 加载推荐/每日一诗配置
   */
  async function loadFeatured() {
    return loadJSON('featured.json');
  }

  /**
   * 获取单首诗词（跨类别）
   * @param {string} type - tang/song/yuan/modern
   * @param {string|number} id
   */
  async function getPoem(type, id) {
    const poems = await loadPoems(type);
    return poems.find(p => String(p.id) === String(id)) || null;
  }

  /**
   * 获取某作者全部作品（跨类别）
   */
  async function getPoemsByAuthor(authorName) {
    const types = ['tang', 'song', 'yuan', 'modern', 'preqin', 'fivedynasty', 'mingqing'];
    const results = [];
    for (const type of types) {
      const poems = await loadPoems(type);
      poems.forEach(p => {
        if (p.author === authorName) {
          results.push({ ...p, _type: type });
        }
      });
    }
    return results;
  }

  /**
   * 按题材筛选
   */
  async function getPoemsByTag(tag) {
    const types = ['tang', 'song', 'yuan', 'modern', 'preqin', 'fivedynasty', 'mingqing'];
    const results = [];
    for (const type of types) {
      const poems = await loadPoems(type);
      poems.forEach(p => {
        if (p.tags && p.tags.some(t => t.includes(tag))) {
          results.push({ ...p, _type: type });
        }
      });
    }
    return results;
  }

  /**
   * 搜索（标题/作者/原文/名句）
   */
  async function searchPoems(keyword) {
    if (!keyword || keyword.trim() === '') return [];
    const kw = keyword.trim().toLowerCase();
    const types = ['tang', 'song', 'yuan', 'modern', 'preqin', 'fivedynasty', 'mingqing'];
    const results = [];
    const typeNames = { tang: '唐诗', song: '宋词', yuan: '元曲', modern: '现代诗', preqin: '先秦', fivedynasty: '五代', mingqing: '明清' };

    for (const type of types) {
      const poems = await loadPoems(type);
      poems.forEach(p => {
        let matchType = null;
        const title = (p.title || '').toLowerCase();
        const author = (p.author || '').toLowerCase();
        const content = (p.content || p.original || '').toLowerCase();
        const famous = (p.famous_lines || []).join('').toLowerCase();

        if (title.includes(kw)) matchType = '标题匹配';
        else if (author.includes(kw)) matchType = '作者匹配';
        else if (famous.includes(kw)) matchType = '名句匹配';
        else if (content.includes(kw)) matchType = '原文匹配';

        if (matchType) {
          results.push({
            ...p,
            _type: type,
            _typeName: typeNames[type],
            _matchType: matchType,
            _keyword: kw
          });
        }
      });
    }

    // 排序：标题匹配 > 作者匹配 > 名句匹配 > 原文匹配
    const rank = { '标题匹配': 0, '作者匹配': 1, '名句匹配': 2, '原文匹配': 3 };
    results.sort((a, b) => rank[a._matchType] - rank[b._matchType]);

    return results;
  }

  /**
   * 获取所有作者列表（聚合）
   */
  async function getAllAuthors() {
    const types = ['tang', 'song', 'yuan', 'modern', 'preqin', 'fivedynasty', 'mingqing'];
    const authorMap = {};
    const dynasties = { tang: '唐代', song: '宋代', yuan: '元代', modern: '近现代', preqin: '先秦', fivedynasty: '五代', mingqing: '明清' };

    for (const type of types) {
      const poems = await loadPoems(type);
      poems.forEach(p => {
        if (!p.author) return;
        if (!authorMap[p.author]) {
          authorMap[p.author] = {
            name: p.author,
            dynasty: dynasties[type] || '',
            poemCount: 0,
            types: new Set()
          };
        }
        authorMap[p.author].poemCount++;
        authorMap[p.author].types.add(type);
      });
    }

    return Object.values(authorMap).map(a => ({
      ...a,
      types: [...a.types]
    })).sort((a, b) => b.poemCount - a.poemCount);
  }

  /**
   * 获取每日一诗
   */
  async function getDailyPoem() {
    try {
      const featured = await loadFeatured();
      if (featured.daily && featured.daily.length > 0) {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
        const idx = dayOfYear % featured.daily.length;
        const entry = featured.daily[idx];
        const poem = await getPoem(entry.type, entry.id);
        if (poem) return { ...poem, _dailyType: entry.type };
      }
    } catch (e) { /* fallback */ }

    // fallback: 随机取一首
    const types = ['tang', 'song', 'yuan', 'modern'];
    const rType = types[Math.floor(Math.random() * types.length)];
    const poems = await loadPoems(rType);
    return poems.length > 0 ? { ...poems[Math.floor(Math.random() * poems.length)], _dailyType: rType } : null;
  }

  // 公开接口
  return {
    loadJSON,
    loadPoems,
    loadCategories,
    loadFeatured,
    getPoem,
    getPoemsByAuthor,
    getPoemsByTag,
    searchPoems,
    getAllAuthors,
    getDailyPoem
  };
})();

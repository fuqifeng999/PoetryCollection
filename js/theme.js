/* ===== 黑夜模式切换 ===== */
const ThemeManager = (() => {
  'use strict';

  const STORAGE_KEY = 'poetry-theme';

  /**
   * 初始化主题
   */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (saved === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // 跟随系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
    updateToggleIcon();
  }

  /**
   * 切换主题
   */
  function toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_KEY, 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    }
    updateToggleIcon();
  }

  /**
   * 更新切换按钮图标
   */
  function updateToggleIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.innerHTML = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', isDark ? '切换为亮色模式' : '切换为黑夜模式');
    });
  }

  /**
   * 绑定切换按钮
   */
  function bindToggle(selector) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', toggle);
    });
  }

  return { init, toggle, bindToggle };
})();

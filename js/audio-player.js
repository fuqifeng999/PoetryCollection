/* ===== Web Speech API 语音朗读模块 ===== */
const AudioPlayer = (() => {
  'use strict';

  let utterance = null;
  let isPlaying = false;
  let isPaused = false;
  let currentText = '';
  let lines = [];
  let currentLineIdx = 0;
  let onLineChange = null;   // 回调：高亮当前句子
  let onEnd = null;          // 回调：播放结束
  let onStateChange = null;  // 回调：播放状态变化

  // 音色配置
  const VOICES = [
    { id: 'default', name: '默认音色' },
    { id: 'female', name: '温柔女声' },
    { id: 'male', name: '儒雅男声' }
  ];

  // 语速选项
  const SPEEDS = [
    { value: 0.8, label: '0.8x 慢速' },
    { value: 1.0, label: '1.0x 正常' },
    { value: 1.25, label: '1.25x 稍快' },
    { value: 1.5, label: '1.5x 快速' }
  ];

  // 缓存已加载的语音列表
  let _cachedVoices = [];
  let _voicesLoaded = false;

  /**
   * 初始化（页面加载时调用一次）
   */
  function init() {
    if (typeof speechSynthesis === 'undefined') {
      console.warn('当前浏览器不支持 Web Speech API');
      return false;
    }
    // 预加载语音列表（浏览器异步加载，需要触发+监听）
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
    // Chrome 上 onvoiceschanged 可能已经错过，
    // 用 setTimeout 轮询补救一次
    if (!_voicesLoaded) {
      setTimeout(loadVoices, 300);
      setTimeout(loadVoices, 1000);
    }
    return true;
  }

  function loadVoices() {
    const v = speechSynthesis.getVoices();
    if (v.length > 0) {
      _cachedVoices = v;
      if (!_voicesLoaded) {
        _voicesLoaded = true;
        console.log(`语音引擎就绪，共 ${v.length} 个语音可用`);
      }
    }
  }

  /** 获取当前可用语音的中文名 */
  function getAvailableVoices() {
    if (!_voicesLoaded) loadVoices();
    return _cachedVoices
      .filter(v => v.lang && v.lang.startsWith('zh'))
      .map(v => ({ name: v.name, lang: v.lang }));
  }

  /**
   * 将诗词文本按句分割
   */
  function splitLines(text) {
    if (!text) return [];
    // 按中文标点分割
    const raw = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const segments = raw.split(/(?<=[，。！？、；：\n])/);
    return segments.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * 开始朗读
   * @param {string} text - 诗词原文
   * @param {object} options
   * @param {string} options.voiceId - 音色ID
   * @param {number} options.rate - 语速 0.8-1.5
   */
  function play(text, options = {}) {
    if (!text) return;
    if (typeof speechSynthesis === 'undefined') return;

    // 如果正在播放，先停止
    stop();

    currentText = text;
    lines = splitLines(text);
    currentLineIdx = 0;
    isPlaying = true;
    isPaused = false;

    const rate = options.rate || 1.0;
    const voiceId = options.voiceId || 'default';

    speakNext(rate, voiceId);
    notifyState();
  }

  function speakNext(rate, voiceId) {
    if (currentLineIdx >= lines.length) {
      // 播放完成
      isPlaying = false;
      isPaused = false;
      notifyState();
      if (onEnd) onEnd();
      return;
    }

    const text = lines[currentLineIdx];
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;

    // 音色选择（尝试匹配）
    // 音色选择：使用缓存的语音列表
    const voices = _cachedVoices.length > 0 ? _cachedVoices : speechSynthesis.getVoices();
    if (voiceId !== 'default' && voices.length > 0) {
      // 女声关键词：中文优先
      const femaleKw = ['female', '女生', 'xiaoxuan', 'huihui', 'girl', 'woman', 'xiao yun'];
      // 男声关键词：中文优先
      const maleKw = ['male', '男生', 'yunyang', 'kangkang', 'boy', 'man', 'zhang peng', 'zhi wei'];

      const keywords = voiceId === 'female' ? femaleKw : maleKw;
      let matched = null;
      // 先找中文语音中的匹配
      for (const kw of keywords) {
        matched = voices.find(v => v.lang && v.lang.startsWith('zh') && v.name.toLowerCase().includes(kw));
        if (matched) break;
      }
      // 如果没找到，放宽范围
      if (!matched) {
        for (const kw of keywords) {
          matched = voices.find(v => v.name.toLowerCase().includes(kw));
          if (matched) break;
        }
      }
      if (matched) utterance.voice = matched;
    }

    utterance.onend = () => {
      currentLineIdx++;
      if (onLineChange) onLineChange(currentLineIdx, lines);
      // 继续下一句
      speakNext(rate, voiceId);
    };

    utterance.onerror = (e) => {
      console.warn('朗读出错:', e);
      currentLineIdx++;
      if (onLineChange) onLineChange(currentLineIdx, lines);
      speakNext(rate, voiceId);
    };

    // 当前行高亮回调
    if (onLineChange) onLineChange(currentLineIdx, lines);

    speechSynthesis.speak(utterance);
  }

  /**
   * 暂停
   */
  function pause() {
    if (typeof speechSynthesis === 'undefined') return;
    if (isPlaying && !isPaused) {
      speechSynthesis.pause();
      isPaused = true;
      notifyState();
    }
  }

  /**
   * 恢复
   */
  function resume() {
    if (typeof speechSynthesis === 'undefined') return;
    if (isPlaying && isPaused) {
      speechSynthesis.resume();
      isPaused = false;
      notifyState();
    }
  }

  /**
   * 停止
   */
  function stop() {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    isPlaying = false;
    isPaused = false;
    currentLineIdx = 0;
    utterance = null;
    notifyState();
  }

  /**
   * 重播
   */
  function replay(options = {}) {
    if (!currentText) return;
    play(currentText, options);
  }

  /**
   * 跳转到指定句子（按序号）
   */
  function seekTo(lineIndex, options = {}) {
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    stop();
    currentLineIdx = lineIndex;
    isPlaying = true;
    const rate = options.rate || 1.0;
    const voiceId = options.voiceId || 'default';
    speakNext(rate, voiceId);
    notifyState();
  }

  function notifyState() {
    if (onStateChange) {
      onStateChange({
        isPlaying,
        isPaused,
        currentLineIdx,
        totalLines: lines.length,
        currentText: lines[currentLineIdx] || '',
        progress: lines.length > 0 ? currentLineIdx / lines.length : 0
      });
    }
  }

  // === Getter / Setter ===
  function setOnLineChange(fn) { onLineChange = fn; }
  function setOnEnd(fn) { onEnd = fn; }
  function setOnStateChange(fn) { onStateChange = fn; }
  function getState() {
    return { isPlaying, isPaused, currentLineIdx, totalLines: lines.length };
  }
  function getLines() { return lines; }
  function getCurrentLineIdx() { return currentLineIdx; }

  return {
    init,
    play,
    pause,
    resume,
    stop,
    replay,
    seekTo,
    getState,
    getLines,
    getCurrentLineIdx,
    getAvailableVoices,
    setOnLineChange,
    setOnEnd,
    setOnStateChange,
    VOICES,
    SPEEDS
  };
})();

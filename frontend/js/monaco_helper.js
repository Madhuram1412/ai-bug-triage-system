/**
 * AI Bug Triage System - Monaco Editor Integration
 */

const MonacoHelper = {
  isLoaded: false,
  activeEditors: {},

  loadMonaco() {
    return new Promise((resolve) => {
      if (this.isLoaded && window.monaco) {
        resolve(window.monaco);
        return;
      }

      if (window.require) {
        window.require.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
        });
        window.require(['vs/editor/editor.main'], () => {
          this.isLoaded = true;
          resolve(window.monaco);
        });
      } else {
        // Wait or retry
        const checkInterval = setInterval(() => {
          if (window.require) {
            clearInterval(checkInterval);
            this.loadMonaco().then(resolve);
          }
        }, 100);
      }
    });
  },

  getCurrentTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return isLight ? 'vs' : 'vs-dark';
  },

  async createCodeEditor(containerId, code = '', language = 'python') {
    const monaco = await this.loadMonaco();
    const container = document.getElementById(containerId);
    if (!container) return null;

    this.disposeEditor(containerId);

    const editor = monaco.editor.create(container, {
      value: code,
      language: language.toLowerCase(),
      theme: this.getCurrentTheme(),
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 10, bottom: 10 },
      renderLineHighlight: 'all',
      tabSize: 4
    });

    this.activeEditors[containerId] = editor;
    return editor;
  },

  async createDiffEditor(containerId, originalCode = '', modifiedCode = '', language = 'python', sideBySide = true) {
    const monaco = await this.loadMonaco();
    const container = document.getElementById(containerId);
    if (!container) return null;

    this.disposeEditor(containerId);

    const diffEditor = monaco.editor.createDiffEditor(container, {
      theme: this.getCurrentTheme(),
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      renderSideBySide: sideBySide,
      readOnly: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 10, bottom: 10 }
    });

    const origModel = monaco.editor.createModel(originalCode || '', language.toLowerCase());
    const modifiedModel = monaco.editor.createModel(modifiedCode || '', language.toLowerCase());

    diffEditor.setModel({
      original: origModel,
      modified: modifiedModel
    });

    this.activeEditors[containerId] = diffEditor;
    return diffEditor;
  },

  disposeEditor(containerId) {
    if (this.activeEditors[containerId]) {
      try {
        this.activeEditors[containerId].dispose();
      } catch (e) {
        console.warn('Error disposing monaco editor:', e);
      }
      delete this.activeEditors[containerId];
    }
  },

  updateAllThemes() {
    if (!this.isLoaded || !window.monaco) return;
    const newTheme = this.getCurrentTheme();
    window.monaco.editor.setTheme(newTheme);
  }
};

window.MonacoHelper = MonacoHelper;

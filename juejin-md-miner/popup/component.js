class SiteOption extends HTMLElement {
  static observedAttributes = ["name", "url", "support", "site"];
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.addEventListeners();
  }
  
  render() {
    const name = this.getAttribute('name') || '未知网站';
    const url = this.getAttribute('url') || '#';
    const support = (this.getAttribute('support') === 'true' || this.getAttribute('support') === true);
    const site = this.getAttribute('site') || '';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin: 8px 0;
        }
        
        .site-option {
          width: 100%;
          padding: 12px 16px;
          background-color: #FFFFFF;
          border: 1px solid rgba(233, 30, 99, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .site-option:hover {
          background-color: #fdecf1;
          border: 1px solid rgba(249,187,204);
        }
        
        .site-option.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .site-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
        }
        
        .site-name {
          font-size: 0.9em;
          margin-bottom: 2px;
          color: #4A1A1A;
        }
        
        .site-url {
          font-size: 0.8em;
          opacity: 0.8;
          color: #8E5572;
        }
        
        .support-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.7em;
          background-color: #E91E63;
          color: white;
        }
        
        .support-badge.unsupported {
          background-color: rgba(233, 30, 99, 0.5);
        }
      </style>
      
      <button class="site-option ${support ? '' : 'disabled'}" data-site="${site}">
        <div class="site-info">
          <div class="site-name">${name}</div>
          <div class="site-url">${url}</div>
        </div>
        <div class="support-badge ${support ? 'supported' : 'unsupported'}">
          ${support ? '✓ 支持' : '✗ 暂不支持'}
        </div>
      </button>
    `;
  }
  
  addEventListeners() {
    const button = this.shadowRoot.querySelector('.site-option');
    const support = this.getAttribute('support') === 'true';
    
    if (support) {
      button.addEventListener('click', () => {
        const site = this.getAttribute('site');
        // 触发自定义事件，让父组件处理点击逻辑
        this.dispatchEvent(new CustomEvent('site-selected', {
          detail: { site },
          bubbles: true
        }));
      });
    }
  }
  
  // 当属性变化时重新渲染
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      this.addEventListeners();
    }
  }
}

customElements.define('site-option', SiteOption);

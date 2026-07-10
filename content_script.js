function makeInjectedCode(targetName) {
    const nameLiteral = JSON.stringify(targetName || "");
    return `/* injected by Kick Rewrite extension */\n` + (function () {
        // placeholder — replaced below
    }).toString(); // this will be overwritten in runtime by replacement
}

function buildCode(targetName) {
    const nameLiteral = JSON.stringify(targetName || "");
    return `
  (function(){
    'use strict';
  
    // ---------------- CONFIG ----------------
    const TARGET_USERNAME = ${nameLiteral};
    const CLICK_SELECTORS = ['button[title]', 'a[title]', '.inline.font-bold', '.username', '.username-btn'];
    const ACTIVE_WINDOW_MS = 1000;
    // ----------------------------------------
  
    let activeRewrite = null;
    const origFetch = window.fetch.bind(window);
    const origXHROpen = XMLHttpRequest.prototype.open;
    const channelRegex = /\\/api\\/v2\\/channels\\/([^\\/]+)\\/users\\/([^\\/?#\\/]+)/i;
  
    function armRewrite(clickedName){
      activeRewrite = {
        from: clickedName,
        to: TARGET_USERNAME,
        expires: Date.now() + ACTIVE_WINDOW_MS
      };
      setTimeout(()=> {
        if (activeRewrite && Date.now() >= activeRewrite.expires) activeRewrite = null;
      }, ACTIVE_WINDOW_MS + 50);
      console.log('[kick-rewrite] armed: ' + clickedName + ' → ' + TARGET_USERNAME + ' for ' + ACTIVE_WINDOW_MS + 'ms');
    }
  
    function rewriteUrlIfNeeded(url){
      if (!activeRewrite) return url;
      if (Date.now() > activeRewrite.expires) { activeRewrite = null; return url; }
      try {
        const s = typeof url === 'string' ? url : url.toString();
        const m = s.match(channelRegex);
        if (!m) return url;
        const [, channel, username] = m;
        if (activeRewrite.from && activeRewrite.from !== username) {
          return url;
        }
        const newUrl = s.replace(channelRegex, '/api/v2/channels/' + encodeURIComponent(channel) + '/users/' + encodeURIComponent(activeRewrite.to));
        console.log('[kick-rewrite] URL rewritten:\\n  ' + s + '\\n  → ' + newUrl);
        activeRewrite = null;
        return newUrl;
      } catch (e) {
        return url;
      }
    }
  
    window.fetch = function(input, init){
      try {
        if (activeRewrite) {
          if (typeof input === 'string' || input instanceof String) {
            input = rewriteUrlIfNeeded(input);
          } else if (input && input.url) {
            const newUrl = rewriteUrlIfNeeded(input.url);
            if (newUrl !== input.url) {
              input = new Request(newUrl, input);
            }
          }
        }
      } catch (e) {
        console.warn('kick-rewrite fetch rewrite error', e);
      }
      return origFetch(input, init);
    };
  
    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        if (activeRewrite) {
          const newUrl = rewriteUrlIfNeeded(url);
          if (newUrl !== url) {
            arguments[1] = newUrl;
          }
        }
      } catch(e){}
      return origXHROpen.apply(this, arguments);
    };
  
    const selector = CLICK_SELECTORS.join(',');
    function clickHandler(e){
      const el = e.target.closest(selector);
      if (!el) return;
      const clickedName = (el.getAttribute && el.getAttribute('title')) || (el.textContent && el.textContent.trim());
      if (!clickedName) return;
      armRewrite(clickedName);
    }
    document.addEventListener('click', clickHandler, true);
  
    window.__kickRewrite = {
      stop: function(){
        window.fetch = origFetch;
        XMLHttpRequest.prototype.open = origXHROpen;
        document.removeEventListener('click', clickHandler, true);
        activeRewrite = null;
        console.log('kick-rewrite stopped and original functions restored.');
      },
      setTarget: function(name){
        if (typeof name === 'string' && name.trim()) {
          console.log("Note: To change TARGET_USERNAME, re-run the script with TARGET_USERNAME = '" + name + "' or set variable manually.");
        }
      },
      _state: function(){ return {activeRewrite}; }
    };
  
    console.log('kick-rewrite active. Click a username to load the modal for', TARGET_USERNAME);
    console.log('To stop: window.__kickRewrite.stop()');
  })();
  `;
}

// inject code into page context by creating a <script> element
function injectToPage(code) {
    try {
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.textContent = code;
        (document.head || document.documentElement).appendChild(s);
        setTimeout(() => s.remove(), 1000);
    } catch (e) {
        console.error('kick-rewrite injection failed', e);
    }
}

// Load saved username and inject on page load
chrome.storage.local.get(['targetUsername'], function (result) {
    const name = result && result.targetUsername ? result.targetUsername : '';
    if (!name) {
        // nothing to inject
        return;
    }
    const code = buildCode(name);
    injectToPage(code);
});

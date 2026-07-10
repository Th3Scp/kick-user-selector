
function pageInject(targetName) {
    (function () {
        'use strict';
        const TARGET_USERNAME = targetName || '';
        const CLICK_SELECTORS = ['button[title]', 'a[title]', '.inline.font-bold', '.username', '.username-btn'];
        const ACTIVE_WINDOW_MS = 1000;

        let activeRewrite = null;
        const origFetch = window.fetch.bind(window);
        const origXHROpen = XMLHttpRequest.prototype.open;
        const channelRegex = /\/api\/v2\/channels\/([^\/]+)\/users\/([^\/?#\/]+)/i;

        function armRewrite(clickedName) {
            activeRewrite = { from: clickedName, to: TARGET_USERNAME, expires: Date.now() + ACTIVE_WINDOW_MS };
            setTimeout(() => { if (activeRewrite && Date.now() >= activeRewrite.expires) activeRewrite = null; }, ACTIVE_WINDOW_MS + 50);
            console.log('[kick-rewrite] armed: ' + clickedName + ' → ' + TARGET_USERNAME + ' for ' + ACTIVE_WINDOW_MS + 'ms');
        }

        function rewriteUrlIfNeeded(url) {
            if (!activeRewrite) return url;
            if (Date.now() > activeRewrite.expires) { activeRewrite = null; return url; }
            try {
                const s = typeof url === 'string' ? url : url.toString();
                const m = s.match(channelRegex);
                if (!m) return url;
                const [, channel, username] = m;
                if (activeRewrite.from && activeRewrite.from !== username) return url;
                const newUrl = s.replace(channelRegex, '/api/v2/channels/' + encodeURIComponent(channel) + '/users/' + encodeURIComponent(activeRewrite.to));
                console.log('[kick-rewrite] URL rewritten:\\n  ' + s + '\\n  → ' + newUrl);
                activeRewrite = null;
                return newUrl;
            } catch (e) { return url; }
        }

        window.fetch = function (input, init) {
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
            } catch (e) { console.warn('kick-rewrite fetch rewrite error', e); }
            return origFetch(input, init);
        };

        XMLHttpRequest.prototype.open = function (method, url) {
            try {
                if (activeRewrite) {
                    const newUrl = rewriteUrlIfNeeded(url);
                    if (newUrl !== url) { arguments[1] = newUrl; }
                }
            } catch (e) { }
            return origXHROpen.apply(this, arguments);
        };

        const selector = CLICK_SELECTORS.join(',');
        function clickHandler(e) {
            const el = e.target.closest(selector);
            if (!el) return;
            const clickedName = (el.getAttribute && el.getAttribute('title')) || (el.textContent && el.textContent.trim());
            if (!clickedName) return;
            armRewrite(clickedName);
        }
        document.addEventListener('click', clickHandler, true);

        window.__kickRewrite = {
            stop: function () {
                window.fetch = origFetch;
                XMLHttpRequest.prototype.open = origXHROpen;
                document.removeEventListener('click', clickHandler, true);
                activeRewrite = null;
                console.log('kick-rewrite stopped and original functions restored.');
            },
            setTarget: function (name) {
                if (typeof name === 'string' && name.trim()) {
                    console.log("Note: To change TARGET_USERNAME, re-run the script with TARGET_USERNAME = '" + name + "' or set variable manually.");
                }
            },
            _state: function () { return { activeRewrite }; }
        };

        console.log('kick-rewrite active. Click a username to load the modal for', TARGET_USERNAME);
        console.log('To stop: window.__kickRewrite.stop()');
    })();
}

// ---------------- UI wiring ----------------
const input = document.getElementById('username');
const saveBtn = document.getElementById('save');
const clearBtn = document.getElementById('clearBtn');
const helpBtn = document.getElementById('helpBtn');
const savedStatus = document.getElementById('savedStatus');

function setStatus(text, visible = true) {
    savedStatus.textContent = text;
    savedStatus.style.display = visible ? 'inline-block' : 'none';
}

// load saved username on open
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['targetUsername'], (res) => {
        const name = res && res.targetUsername ? res.targetUsername : '';
        if (name) {
            input.value = name;
            setStatus('Saved: ' + name, true);
        } else {
            setStatus('', false);
        }
        // enable/disable save based on content
        saveBtn.disabled = !input.value.trim();
    });
});

// enable/disable save when typing
input.addEventListener('input', () => {
    saveBtn.disabled = !input.value.trim();
});

// save & inject
saveBtn.addEventListener('click', async () => {
    const username = (input.value || '').trim();
    if (!username) return;
    chrome.storage.local.set({ targetUsername: username }, () => {
        setStatus('Saved: ' + username, true);
    });

    // inject into active tab (MAIN world)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
        alert('No active tab found.');
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: pageInject,
        args: [username]
    }, (res) => {
        if (chrome.runtime.lastError) {
            console.error('Injection failed:', chrome.runtime.lastError);
            alert('Injection failed: ' + chrome.runtime.lastError.message);
        } else {
            // give a quick visual tick
            saveBtn.disabled = true;
            setTimeout(() => saveBtn.disabled = false, 700);
        }
    });
});

// clear saved username
clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove('targetUsername', () => {
        input.value = '';
        setStatus('', false);
        saveBtn.disabled = true;
    });
});

// help opens a tiny inline doc (no external URL)
helpBtn.addEventListener('click', () => {
    alert('Usage:\\n1) Enter TARGET_USERNAME.\\n2) Click "Select" to inject into current tab.\\n3) Script will re-inject on page loads.\\nTo stop injection in page: open console and run window.__kickRewrite && window.__kickRewrite.stop()');
});

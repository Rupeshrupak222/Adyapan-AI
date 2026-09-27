export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('adyapan-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}

      /* Intercept setAttribute / setAttributeNode before any browser extension runs,
         so attributes like bis_skin_checked are never added to DOM nodes in the first place */
      try {
        var origSetAttr = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
          if (typeof name === 'string' && (name === 'bis_skin_checked' || name === 'bis_register' || name.indexOf('bis_') === 0)) {
            return;
          }
          return origSetAttr.apply(this, arguments);
        };

        var origSetAttrNode = Element.prototype.setAttributeNode;
        Element.prototype.setAttributeNode = function(attr) {
          if (attr && typeof attr.name === 'string' && (attr.name === 'bis_skin_checked' || attr.name.indexOf('bis_') === 0)) {
            return null;
          }
          return origSetAttrNode.apply(this, arguments);
        };
      } catch (e) {}

      /* Filter Next.js / React hydration error overlay for extension-injected bis_skin_checked */
      try {
        var origError = console.error;
        console.error = function() {
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            if (typeof arg === 'string' && (arg.indexOf('bis_skin_checked') !== -1 || arg.indexOf('bis_register') !== -1)) {
              return;
            }
          }
          return origError.apply(console, arguments);
        };

        var origWarn = console.warn;
        console.warn = function() {
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            if (typeof arg === 'string' && (arg.indexOf('bis_skin_checked') !== -1 || arg.indexOf('bis_register') !== -1)) {
              return;
            }
          }
          return origWarn.apply(console, arguments);
        };
      } catch (e) {}

      /* Suppress unhandled Chrome/Firefox extension errors (e.g. IDM / third-party extension injected scripts) */
      try {
        window.addEventListener('error', function(event) {
          var filename = (event.filename || '') + ' ' + ((event.error && event.error.stack) || '');
          var message = event.message || '';
          if (
            filename.indexOf('chrome-extension:') !== -1 ||
            filename.indexOf('moz-extension:') !== -1 ||
            message.indexOf('M_ID') !== -1 ||
            message.indexOf('200.js') !== -1 ||
            message.indexOf('bis_skin_checked') !== -1
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return true;
          }
        }, true);

        window.addEventListener('unhandledrejection', function(event) {
          var reason = event.reason;
          var stack = ((reason && reason.stack) || '') + ' ' + ((reason && reason.message) || String(reason || ''));
          if (
            stack.indexOf('chrome-extension:') !== -1 ||
            stack.indexOf('moz-extension:') !== -1 ||
            stack.indexOf('M_ID') !== -1 ||
            stack.indexOf('200.js') !== -1 ||
            stack.indexOf('bis_skin_checked') !== -1
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        }, true);
      } catch (e) {}

      /* Strip any existing Bitdefender/extension-injected attributes
         both immediately and continuously via MutationObserver */
      try {
        function stripBis(root) {
          root = root || document;
          var els = root.querySelectorAll ? root.querySelectorAll('[bis_skin_checked]') : [];
          for (var i = 0; i < els.length; i++) {
            els[i].removeAttribute('bis_skin_checked');
          }
        }
        stripBis(document);
        if (typeof MutationObserver !== 'undefined') {
          var obs = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
              var m = mutations[i];
              if (m.type === 'attributes' && m.attributeName && m.attributeName.indexOf('bis_') === 0) {
                m.target.removeAttribute(m.attributeName);
              } else if (m.type === 'childList') {
                for (var j = 0; j < m.addedNodes.length; j++) {
                  var node = m.addedNodes[j];
                  if (node.nodeType === 1) {
                    if (node.hasAttribute && node.hasAttribute('bis_skin_checked')) {
                      node.removeAttribute('bis_skin_checked');
                    }
                    stripBis(node);
                  }
                }
              }
            }
          });
          obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['bis_skin_checked'],
            childList: true,
            subtree: true
          });
          /* Disconnect after 10 s */
          setTimeout(function() { try { obs.disconnect(); } catch(e) {} }, 10000);
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}


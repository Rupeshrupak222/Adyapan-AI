export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('adyapan-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
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
            message.indexOf('200.js') !== -1
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
            stack.indexOf('200.js') !== -1
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        }, true);
      } catch (e) {}

      /* Strip Bitdefender/extension-injected bis_skin_checked attributes
         both immediately and continuously via MutationObserver so React
         hydration never sees a mismatch. */
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
              if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                m.target.removeAttribute('bis_skin_checked');
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
          /* Disconnect after React has hydrated — 8 s is plenty */
          setTimeout(function() { try { obs.disconnect(); } catch(e) {} }, 8000);
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}


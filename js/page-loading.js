(() => {
  const pending = () => document.querySelector('[data-page-pending]');
  let notice;
  let observer;

  function show(text) {
    const main = document.querySelector('main');
    if (!main) return;
    if (!notice?.isConnected) {
      notice = document.createElement('p');
      notice.dataset.pageLoadStatus = '';
      notice.className = 'section storage-note';
      notice.setAttribute('role', 'status');
      main.prepend(notice);
    }
    notice.textContent = text;
  }

  const timer = setTimeout(() => {
    if (!pending()) return;
    show('页面加载较慢，请稍候。');
    observer = new MutationObserver(() => {
      if (pending()) return;
      notice?.remove();
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, 800);

  function finish() {
    clearTimeout(timer);
    observer?.disconnect();
    if (pending()) show('页面内容加载失败，请刷新重试。');
    else notice?.remove();
  }

  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });
})();

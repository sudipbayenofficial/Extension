document.addEventListener('DOMContentLoaded', () => {
  const btnVisible = document.getElementById('btn-visible');
  const btnPartial = document.getElementById('btn-partial');
  const btnFull = document.getElementById('btn-full');

  btnVisible.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'capture_visible' });
    window.close();
  });

  btnFull.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'capture_full' });
    window.close();
  });

  btnPartial.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: 'capture_partial' });
        window.close();
      } else {
        console.error('No active tab found.');
      }
    } catch (error) {
      console.error('Error sending message to content script:', error);
    }
  });
});

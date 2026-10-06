if (typeof CHAT_URL === 'undefined') {
  document.body.innerHTML =
    '<p>No chat URL. Copy config.example.js to config.js, set CHAT_URL, and reload the extension.</p>';
} else {
  const iframe = document.createElement('iframe');
  iframe.src = CHAT_URL;
  iframe.allow = 'clipboard-write; microphone';
  document.body.appendChild(iframe);
}

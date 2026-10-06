# TestLink Chat Panel: Chrome extension

Opens the Dify agent's chat in Chrome's side panel, beside TestLink. The panel shows Dify's own chat page in an iframe, so the extension has no chat code. TestLink stays unchanged.

The structure follows [chatgpt-panel-chrome-extension](https://github.com/PeterPorzuczek/chatgpt-panel-chrome-extension) (MIT): `side_panel` points to a page with an iframe, and clicking the icon opens the panel. Dify sends no `X-Frame-Options` or `Content-Security-Policy` header, so the extension needs no header rules and only the `sidePanel` permission.

## Set up

1. Copy the agent's URL from Dify: **Access Point → Web App → Access URL**.
2. Copy `config.example.js` to `config.js`, and set `CHAT_URL` to that URL. Git ignores `config.js`.
3. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose this folder.
4. Pin **TestLink Chat Panel** from the puzzle-piece menu, open TestLink, and click the icon. The chat opens in the side panel.

After changing `config.js`, click the reload icon on the extension's card in `chrome://extensions`.

| File | Role |
|---|---|
| `manifest.json` | Manifest V3; declares the side panel and the `sidePanel` permission |
| `background.js` | Opens the side panel when you click the icon |
| `panel.html`, `panel.js` | The side panel: an iframe of `CHAT_URL` |
| `config.example.js` | Template for `config.js` |

# Chat panel agent for TestLink

## Verdict: PASS

A chat panel on the right of TestLink talks to an agent built in Dify. The agent reads and writes TestLink data through testlink-mcp, which mcpo serves as a REST API. TestLink and testlink-mcp stay unchanged.

The first version shows Dify's own chat in Chrome's side panel through [Chatbot Side Panel for Dify](https://github.com/dogkeeper886/chatbot-chrome-extension), our fork of the archived Dify Chatbot extension, so it needs no chat code. Page context and right-click requests are proposed below; an Apply button comes later.

![The full design: what is added and what stays unchanged](diagrams/verdict.png)

## Decided: start with Dify's own chat

The extension's side panel shows the agent's web app URL in an iframe. Dify's **Access Point → Embed Into Site** offers three other ways, and none fits: the iframe and chat bubble script need a change to TestLink's pages, and the Dify Chatbot Chrome extension is archived and injects its chat into the page, where it often fails to appear. Setup is in [dify/README.md](dify/README.md).

| Feature | First version | Proposed or later |
|---|---|---|
| Chat beside TestLink, streamed answers, follow-ups | ✔ Dify's chat | ✔ |
| Agent reads and writes TestLink through mcpo | ✔ | ✔ |
| "Review this": the agent sees the open test case | You type the ID, such as "review TLMCP-12" | Proposed: the right-clicked test case's ID goes into the prompt |
| Right-click request | ✗ | Proposed: fills the chat box with a saved prompt |
| Apply button before a write | The agent proposes, and writes after you reply "apply" | Later: a separate write-only workflow |

The first version has one agent with read tools plus `create_test_case` and `update_test_case`, and no delete tools. Its prompt tells it to show each change and wait for "apply". This rule is a prompt, not a lock: the model can still skip it, so the later Apply workflow stays in the design.

| Risk | Mitigation |
|---|---|
| The web app URL is a public share link; anyone with it can use the agent | Share it only on the trusted network, like the TestLink stack itself |
| The agent writes without an Apply button | No delete tools, and a prompt rule to propose first |

## Proposed: page context and right-click through the fork

Right-click on TestLink fills the Dify chat box with a prompt that names what you clicked, such as "Review step 3 of TLMCP-12". You read it and press Enter. The extension never presses Send, so nothing reaches the agent, which can write to TestLink, without your review.

### What popular side panel extensions do

| Project | Chat UI | Reads the page | Gets text into the chat |
|---|---|---|---|
| [insidebar-ai](https://github.com/xiaolai/insidebar-ai) (MIT, most popular) | Chat sites in an iframe, as ours | The right-click's selection; else the page through Readability.js | A content script inside the iframe fills the chat box; the user presses Enter |
| [SideMagic](https://github.com/enciyo/SideMagic) (MIT) | iframe | Page content, sent as a file | A content script inside the iframe |
| [llm-sidebar-with-context](https://github.com/google/llm-sidebar-with-context) (Google, Apache-2.0) | Its own UI on LLM APIs | `chrome.scripting.executeScript`, with one reader per kind of site | Not needed |

Three findings shape the design:

- Content scripts with `all_frames: true` run inside the side panel's iframe, so the extension can fill Dify's chat box.
- Dify offers no other way in: its `postMessage` protocol only toggles the expand button, and URL parameters only set input variables when a new conversation starts.
- A reader per kind of site, as in Google's extension, keeps site rules apart from the generic code.

### Flow

```
TestLink tab (all frames)            extension                          side panel
┌────────────────────────┐   ┌──────────────────────────────┐   ┌─────────────────────────┐
│ TestLink reader:       │──▶│ right-click: Send to Dify ▸  │──▶│ Dify chat (iframe)      │
│ test case ID, step,    │   │   Selection / Page /         │   │  content script fills   │
│ part clicked, selection│   │   saved prompts              │   │  the chat box; you      │
└────────────────────────┘   │ fills the prompt's slots     │   │  press Enter            │
                             │ sidePanel.open + message     │   └─────────────────────────┘
                             └──────────────────────────────┘     fallback: clipboard
```

1. On a click of **Send to Dify ▸**, the extension opens the side panel. A menu click counts as a user gesture, which `sidePanel.open` needs.
2. It builds the text from the clicked item: the selection and page URL from the click itself, or a saved prompt with slots such as `{selection}`, `{url}`, `{tcase_id}` and `{step}`, filled by the page reader.
3. The side panel posts the text to its Dify iframe. The content script there puts it in the chat box and fires an `input` event so Dify's React code sees it.
4. If the chat box is not found, for example after a Dify update, the text goes to the clipboard instead.

A saved prompt that names a Dify agent skill, such as "Use the test case review skill on {tcase_id}", is how the menu runs a skill; the agent picks skills from the message.

### What is different for Dify

insidebar-ai lists each chat site in its manifest, such as `chatgpt.com/*`. A Dify server has whatever address its owner gives it, so:

| Need | How |
|---|---|
| Run the content script on the user's Dify | When the ChatBot URL is saved, ask for that address with `chrome.permissions.request`, then register the script with `chrome.scripting.registerContentScripts` |
| Find the chat box | One selector for Dify's chat box, plus the clipboard fallback |
| Read TestLink, which uses frames | `activeTab` and `chrome.scripting.executeScript` with `allFrames: true` |

### Where each part lives

| Part | Repository |
|---|---|
| Right-click menu, saved prompts, filling the chat box, a generic reader (selection, title, URL) | The fork, [chatbot-chrome-extension](https://github.com/dogkeeper886/chatbot-chrome-extension): useful to any Dify user |
| TestLink reader (`{tcase_id}`, `{step}`), from the `tl-classic` markers in "a menu per item" below | This repository: TestLink-specific |

| Risk | Mitigation |
|---|---|
| A Dify update changes the chat box | One selector to update, and the clipboard fallback |
| The extension can run on the Dify address | It asks only for the saved ChatBot URL's address, and only when you save it |
| A prompt runs before you see it | The extension fills the chat box and never presses Send |

## Later: the agent works through two channels

| Channel | What it gives the agent | Used for |
|---|---|---|
| **The page on the left**, through the extension's helper script | What you are looking at: the open test case, your selection, your clicks | Understanding "this", "here" and "the one I clicked" |
| **testlink-mcp**, through mcpo | The real TestLink data: read, create, update and delete | Doing the work: review, revise, create |

When you type "review this", the page tells the agent that "this" is TC-12. The Dify agent reads TC-12 through mcpo and streams its answer into the panel. A write such as a revision comes back as a proposal. A separate Dify workflow writes it only after you click **Apply**, and then the work area reloads.

![Sequence of a chat request](diagrams/sequence.png)

The panel is a normal web page, so it can:

- **take input**: a chat box, follow-up replies, and Apply and Discard buttons;
- **stream output**: each line appears as the agent writes it, with a Cancel button;
- **follow the page**: when you click another test case, the panel shows which one is selected.

Its one limit is width. A long side-by-side comparison opens in a new tab.

## Later: right-click is a shortcut

The chat panel is the main way in. Right-click on a test case opens the panel with a request already filled in, such as "Review TC-12", so common requests take one click. Anything else is typed into the chat.

## Later: our own browser extension, Chrome first

The extension calls the Dify API over HTTP, so it needs no local program. It is preferred over a Tampermonkey script because only an extension gets a side panel.

Chrome comes first. It is installed here, and it has every API the design uses: `contextMenus`, `sidePanel`, and `fetch` with `host_permissions` for the TestLink and Dify URLs. Install it with Developer mode and "Load unpacked" at `chrome://extensions`.

Other browsers come later:

- **Edge, Brave, Vivaldi and Opera** run the same code.
- **Firefox** needs `sidebar_action` in place of `sidePanel`.
- **Safari** is out of scope, because it needs a macOS app wrapper built with Xcode.

![Chrome first, other browsers later](diagrams/browser.png)

## Decided: Dify as the backend

The agent is built in Dify, an open-source LLM app platform, so the backend needs no agent code. The review task is simple, so a light model is enough; Dify can use the local Ollama or a hosted model.

With our own extension, the panel talks to two Dify apps:

| App | Dify API | Tools | Role |
|---|---|---|---|
| **Review agent** (chat app) | `POST /v1/chat-messages` | Read-only: `read_test_case`, `list_test_cases_in_suite`, `get_requirement` | Answers, and returns any change as a proposal |
| **Apply** (workflow app) | `POST /v1/workflows/run` | `update_test_case` only | Runs only when you click Apply, with the proposal as input |

The review agent cannot write by mistake, because it lacks the write tool.

| Panel need | Dify feature |
|---|---|
| Streaming output | `response_mode: "streaming"` returns server-sent events: `message`, `agent_thought` for tool calls, and `message_end` |
| Follow-up chat | `conversation_id` from the first reply, sent with the next message |
| Page context | `inputs: {tcase_id, part, step}`, used as variables in the app's prompt |
| Access | The app's API key, sent as `Authorization: Bearer` |

| Risk | Mitigation |
|---|---|
| Dify runs about 10 containers and recommends at least 2 CPUs and 4 GB RAM | Run one shared Dify for the team |
| Small local models can be unreliable at calling tools | Test the review task with the chosen model first |
| The extension stores the Dify API key, and anyone with it can use the app | Run on a trusted network, like the TestLink stack itself |

## Decided: mcpo serves testlink-mcp to Dify

testlink-mcp speaks MCP over stdio only (`StdioServerTransport`, `src/index.ts:1549`). mcpo runs it as a child process and serves each tool as a REST endpoint, such as `POST /testlink/read_test_case`, with an OpenAPI schema at `/testlink/openapi.json`. Dify imports that schema as a custom tool. The `/testlink` prefix is the server name in mcpo's config file.

testlink-mcp is not on npm yet (testlink-mcp issue #129), so the image starts from the official mcpo image and copies in the built server from the published testlink-mcp image. testlink-mcp itself stays unchanged. The setup is in [mcpo/](mcpo/).

```dockerfile
FROM ghcr.io/open-webui/mcpo:main
COPY --from=dogkeeper886/testlink-mcp:1.6.0 /app /opt/testlink-mcp
COPY config.json /etc/mcpo/config.json
EXPOSE 8000
ENTRYPOINT ["sh", "-c", "exec mcpo --host 0.0.0.0 --port 8000 --api-key \"$MCPO_API_KEY\" --config /etc/mcpo/config.json"]
```

`config.json` starts `node /opt/testlink-mcp/dist/index.js`. mcpo passes its environment to the child, so `TESTLINK_URL` and `TESTLINK_API_KEY` go in `.env` with `MCPO_API_KEY`, and `docker compose up` runs it. `TESTLINK_URL` is the TestLink base URL; testlink-mcp adds `/lib/api/xmlrpc/v1/xmlrpc.php`. In Dify, add the schema under **Integrations → Swagger API as Tool**, and set `MCPO_API_KEY` as a Bearer key; [dify/README.md](dify/README.md) has the steps. Each Dify app then picks only the tools it needs.

The mcpo image is used as published because it pins `mcp` and `mcpo` versions that work together; `pip install mcpo` on its own pulled `mcp` 2.x, which mcpo 0.0.20 fails to import.

When testlink-mcp adds or changes tools, re-import the schema in Dify.

## Later: a menu per item

The right-click menu changes with what you click. A script finds which part of the page was clicked, draws a menu for that part, and each item opens the chat panel with a precise request, such as "Review step 3 of TC-12".

The proposal above starts simpler: Chrome's own menu with fixed items, and a TestLink reader that records which part was clicked and fills `{tcase_id}` and `{step}`. The markers below serve that reader first, and a menu drawn per item stays a later option.

TestLink's `tl-classic` templates already mark each part:

| Part | Marker in the page | Source |
|---|---|---|
| Test case or suite in the tree | `testlink_node_type` and the node ID | `gui/javascript/treebyloader.js` |
| Summary | `<div id="summary">` | `inc_tcbody.tpl:46` |
| Preconditions | `<div class="preconditionsCONTAINER">` | `inc_tcbody.tpl:61` |
| A step | `<span id="tcstep_<step id>">`, with actions and expected result in the next cells | `steps_horizontal.inc.tpl:81-93` |

![Menu per item](diagrams/menu.png)

The script draws its own menu. Chrome's built-in menu (`chrome.contextMenus`) is set up in advance, so it cannot change reliably from one click to the next.

| Risk | Mitigation |
|---|---|
| TestLink has two page designs, `tl-classic` and `dashio`, with different markup | Support `tl-classic` first |
| Our menu hides the browser's own menu, including "Copy" | Show our menu only on recognized parts; Shift + right-click opens the browser menu |
| The tree and the test case view are in separate frames | Run the script in all frames |
| A TestLink upgrade changes the markup | Keep the detection rules in one small table |

## Next

1. In the fork, build the bridge: right-click on selected text fills the Dify chat box, through a content script registered for the saved ChatBot URL.
2. Add saved prompts and the generic reader to the fork.
3. In this repository, add the TestLink reader, starting with a test case in the tree, the test case name, and a step.

---

Diagram sources are the `.svg` files in [diagrams/](diagrams/). To re-render them to PNG:

```bash
for f in diagrams/*.svg; do rsvg-convert -z 2 "$f" -o "${f%.svg}.png"; done
```

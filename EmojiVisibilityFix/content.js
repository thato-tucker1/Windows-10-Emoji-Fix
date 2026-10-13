(() => {
  const EMOJIS = [
    { emoji: "\u{1F979}", image: "U+1F979.png" },
    { emoji: "\u{1FAE1}", image: "U+1FAE1.png" },
    { emoji: "\u{1FAE0}", image: "U+1FAE0.png" },
    { emoji: "\u{1FA77}", image: "U+1FA77.png" },
    { emoji: "\u{1FAE9}", image: "U+1FAE9.png" }
  ];

  const IMAGE_URLS = new Map(
    EMOJIS.map(item => [
      item.emoji,
      chrome.runtime.getURL(item.image)
    ])
  );

  const MARKER = "emoji-visibility-fix";

  function makeImage(emoji) {
    const img = document.createElement("img");
    img.src = IMAGE_URLS.get(emoji);
    img.alt = emoji;
    img.title = emoji;
    img.dataset.emojiVisibilityFix = "true";
    img.style.cssText = [
      "display:inline-block",
      "width:1em",
      "height:1em",
      "object-fit:contain",
      "vertical-align:-0.15em"
    ].join(";");
    return img;
  }

  function replaceInTextNode(node) {
    if (!node.nodeValue) return;

    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,textarea,input,code,pre,[contenteditable='true']")) return;

    const text = node.nodeValue;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let found = false;

    const emojiPattern = /[\u{1F979}\u{1FAE1}\u{1FAE0}\u{1FA77}\u{1FAE9}]/gu;
    let match;

    while ((match = emojiPattern.exec(text)) !== null) {
      found = true;

      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      fragment.appendChild(makeImage(match[0]));
      lastIndex = match.index + match[0].length;
    }

    if (!found) return;

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  }

  function scan(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceInTextNode);
  }

  let scheduled = false;

  const observer = new MutationObserver(records => {
    if (scheduled) return;
    scheduled = true;

    queueMicrotask(() => {
      scheduled = false;

      for (const record of records) {
        if (record.type === "characterData") {
          replaceInTextNode(record.target);
        }

        for (const added of record.addedNodes || []) {
          if (added.nodeType === Node.TEXT_NODE) {
            replaceInTextNode(added);
          } else if (
            added.nodeType === Node.ELEMENT_NODE &&
            !added.closest?.(`[data-${MARKER}]`)
          ) {
            scan(added);
          }
        }
      }
    });
  });

  function start() {
    scan(document.body);

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
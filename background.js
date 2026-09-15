// cite-log - Background Service Worker (Manifest V3)

// 1. Extension Lifecycle & Context Menu Setup
chrome.runtime.onInstalled.addListener(async () => {
  // Remove existing menu items if any to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "cite-log-collect",
      title: "cite-log: 인용 수집하기",
      contexts: ["selection"]
    });
  });

  // Initialize default configuration
  const current = await chrome.storage.local.get([
    "saveDirectory",
    "fileFormat",
    "autoDownload",
    "citations"
  ]);

  await chrome.storage.local.set({
    saveDirectory: current.saveDirectory || "cite-log",
    fileFormat: current.fileFormat || "md",
    autoDownload: current.autoDownload !== undefined ? current.autoDownload : true,
    citations: current.citations || []
  });

  updateBadgeCount();
});

// Update badge count with total citations
async function updateBadgeCount() {
  try {
    const { citations = [] } = await chrome.storage.local.get("citations");
    if (citations.length > 0) {
      await chrome.action.setBadgeText({ text: String(citations.length) });
      await chrome.action.setBadgeBackgroundColor({ color: "#4F46E5" });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (err) {
    console.error("Failed to update badge:", err);
  }
}

// 2. Handle Context Menu Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "cite-log-collect" && tab && tab.id) {
    const payload = {
      action: "OPEN_CITE_MODAL",
      data: {
        selectionText: info.selectionText || "",
        pageUrl: tab.url || "",
        pageTitle: tab.title || ""
      }
    };

    try {
      await chrome.tabs.sendMessage(tab.id, payload);
    } catch (err) {
      // Content script may not be injected if tab was opened before extension installation
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["content.css"]
        });
        await chrome.tabs.sendMessage(tab.id, payload);
      } catch (injectErr) {
        console.error("Failed to open cite-log modal:", injectErr);
      }
    }
  }
});

// 3. Helper to format citation into Markdown / Text
function formatCitationFile(item, format = "md") {
  const dateStr = item.datetime || new Date().toLocaleString("ko-KR");
  const tagsStr = (item.tags || []).map(t => `#${t.replace(/^#/, "")}`).join(" ");

  if (format === "md") {
    const noteSection = item.note ? `\n### 📝 메모 & 코멘트\n${item.note}\n` : "";
    return `---
title: "${(item.title || "").replace(/"/g, '\\"')}"
source: "${item.url || ""}"
date: "${dateStr}"
project: "${item.project || "일반"}"
tags: [${(item.tags || []).map(t => `"${t}"`).join(", ")}]
---

# ${item.title || "Untitled Citation"}

> ${item.quote.split("\n").join("\n> ")}
${noteSection}`;
  } else if (format === "json") {
    return JSON.stringify(item, null, 2);
  } else {
    // Plain text format
    return `========================================
[cite-log 인용 기록]
제목: ${item.title || "제목 없음"}
일시: ${dateStr}
출처: ${item.url}
프로젝트: ${item.project || "일반"}
태그: ${tagsStr || "없음"}
========================================

[인용 본문]
${item.quote}

[메모 / 활용 아이디어]
${item.note || "(없음)"}
`;
  }
}

// Helper to sanitize filenames
function sanitizeFilename(name) {
  return name
    .replace(/[\\/*?:"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}

// 4. Message Passing Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === "SAVE_CITATION") {
        const item = message.data;
        const { saveDirectory = "cite-log", fileFormat = "md", autoDownload = true, citations = [] } =
          await chrome.storage.local.get(["saveDirectory", "fileFormat", "autoDownload", "citations"]);

        const ext = fileFormat === "json" ? "json" : (fileFormat === "txt" ? "txt" : "md");
        
        // Generate filename: YYYYMMDD_HHMMSS_Title.ext
        const now = new Date();
        const datePrefix = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const titleSlug = sanitizeFilename(item.project ? `${item.project}_${item.title}` : item.title);
        const filename = `${datePrefix}_${titleSlug || "citation"}.${ext}`;

        const fileContent = formatCitationFile(item, ext);

        // Auto download file to target folder if enabled
        if (autoDownload) {
          const base64Content = btoa(unescape(encodeURIComponent(fileContent)));
          const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;
          const cleanDir = (saveDirectory || "cite-log").replace(/\/+$/, "");
          const fullPath = `${cleanDir}/${filename}`;

          await chrome.downloads.download({
            url: dataUrl,
            filename: fullPath,
            conflictAction: "uniquify",
            saveAs: false
          });
        }

        // Store item in local storage
        item.filename = filename;
        item.downloaded = autoDownload;
        citations.unshift(item); // prepend newest first
        await chrome.storage.local.set({ citations });

        // Update badge count
        await updateBadgeCount();

        sendResponse({ success: true, filename });
      } else if (message.action === "GET_SETTINGS") {
        const settings = await chrome.storage.local.get([
          "saveDirectory",
          "fileFormat",
          "autoDownload"
        ]);
        sendResponse({ success: true, settings });
      } else if (message.action === "OPEN_DASHBOARD") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep channel open for async response
});

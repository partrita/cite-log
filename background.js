// cite-log - Background Service Worker (Manifest V3)
importScripts("db.js");

// 1. Extension Lifecycle & Context Menu Setup
chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "cite-log-collect",
      title: "cite-log: 인용 수집하기",
      contexts: ["selection"]
    });
  });

  // Migrate legacy storage data to IndexedDB if exists
  await migrateFromStorageIfNeeded();

  // Initialize default configuration
  const current = await chrome.storage.local.get([
    "saveDirectory",
    "fileFormat",
    "autoDownload",
    "storageMode" // "individual" | "daily" | "project"
  ]);

  await chrome.storage.local.set({
    saveDirectory: current.saveDirectory || "cite-log",
    fileFormat: current.fileFormat || "md",
    autoDownload: current.autoDownload !== undefined ? current.autoDownload : true,
    storageMode: current.storageMode || "individual"
  });

  await updateBadgeCount();
});

// Update badge count with total citations
async function updateBadgeCount() {
  try {
    const count = await dbGetCount();
    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
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
      // Content script fallback injection
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

// 3. Helpers to format citations
function formatCitationFile(item, format = "md") {
  const dateStr = item.datetime || new Date().toLocaleString("ko-KR");

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
    const tagsStr = (item.tags || []).map(t => `#${t.replace(/^#/, "")}`).join(" ");
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

// Format Daily Log Document
function formatDailyLogFile(dateOnly, citationsForToday) {
  let doc = `# 📅 ${dateOnly} 인용 로그 (Daily Log)\n\n`;
  doc += `> 수집된 인용: ${citationsForToday.length}개\n\n`;
  doc += `---\n\n`;

  citationsForToday.forEach((c, idx) => {
    const timeOnly = c.datetime ? c.datetime.split(" ")[1] : "";
    const tagsStr = (c.tags || []).map(t => `#${t.replace(/^#/, "")}`).join(" ");
    doc += `## ${idx + 1}. ${c.title || "참고 문헌"} [${timeOnly}]\n\n`;
    doc += `> ${c.quote.split("\n").join("\n> ")}\n\n`;
    if (c.note) {
      doc += `### 📝 메모 & 코멘트\n${c.note}\n\n`;
    }
    doc += `- **출처**: [${c.domain || c.url}](${c.url})\n`;
    doc += `- **프로젝트**: ${c.project || "일반"}${tagsStr ? ` | **태그**: ${tagsStr}` : ""}\n\n`;
    doc += `---\n\n`;
  });

  return doc;
}

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
        const {
          saveDirectory = "cite-log",
          fileFormat = "md",
          autoDownload = true,
          storageMode = "individual"
        } = await chrome.storage.local.get([
          "saveDirectory",
          "fileFormat",
          "autoDownload",
          "storageMode"
        ]);

        const ext = fileFormat === "json" ? "json" : (fileFormat === "txt" ? "txt" : "md");
        const cleanDir = (saveDirectory || "cite-log").replace(/\/+$/, "");

        // 1. Save to high-performance IndexedDB
        await dbSaveCitation(item);

        // 2. Prepare file & auto download
        let filename = "";
        let conflictAction = "uniquify";
        let fileContent = "";

        const now = new Date();
        const datePrefix = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const titleSlug = sanitizeFilename(item.project ? `${item.project}_${item.title}` : item.title);

        if (storageMode === "daily") {
          const todayItems = await dbGetCitationsByDate(item.dateOnly);
          fileContent = formatDailyLogFile(item.dateOnly, todayItems);
          filename = `${cleanDir}/${item.dateOnly}.${ext}`;
          conflictAction = "overwrite";
        } else if (storageMode === "project") {
          const projSlug = sanitizeFilename(item.project || "일반");
          fileContent = formatCitationFile(item, ext);
          filename = `${cleanDir}/${projSlug}/${datePrefix}_${titleSlug || "citation"}.${ext}`;
          conflictAction = "uniquify";
        } else {
          // individual
          fileContent = formatCitationFile(item, ext);
          filename = `${cleanDir}/${datePrefix}_${titleSlug || "citation"}.${ext}`;
          conflictAction = "uniquify";
        }

        if (autoDownload) {
          const base64Content = btoa(unescape(encodeURIComponent(fileContent)));
          const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;

          await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            conflictAction: conflictAction,
            saveAs: false
          });
        }

        item.filename = filename;
        item.downloaded = autoDownload;

        // 3. Update cached stats for instant popup display
        const totalCount = await dbGetCount();
        const recentItems = await dbGetAllCitations();
        await chrome.storage.local.set({
          totalCount: totalCount,
          recentCitations: recentItems.slice(0, 5)
        });

        await updateBadgeCount();

        sendResponse({ success: true, filename });
      } else if (message.action === "GET_SETTINGS") {
        const settings = await chrome.storage.local.get([
          "saveDirectory",
          "fileFormat",
          "autoDownload",
          "storageMode"
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
  return true;
});

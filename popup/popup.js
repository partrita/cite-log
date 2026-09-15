// cite-log - Popup Script (Optimized with IndexedDB & Cache)

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Instant Cache Render
  const cached = await chrome.storage.local.get(["totalCount", "recentCitations"]);
  let citations = cached.recentCitations || [];
  let totalCount = cached.totalCount !== undefined ? cached.totalCount : null;

  // If cache is empty or incomplete, query IndexedDB directly
  if (totalCount === null || citations.length === 0) {
    try {
      totalCount = await dbGetCount();
      citations = (await dbGetAllCitations()).slice(0, 5);
      await chrome.storage.local.set({ totalCount, recentCitations: citations });
    } catch (e) {
      console.warn("IndexedDB load fallback:", e);
      citations = [];
      totalCount = 0;
    }
  }

  // Update Stats
  document.getElementById("total-badge").textContent = `${totalCount}개`;
  document.getElementById("stat-citations").textContent = totalCount;

  const projectsSet = new Set(citations.map(c => c.project || "일반"));
  document.getElementById("stat-projects").textContent = projectsSet.size;

  // Render recent items
  const listEl = document.getElementById("recent-list");
  if (citations.length > 0) {
    listEl.innerHTML = "";

    citations.forEach(item => {
      const itemEl = document.createElement("div");
      itemEl.className = "citation-item";

      const timeStr = item.datetime ? item.datetime.slice(5, 16) : "";
      const quoteText = item.quote ? item.quote : "";
      const domainText = item.domain || "웹페이지";
      const projectText = item.project || "일반";

      itemEl.innerHTML = `
        <div class="citation-item-header">
          <span class="project-tag">${escapeHtml(projectText)}</span>
          <span class="item-date">${escapeHtml(timeStr)}</span>
        </div>
        <div class="item-quote">"${escapeHtml(quoteText)}"</div>
        <div class="item-footer">
          <span class="item-domain">🌐 ${escapeHtml(domainText)}</span>
          <button class="btn-copy" data-id="${item.id}">복사</button>
        </div>
      `;

      itemEl.querySelector(".btn-copy").addEventListener("click", async (e) => {
        e.stopPropagation();
        const copyBtn = e.target;
        const mdText = `> ${item.quote}\n\n— [${item.title}](${item.url}) (${item.datetime})`;
        await navigator.clipboard.writeText(mdText);
        copyBtn.textContent = "완료!";
        copyBtn.style.color = "#16a34a";
        setTimeout(() => {
          copyBtn.textContent = "복사";
          copyBtn.style.color = "";
        }, 1500);
      });

      listEl.appendChild(itemEl);
    });
  }

  // Navigation handlers
  document.getElementById("btn-open-dashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
  });

  document.getElementById("btn-options").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html#settings") });
  });
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

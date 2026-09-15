// cite-log - Dashboard & Collage Studio Logic

document.addEventListener("DOMContentLoaded", async () => {
  // Application State
  let citations = [];
  const selectedIds = new Set();
  const filterState = {
    search: "",
    project: null,
    tag: null
  };
  let currentSettings = {
    saveDirectory: "cite-log",
    fileFormat: "md",
    autoDownload: true
  };

  // DOM Elements
  const libraryPane = document.getElementById("pane-library");
  const collagePane = document.getElementById("pane-collage");
  const settingsPane = document.getElementById("pane-settings");
  const navButtons = document.querySelectorAll(".nav-item");

  const citationsContainer = document.getElementById("citations-container");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const btnClearSearch = document.getElementById("btn-clear-search");
  const filterStatus = document.getElementById("filter-status");
  const filterStatusText = document.getElementById("filter-status-text");
  const btnResetFilters = document.getElementById("btn-reset-filters");

  const sidebarTotalCount = document.getElementById("sidebar-total-count");
  const sidebarSelectedCount = document.getElementById("sidebar-selected-count");
  const sidebarSaveDir = document.getElementById("sidebar-save-dir");
  const sidebarProjects = document.getElementById("sidebar-projects");
  const sidebarTags = document.getElementById("sidebar-tags");

  const btnSelectAll = document.getElementById("btn-select-all");
  const btnOpenCollageTab = document.getElementById("btn-open-collage-tab");
  const selectedBadge = document.getElementById("selected-badge");
  const btnExportJson = document.getElementById("btn-export-json");

  // Collage Elements
  const collageSelectionCount = document.getElementById("collage-selection-count");
  const collageSelectedItems = document.getElementById("collage-selected-items");
  const btnClearSelection = document.getElementById("btn-clear-selection");
  const collageStyle = document.getElementById("collage-style");
  const collageOutput = document.getElementById("collage-output");
  const btnCopyCollage = document.getElementById("btn-copy-collage");
  const btnDownloadCollage = document.getElementById("btn-download-collage");

  // Settings Elements
  const settingSaveDir = document.getElementById("setting-save-dir");
  const settingFormat = document.getElementById("setting-format");
  const settingAutoDownload = document.getElementById("setting-auto-download");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const btnBackupExport = document.getElementById("btn-backup-export");
  const inputBackupFile = document.getElementById("input-backup-file");
  const btnClearAll = document.getElementById("btn-clear-all");

  // 1. Initialize
  await loadData();
  handleHashNavigation();

  window.addEventListener("hashchange", handleHashNavigation);

  function handleHashNavigation() {
    const hash = window.location.hash.replace("#", "");
    if (hash === "settings") {
      switchTab("settings");
    } else if (hash === "collage") {
      switchTab("collage");
    } else {
      switchTab("library");
    }
  }

  // Switch Tab
  function switchTab(tabId) {
    navButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    libraryPane.classList.toggle("active", tabId === "library");
    collagePane.classList.toggle("active", tabId === "collage");
    settingsPane.classList.toggle("active", tabId === "settings");

    if (tabId === "collage") {
      renderCollage();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      window.location.hash = tab;
      switchTab(tab);
    });
  });

  // 2. Load Data from Chrome Storage
  async function loadData() {
    const data = await chrome.storage.local.get([
      "citations",
      "saveDirectory",
      "fileFormat",
      "autoDownload"
    ]);

    citations = data.citations || [];
    currentSettings = {
      saveDirectory: data.saveDirectory || "cite-log",
      fileFormat: data.fileFormat || "md",
      autoDownload: data.autoDownload !== undefined ? data.autoDownload : true
    };

    // Update settings UI
    settingSaveDir.value = currentSettings.saveDirectory;
    settingFormat.value = currentSettings.fileFormat;
    settingAutoDownload.checked = currentSettings.autoDownload;
    sidebarSaveDir.textContent = currentSettings.saveDirectory;

    updateUI();
  }

  // Update UI and re-render
  function updateUI() {
    sidebarTotalCount.textContent = citations.length;
    updateSelectionBadges();
    renderSidebarFilters();
    renderCitations();
    if (collagePane.classList.contains("active")) {
      renderCollage();
    }
  }

  function updateSelectionBadges() {
    const count = selectedIds.size;
    sidebarSelectedCount.textContent = count;
    selectedBadge.textContent = count;
  }

  // 3. Render Sidebar Projects and Tags
  function renderSidebarFilters() {
    // Projects
    const projectCounts = {};
    citations.forEach(c => {
      const p = c.project || "일반";
      projectCounts[p] = (projectCounts[p] || 0) + 1;
    });

    sidebarProjects.innerHTML = "";
    // "전체 보기"
    const allItem = document.createElement("div");
    allItem.className = `project-filter-item ${filterState.project === null ? "active" : ""}`;
    allItem.innerHTML = `<span>전체 프로젝트</span> <span class="nav-count">${citations.length}</span>`;
    allItem.addEventListener("click", () => {
      filterState.project = null;
      updateUI();
    });
    sidebarProjects.appendChild(allItem);

    Object.entries(projectCounts).forEach(([project, count]) => {
      const el = document.createElement("div");
      el.className = `project-filter-item ${filterState.project === project ? "active" : ""}`;
      el.innerHTML = `<span>${escapeHtml(project)}</span> <span class="nav-count">${count}</span>`;
      el.addEventListener("click", () => {
        filterState.project = filterState.project === project ? null : project;
        updateUI();
      });
      sidebarProjects.appendChild(el);
    });

    // Tags
    const tagCounts = {};
    citations.forEach(c => {
      (c.tags || []).forEach(t => {
        const clean = t.replace(/^#/, "");
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });

    sidebarTags.innerHTML = "";
    Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([tag, count]) => {
        const pill = document.createElement("span");
        pill.className = `tag-pill ${filterState.tag === tag ? "active" : ""}`;
        pill.textContent = `#${tag} (${count})`;
        pill.addEventListener("click", () => {
          filterState.tag = filterState.tag === tag ? null : tag;
          updateUI();
        });
        sidebarTags.appendChild(pill);
      });
  }

  // 4. Render Citations List
  function renderCitations() {
    const q = filterState.search.toLowerCase().trim();
    const filtered = citations.filter(item => {
      if (filterState.project && (item.project || "일반") !== filterState.project) {
        return false;
      }
      if (filterState.tag) {
        const hasTag = (item.tags || []).some(t => t.replace(/^#/, "") === filterState.tag);
        if (!hasTag) return false;
      }
      if (q) {
        const matchQuote = (item.quote || "").toLowerCase().includes(q);
        const matchNote = (item.note || "").toLowerCase().includes(q);
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchUrl = (item.url || "").toLowerCase().includes(q);
        const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchQuote && !matchNote && !matchTitle && !matchUrl && !matchTags) {
          return false;
        }
      }
      return true;
    });

    // Filter indicator
    if (filterState.project || filterState.tag || q) {
      filterStatus.style.display = "flex";
      const parts = [];
      if (filterState.project) parts.push(`프로젝트: ${filterState.project}`);
      if (filterState.tag) parts.push(`태그: #${filterState.tag}`);
      if (q) parts.push(`검색어: "${q}"`);
      filterStatusText.textContent = `필터 적용: ${parts.join(" | ")} (총 ${filtered.length}건)`;
    } else {
      filterStatus.style.display = "none";
    }

    if (citations.length === 0) {
      emptyState.style.display = "block";
      citationsContainer.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    citationsContainer.style.display = "grid";
    citationsContainer.innerHTML = "";

    if (filtered.length === 0) {
      citationsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
          검색 조건에 맞는 인용 기록이 없습니다.
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement("div");
      const isSelected = selectedIds.has(item.id);
      card.className = `citation-card ${isSelected ? "selected" : ""}`;

      const tagsHtml = (item.tags || []).map(t => `<span class="card-tag">#${escapeHtml(t.replace(/^#/, ""))}</span>`).join("");
      const noteHtml = item.note ? `
        <div class="card-note">
          <b>💭 메모:</b> ${escapeHtml(item.note)}
        </div>
      ` : "";

      card.innerHTML = `
        <div class="card-top">
          <label class="card-checkbox-label">
            <input type="checkbox" class="citation-check" data-id="${item.id}" ${isSelected ? "checked" : ""} />
            <span class="card-project">${escapeHtml(item.project || "일반")}</span>
          </label>
          <span class="card-date">${escapeHtml(item.datetime || "")}</span>
        </div>

        <div class="card-quote" title="${escapeHtml(item.quote)}">
          "${escapeHtml(item.quote)}"
        </div>

        ${noteHtml}

        <div class="card-tags">
          ${tagsHtml}
        </div>

        <div class="card-footer">
          <a href="${item.url}" target="_blank" class="card-source" title="${item.url}">
            🌐 ${escapeHtml(item.domain || item.title || "출처 웹페이지")}
          </a>
          <div class="card-actions">
            <button class="icon-btn btn-card-copy" title="마크다운 인용 복사">📋</button>
            <button class="icon-btn btn-card-download" title="파일 다시 다운로드">📥</button>
            <button class="icon-btn icon-btn-danger btn-card-delete" title="삭제">🗑️</button>
          </div>
        </div>
      `;

      // Checkbox listener
      const checkbox = card.querySelector(".citation-check");
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedIds.add(item.id);
        } else {
          selectedIds.delete(item.id);
        }
        card.classList.toggle("selected", e.target.checked);
        updateSelectionBadges();
      });

      // Copy Action
      card.querySelector(".btn-card-copy").addEventListener("click", async (e) => {
        e.stopPropagation();
        const mdCitation = `> ${item.quote}\n\n— [${item.title}](${item.url}) (${item.datetime})`;
        await navigator.clipboard.writeText(mdCitation);
        showToast("마크다운 인용이 복사되었습니다.");
      });

      // Download File Action
      card.querySelector(".btn-card-download").addEventListener("click", async (e) => {
        e.stopPropagation();
        downloadSingleCitation(item);
      });

      // Delete Action
      card.querySelector(".btn-card-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("이 인용 기록을 삭제하시겠습니까?")) {
          citations = citations.filter(c => c.id !== item.id);
          selectedIds.delete(item.id);
          await chrome.storage.local.set({ citations });
          showToast("인용이 삭제되었습니다.");
          updateUI();
        }
      });

      citationsContainer.appendChild(card);
    });
  }

  // 5. Search & Filter Handlers
  searchInput.addEventListener("input", (e) => {
    filterState.search = e.target.value;
    btnClearSearch.style.display = filterState.search ? "block" : "none";
    renderCitations();
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    filterState.search = "";
    btnClearSearch.style.display = "none";
    renderCitations();
  });

  btnResetFilters.addEventListener("click", () => {
    filterState.search = "";
    filterState.project = null;
    filterState.tag = null;
    searchInput.value = "";
    btnClearSearch.style.display = "none";
    updateUI();
  });

  btnSelectAll.addEventListener("click", () => {
    if (selectedIds.size === citations.length) {
      selectedIds.clear();
      btnSelectAll.textContent = "전체 선택";
    } else {
      citations.forEach(c => selectedIds.add(c.id));
      btnSelectAll.textContent = "전체 해제";
    }
    updateUI();
  });

  btnOpenCollageTab.addEventListener("click", () => {
    window.location.hash = "collage";
    switchTab("collage");
  });

  // 6. Collage Generator
  function renderCollage() {
    const selectedList = citations.filter(c => selectedIds.has(c.id));
    collageSelectionCount.textContent = selectedList.length;

    // Sidebar selected previews
    collageSelectedItems.innerHTML = "";
    if (selectedList.length === 0) {
      collageSelectedItems.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          인용 라이브러리에서 체크박스를 선택하여 이곳에 추가하세요.
        </div>
      `;
    } else {
      selectedList.forEach(item => {
        const div = document.createElement("div");
        div.className = "collage-item-preview";
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <b style="color:#4f46e5;">${escapeHtml(item.project || "일반")}</b>
            <button class="icon-btn icon-btn-danger" style="padding:0; font-size:10px;" data-remove="${item.id}">✕</button>
          </div>
          <div style="overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
            "${escapeHtml(item.quote)}"
          </div>
        `;
        div.querySelector("[data-remove]").addEventListener("click", () => {
          selectedIds.delete(item.id);
          updateUI();
          renderCollage();
        });
        collageSelectedItems.appendChild(div);
      });
    }

    // Generate output text
    generateCollageDocument(selectedList);
  }

  function generateCollageDocument(items) {
    const style = collageStyle.value;
    const nowStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

    if (items.length === 0) {
      collageOutput.value = "선택된 인용구가 없습니다. 왼쪽 또는 라이브러리 탭에서 인용구를 선택해주세요.";
      return;
    }

    if (style === "markdown") {
      let doc = `# 📑 리서치 인용 콜라주 & 자료 정리\n`;
      doc += `- **생성 일자**: ${nowStr}\n`;
      doc += `- **선택된 인용 수**: ${items.length}개\n\n`;
      doc += `---\n\n`;

      // Group by Project
      const grouped = {};
      items.forEach(it => {
        const p = it.project || "일반 자료";
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push(it);
      });

      Object.entries(grouped).forEach(([proj, list]) => {
        doc += `## 📁 ${proj}\n\n`;
        list.forEach((c, idx) => {
          doc += `### ${idx + 1}. ${c.title || "참고 문헌"}\n\n`;
          doc += `> ${c.quote.split("\n").join("\n> ")}\n\n`;
          if (c.note) {
            doc += `* 💡 **나의 생각 / 논문 활용 아이디어**: ${c.note}\n`;
          }
          doc += `* 🌐 **출처**: [${c.domain || c.url}](${c.url})\n`;
          doc += `* 🕒 **수집 시간**: ${c.datetime || ""}\n`;
          if (c.tags && c.tags.length > 0) {
            doc += `* 🏷️ **태그**: ${c.tags.map(t => `#${t.replace(/^#/, "")}`).join(" ")}\n`;
          }
          doc += `\n`;
        });
      });

      collageOutput.value = doc;
    } else if (style === "apa") {
      let doc = `[학술 참고문헌 & 인용 콜라주 - ${nowStr}]\n\n`;
      items.forEach((c, idx) => {
        const author = c.author ? `${c.author}. ` : "";
        doc += `[${idx + 1}] ${author}(${c.datetime?.slice(0, 4) || "n.d."}). "${c.title}". ${c.domain}. Retrieved from ${c.url}\n`;
        doc += `    인용문: "${c.quote}"\n`;
        if (c.note) {
          doc += `    메모: ${c.note}\n`;
        }
        doc += `\n`;
      });
      collageOutput.value = doc;
    } else {
      // Plain text
      let doc = `=== 인용 콜라주 자료 정리 (${nowStr}) ===\n\n`;
      items.forEach((c, idx) => {
        doc += `[${idx + 1}] ${c.project ? `[${c.project}] ` : ""}${c.title}\n`;
        doc += `문장: ${c.quote}\n`;
        if (c.note) doc += `메모: ${c.note}\n`;
        doc += `출처: ${c.url} (${c.datetime})\n\n`;
      });
      collageOutput.value = doc;
    }
  }

  collageStyle.addEventListener("change", () => {
    const selectedList = citations.filter(c => selectedIds.has(c.id));
    generateCollageDocument(selectedList);
  });

  btnClearSelection.addEventListener("click", () => {
    selectedIds.clear();
    updateUI();
    renderCollage();
  });

  btnCopyCollage.addEventListener("click", async () => {
    await navigator.clipboard.writeText(collageOutput.value);
    showToast("콜라주 문서가 클립보드에 복사되었습니다!");
  });

  btnDownloadCollage.addEventListener("click", () => {
    const text = collageOutput.value;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `cite-log_collage_${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("콜라주 파일(.md)이 다운로드되었습니다.");
  });

  // 7. Settings Handlers
  btnSaveSettings.addEventListener("click", async () => {
    const saveDirectory = settingSaveDir.value.trim() || "cite-log";
    const fileFormat = settingFormat.value;
    const autoDownload = settingAutoDownload.checked;

    await chrome.storage.local.set({
      saveDirectory,
      fileFormat,
      autoDownload
    });

    currentSettings = { saveDirectory, fileFormat, autoDownload };
    sidebarSaveDir.textContent = saveDirectory;
    showToast("설정이 저장되었습니다.");
  });

  // Backup: Export JSON
  const exportJsonHandler = () => {
    const backupData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      settings: currentSettings,
      citations: citations
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cite-log_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON 백업 파일이 다운로드되었습니다.");
  };

  btnExportJson.addEventListener("click", exportJsonHandler);
  btnBackupExport.addEventListener("click", exportJsonHandler);

  // Backup: Import JSON
  inputBackupFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed.citations)) {
          // Merge by ID
          const existingIds = new Set(citations.map(c => c.id));
          let added = 0;
          parsed.citations.forEach(item => {
            if (!existingIds.has(item.id)) {
              citations.unshift(item);
              added++;
            }
          });
          await chrome.storage.local.set({ citations });
          showToast(`백업 복원 완료: ${added}개의 새로운 인용 추가됨`);
          updateUI();
        } else {
          alert("유효한 cite-log 백업 파일이 아닙니다.");
        }
      } catch (err) {
        alert("JSON 파싱 중 오류가 발생했습니다: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Danger: Clear all
  btnClearAll.addEventListener("click", async () => {
    if (confirm("정말로 모든 인용 히스토리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      citations = [];
      selectedIds.clear();
      await chrome.storage.local.set({ citations: [] });
      showToast("모든 인용 히스토리가 삭제되었습니다.");
      updateUI();
    }
  });

  // Single Citation Download Helper
  function downloadSingleCitation(item) {
    const ext = currentSettings.fileFormat || "md";
    const noteSection = item.note ? `\n### 📝 메모 & 코멘트\n${item.note}\n` : "";
    const text = `---
title: "${(item.title || "").replace(/"/g, '\\"')}"
source: "${item.url || ""}"
date: "${item.datetime || ""}"
project: "${item.project || "일반"}"
tags: [${(item.tags || []).map(t => `"${t}"`).join(", ")}]
---

# ${item.title || "Untitled Citation"}

> ${item.quote.split("\n").join("\n> ")}
${noteSection}`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename || `citation_${item.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("파일이 다운로드되었습니다.");
  }

  // Toast Helper
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});

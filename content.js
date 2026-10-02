// cite-log - Content Script

(() => {
  // Prevent multiple injections
  if (window.__CITE_LOG_INJECTED__) return;
  window.__CITE_LOG_INJECTED__ = true;

  // Extract author or site name from page metadata
  function extractMetadata() {
    const getMeta = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.content) return el.content.trim();
      }
      return "";
    };

    const author = getMeta([
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
      'meta[name="byl"]'
    ]);

    const siteName = getMeta([
      'meta[property="og:site_name"]',
      'meta[name="application-name"]'
    ]) || window.location.hostname;

    const doi = normalizeDoi(getMeta([
      'meta[name="citation_doi"]',
      'meta[name="dc.identifier"]',
      'meta[name="DC.Identifier"]',
      'meta[name="prism.doi"]',
      'meta[property="citation_doi"]'
    ]) || extractDoiFromUrl(window.location.href));

    const journal = getMeta([
      'meta[name="citation_journal_title"]',
      'meta[name="citation_journal"]',
      'meta[name="prism.publicationname"]'
    ]);

    const publishedAt = getMeta([
      'meta[name="citation_publication_date"]',
      'meta[name="citation_date"]',
      'meta[name="dc.date"]',
      'meta[name="prism.publicationdate"]'
    ]);

    const metadataTitle = getMeta([
      'meta[name="citation_title"]',
      'meta[name="dc.title"]',
      'meta[property="og:title"]'
    ]);

    const metadataAuthor = getMeta([
      'meta[name="citation_author"]',
      'meta[name="dc.creator"]'
    ]);

    return {
      author: author || metadataAuthor,
      siteName,
      doi,
      journal,
      publishedAt,
      metadataTitle
    };
  }
  function extractDoiFromUrl(url) {
    const match = String(url || "").match(/(?:doi\.org\/|doi:\s*)(10\.\d{4,9}\/[^\s?#]+)/i);
    return match ? match[1].replace(/[.,;)]$/, "") : "";
  }

  function normalizeDoi(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
      .replace(/^doi:\s*/i, "")
      .replace(/[<>\s]+$/g, "")
      .replace(/[.,;)]$/, "");
  }

  // Format date helper
  function getFormattedDate() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  // Toast notification
  function showToast(message, actionLabel = "", actionHandler = null) {
    const existing = document.querySelector(".cite-log-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "cite-log-toast";

    const icon = document.createElement("span");
    icon.textContent = "🔖";
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(icon, text);

    if (actionLabel && actionHandler) {
      const action = document.createElement("button");
      action.className = "cite-log-toast-action";
      action.textContent = actionLabel;
      action.addEventListener("click", async () => {
        action.disabled = true;
        await actionHandler();
        toast.remove();
      });
      toast.appendChild(action);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      if (!toast.isConnected) return;
      toast.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, actionLabel ? 5000 : 3500);
  }

  // Close modal
  function closeModal() {
    const root = document.getElementById("cite-log-root");
    if (root) root.remove();
  }

  // Open In-Page Citation Modal
  async function openCiteModal(data) {
    closeModal(); // Remove previous if any

    const { author, siteName, doi, journal, publishedAt, metadataTitle } = extractMetadata();
    const formattedDate = getFormattedDate();
    const pageTitle = metadataTitle || data.pageTitle || document.title || "제목 없음";
    const pageUrl = data.pageUrl || window.location.href;
    const selectionText = data.selectionText || "";

    // Fetch settings for folder preview
    let saveDir = "cite-log";
    let fileFormat = "md";
    let lastProject = "";
    let lastTags = "";
    let recentProjects = [];
    let recentTags = [];
    try {
      const res = await chrome.runtime.sendMessage({ action: "GET_SETTINGS" });
      if (res && res.settings) {
        saveDir = res.settings.saveDirectory || "cite-log";
        fileFormat = res.settings.fileFormat || "md";
        lastProject = res.settings.lastProject || "";
        lastTags = res.settings.lastTags || "";
        recentProjects = Array.isArray(res.settings.recentProjects) ? [...res.settings.recentProjects] : [];
        recentTags = Array.isArray(res.settings.recentTags) ? [...res.settings.recentTags] : [];
        if (lastProject && !recentProjects.includes(lastProject)) {
          recentProjects.unshift(lastProject);
        }
        if (lastTags) {
          lastTags.split(/[,#\s]+/).filter(Boolean).reverse().forEach((tag) => {
            if (!recentTags.includes(tag)) recentTags.unshift(tag);
          });
        }
      }
    } catch (e) {
      console.warn("Could not retrieve settings:", e);
    }

    // Create Root Container
    const root = document.createElement("div");
    root.id = "cite-log-root";

    root.innerHTML = `
      <div id="cite-log-backdrop"></div>
      <div id="cite-log-modal" role="dialog" aria-modal="true" aria-labelledby="cite-log-title">
        <div class="cite-log-header">
          <div class="cite-log-header-title">
            <span id="cite-log-title">cite-log 인용 수집</span>
            <span class="cite-log-badge">.${fileFormat}</span>
          </div>
          <button class="cite-log-close-btn" id="cite-log-btn-close" aria-label="닫기">✕</button>
        </div>

        <div class="cite-log-body">
          <div class="cite-log-field">
            <label class="cite-log-label">
              <span>인용 문장 (드래그한 텍스트)</span>
              <span class="cite-log-label-hint">수정 가능</span>
            </label>
            <textarea class="cite-log-quote-box" id="cite-log-quote"></textarea>
          </div>

          <div class="cite-log-field">
            <label class="cite-log-label">메모 / 활용 아이디어</label>
            <textarea class="cite-log-textarea" id="cite-log-note" placeholder="논문 서론 인용용, 발표 슬라이드 통계 자료 등 아이디어를 메모하세요..."></textarea>
          </div>

          <div class="cite-log-row">
            <div class="cite-log-field">
              <label class="cite-log-label">프로젝트 / 연구 주제</label>
              <input type="text" class="cite-log-input" id="cite-log-project" placeholder="예: 학위논문, AI트렌드, 시장조사" />
              <div class="cite-log-recent" id="cite-log-recent-projects" aria-label="최근 프로젝트"></div>
            </div>
            <div class="cite-log-field">
              <label class="cite-log-label">태그 (쉼표로 구분)</label>
              <input type="text" class="cite-log-input" id="cite-log-tags" placeholder="예: 통계, LLM, 인용구" />
              <div class="cite-log-recent" id="cite-log-recent-tags" aria-label="최근 태그"></div>
            </div>
          </div>

          <div class="cite-log-field">
            <label class="cite-log-label">출처 페이지 제목</label>
            <input type="text" class="cite-log-input" id="cite-log-pagetitle" />
          </div>

          <div class="cite-log-row">
            <div class="cite-log-field">
              <label class="cite-log-label">DOI</label>
              <input type="text" class="cite-log-input" id="cite-log-doi" placeholder="10.xxxx/..." />
            </div>
            <div class="cite-log-field">
              <label class="cite-log-label">저널</label>
              <input type="text" class="cite-log-input" id="cite-log-journal" placeholder="Journal / Conference" />
            </div>
          </div>

          <div class="cite-log-field">
            <label class="cite-log-label">출판일</label>
            <input type="text" class="cite-log-input" id="cite-log-published" placeholder="YYYY-MM-DD" />
          </div>

          <div class="cite-log-meta-bar">
            <div class="cite-log-meta-item">🌐 <a href="${pageUrl}" target="_blank" title="${pageUrl}">${siteName}</a></div>
            <div class="cite-log-meta-item">🕒 <span>${formattedDate}</span></div>
            <div class="cite-log-meta-item">📁 <span>저장 위치: 다운로드/${saveDir}/</span></div>
          </div>
        </div>

        <div class="cite-log-footer">
          <div class="cite-log-shortcut-hint">단축키: <b>Ctrl + Enter</b> 저장 / <b>Esc</b> 취소</div>
          <div class="cite-log-footer-actions">
            <button class="cite-log-btn cite-log-btn-secondary" id="cite-log-btn-cancel">취소</button>
            <button class="cite-log-btn cite-log-btn-primary" id="cite-log-btn-save">인용 저장</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Populate fields
    const quoteEl = document.getElementById("cite-log-quote");
    const noteEl = document.getElementById("cite-log-note");
    const titleEl = document.getElementById("cite-log-pagetitle");
    const projectEl = document.getElementById("cite-log-project");
    const tagsEl = document.getElementById("cite-log-tags");
    const doiEl = document.getElementById("cite-log-doi");
    const journalEl = document.getElementById("cite-log-journal");
    const publishedEl = document.getElementById("cite-log-published");
    const recentProjectsEl = document.getElementById("cite-log-recent-projects");
    const recentTagsEl = document.getElementById("cite-log-recent-tags");

    quoteEl.value = selectionText;
    titleEl.value = pageTitle;
    projectEl.value = lastProject;
    tagsEl.value = lastTags;
    doiEl.value = doi || "";
    journalEl.value = journal || "";
    publishedEl.value = publishedAt || "";

    function renderRecentChoices(container, values, input, formatter) {
      container.innerHTML = "";
      values.slice(0, 6).forEach((value) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cite-log-recent-chip";
        button.textContent = formatter(value);
        button.title = value;
        button.addEventListener("click", () => {
          input.value = value;
          input.focus();
        });
        container.appendChild(button);
      });
    }

    renderRecentChoices(recentProjectsEl, recentProjects, projectEl, value => value);
    renderRecentChoices(recentTagsEl, recentTags, tagsEl, value => `#${value.replace(/^#/, "")}`);

    // Focus on note input for quick workflow
    noteEl.focus();

    // Event: Save
    const doSave = async (skipDuplicateCheck = false) => {
      const quote = quoteEl.value.trim();
      if (!quote) {
        alert("인용 문장이 비어있습니다.");
        quoteEl.focus();
        return;
      }

      const saveBtn = document.getElementById("cite-log-btn-save");
      saveBtn.textContent = "저장 중...";
      saveBtn.disabled = true;

      const rawTags = tagsEl.value.split(/[,#\s]+/).filter(Boolean);

      const citationData = {
        id: `cite_${Date.now()}`,
        quote,
        note: noteEl.value.trim(),
        project: projectEl.value.trim() || "일반",
        tags: rawTags,
        title: titleEl.value.trim() || pageTitle,
        url: pageUrl,
        domain: window.location.hostname,
        author: author || "",
        datetime: formattedDate,
        timestamp: Date.now()
      };

      try {
        const response = await chrome.runtime.sendMessage({
          action: "SAVE_CITATION",
          data: citationData,
          skipDuplicateCheck
        });

        if (response && response.duplicate) {
          const existing = response.existing || {};
          saveBtn.disabled = false;
          saveBtn.textContent = "그래도 저장";
          const shouldSave = confirm(
            `이미 같은 페이지의 동일한 인용이 저장되어 있습니다.\\n\\n"${existing.quote || quote}"\\n\\n기존 기록: ${existing.datetime || "알 수 없음"}\\n\\n그래도 새 기록으로 저장하시겠습니까?`
          );
          if (shouldSave) {
            await doSave(true);
          } else {
            saveBtn.textContent = "인용 저장";
          }
          return;
        }

        if (response && response.success) {
          closeModal();
          showToast(
            `인용이 저장되었습니다! 📁 ${response.filename}`,
            "실행 취소",
            async () => {
              try {
                const undoResponse = await chrome.runtime.sendMessage({
                  action: "UNDO_CITATION",
                  id: response.citationId
                });
                if (undoResponse && undoResponse.success) {
                  showToast("방금 저장한 인용을 취소했습니다.");
                } else {
                  showToast("실행 취소에 실패했습니다.");
                }
              } catch (err) {
                console.error("Undo error:", err);
                showToast("실행 취소에 실패했습니다.");
              }
            }
          );
        } else {
          saveBtn.disabled = false;
          saveBtn.textContent = "인용 저장";
          showToast(response?.error || "저장에 실패했습니다. 다시 시도하세요.");
        }
      } catch (err) {
        console.error("Save error:", err);
        saveBtn.disabled = false;
        saveBtn.textContent = "인용 저장";
        showToast("저장에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도하세요.");
      }
    };

    // Listeners
    document.getElementById("cite-log-backdrop").addEventListener("click", closeModal);
    document.getElementById("cite-log-btn-close").addEventListener("click", closeModal);
    document.getElementById("cite-log-btn-cancel").addEventListener("click", closeModal);
    document.getElementById("cite-log-btn-save").addEventListener("click", doSave);

    // Keyboard Shortcuts inside Modal
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doSave();
      }
    });
  }

  // Listen for background requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "OPEN_CITE_MODAL") {
      openCiteModal(message.data);
      sendResponse({ status: "modal_opened" });
    }
  });
})();

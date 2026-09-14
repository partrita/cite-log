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

    return { author, siteName };
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
  function showToast(message) {
    const existing = document.querySelector(".cite-log-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "cite-log-toast";
    toast.innerHTML = `<span>🔖</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Close modal
  function closeModal() {
    const root = document.getElementById("cite-log-root");
    if (root) root.remove();
  }

  // Open In-Page Citation Modal
  async function openCiteModal(data) {
    closeModal(); // Remove previous if any

    const { author, siteName } = extractMetadata();
    const formattedDate = getFormattedDate();
    const pageTitle = data.pageTitle || document.title || "제목 없음";
    const pageUrl = data.pageUrl || window.location.href;
    const selectionText = data.selectionText || "";

    // Fetch settings for folder preview
    let saveDir = "cite-log";
    let fileFormat = "md";
    try {
      const res = await chrome.runtime.sendMessage({ action: "GET_SETTINGS" });
      if (res && res.settings) {
        saveDir = res.settings.saveDirectory || "cite-log";
        fileFormat = res.settings.fileFormat || "md";
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
            </div>
            <div class="cite-log-field">
              <label class="cite-log-label">태그 (쉼표로 구분)</label>
              <input type="text" class="cite-log-input" id="cite-log-tags" placeholder="예: 통계, LLM, 인용구" />
            </div>
          </div>

          <div class="cite-log-field">
            <label class="cite-log-label">출처 페이지 제목</label>
            <input type="text" class="cite-log-input" id="cite-log-pagetitle" />
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

    quoteEl.value = selectionText;
    titleEl.value = pageTitle;

    // Focus on note input for quick workflow
    noteEl.focus();

    // Event: Save
    const doSave = async () => {
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
        quote: quote,
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
          data: citationData
        });

        closeModal();
        if (response && response.success) {
          showToast(`인용이 저장되었습니다! 📁 ${response.filename}`);
        } else {
          showToast(`저장 완료 (히스토리 기록됨)`);
        }
      } catch (err) {
        console.error("Save error:", err);
        closeModal();
        showToast("저장 중 오류가 발생했습니다.");
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

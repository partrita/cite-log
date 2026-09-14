# 🔖 cite-log

> **크로스플랫폼 스마트 인용 & 문장 수집기**  
> 마우스 드래그 & 우클릭 한 번으로 웹페이지의 핵심 문장과 메타데이터(URL, 제목, 일시)를 수집하고, 로컬 폴더에 정리하여 논문과 발표자료용 콜라주로 엮어냅니다.

---

## ✨ 핵심 기능

1. **마우스 드래그 & 우클릭 컨텍스트 메뉴 (`cite-log`)**
   - 웹서핑 중 기억하고 싶은 문장을 드래그하고 마우스 우클릭 → `cite-log: 인용 수집하기` 선택
   - 즉시 화면 중앙에 직관적인 팝업(모달)이 열리며 추가 메모와 분류를 입력할 수 있습니다.

2. **자동 메타데이터 수집 & 구조화**
   - 📌 **인용 본문**: 드래그한 원문 텍스트 (수정 및 보완 가능)
   - 🌐 **출처 정보**: 원본 웹페이지 제목, 원본 URL, 사이트명, 저자 정보 자동 추출
   - 🕒 **수집 일시**: 정확한 타임스탬프 (YYYY-MM-DD HH:mm:ss) 기록
   - 💡 **나의 생각 / 메모**: 논문 서론 인용 목적, 세미나 발표 슬라이드 번호 등 자유로운 아이디어 기록
   - 📁 **프로젝트 & 태그**: 연구 주제별 분류(예: `학위논문`, `시장조사`) 및 다중 태그(예: `#인공지능`, `#통계`)

3. **지정된 로컬 폴더에 텍스트 파일 자동 저장**
   - 파일 형식 지원: **Markdown (`.md`)**, **일반 텍스트 (`.txt`)**, **JSON (`.json`)**
   - 저장 위치: 브라우저 기본 다운로드 폴더 내 `cite-log/` (설정에서 자유롭게 변경 가능)
   - 파일명 규격: `YYYYMMDD_HHMMSS_[프로젝트]_[제목].md` 형식으로 중복 없이 자동 생성
   - **Obsidian, Logseq, Typora, Notion, VS Code** 등에서 프론트매터(YAML)를 완벽하게 인식합니다.

4. **🎨 논문 & 발표자료를 위한 "콜라주 생성기 (Collage Studio)"**
   - 수집된 인용구들을 체크박스로 다중 선택하여 하나의 통합 문서로 합성
   - **마크다운 개요 형식**: 대주제/프로젝트별로 인용구와 본인의 메모가 구조화되어 바로 초안으로 사용 가능
   - **학술 참고문헌(APA) 형식**: 논문 투고용 인용 목록으로 변환
   - 원클릭 클립보드 복사 및 `.md` 파일 다운로드 지원

5. **강력한 대시보드 & 검색**
   - 실시간 키워드 검색 (인용구, 메모, 출처, URL 등)
   - 프로젝트별, 인기 태그별 필터링
   - 전체 데이터 백업 및 복원 (JSON)

---

## 🚀 설치 방법 (Chrome / Edge / Whale / Brave 등)

cite-log는 **Windows, macOS, Linux** 모든 OS의 Chromium 기반 브라우저(크롬, 엣지, 웨일, 브레이브, 비발디 등)에서 즉시 구동됩니다.

1. 본 저장소를 다운로드하거나 클론합니다.
   ```bash
   git clone https://github.com/partrita/cite-log.git
   ```
2. 브라우저를 열고 확장 프로그램 관리자 페이지로 이동합니다:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Whale**: `whale://extensions`
3. 우측 상단의 **'개발자 모드(Developer mode)'** 스위치를 켭니다.
4. 좌측 상단의 **'압축해제된 확장 프로그램을 로드합니다 (Load unpacked)'** 버튼을 클릭합니다.
5. `cite-log` 폴더를 선택하면 설치가 완료됩니다! 🎉

---

## 📖 사용 가이드

### 1. 문장 수집하기
1. 웹페이지에서 원하는 문장을 마우스로 드래그합니다.
2. 마우스 오른쪽 클릭 후 **`cite-log: 인용 수집하기`**를 클릭합니다.
3. 팝업창에서 메모, 프로젝트, 태그를 입력합니다.
4. **`Ctrl + Enter`** (또는 `저장` 버튼)를 누르면 지정된 로컬 폴더에 파일이 자동 생성되고 저장 알림이 표시됩니다.

### 2. 저장되는 파일 예시 (Markdown)
```markdown
---
title: "Attention Is All You Need"
source: "https://arxiv.org/abs/1706.03762"
date: "2026-09-14 09:15:30"
project: "학위논문"
tags: ["Transformer", "DeepLearning", "Attention"]
---

# Attention Is All You Need

> The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...

### 📝 메모 & 코멘트
논문 2장 관련 연구 트랜스포머 등장 배경에 인용할 것.

---
- **출처 URL**: [arxiv.org](https://arxiv.org/abs/1706.03762)
- **수집 일시**: 2026-09-14 09:15:30
- **프로젝트 / 분류**: 학위논문
- **태그**: #Transformer #DeepLearning #Attention
```

### 3. 대시보드 & 콜라주 생성기 열기
- 브라우저 상단 확장 프로그램 바에서 `cite-log` 아이콘을 누르고 **`🎨 대시보드 & 콜라주 생성기 열기`**를 누릅니다.
- 원하는 인용들을 선택한 후 상단의 **`선택 항목으로 콜라주 만들기`**를 눌러 논문이나 발표자료의 뼈대를 즉시 완성하세요!

---

## 📂 프로젝트 구조

```
cite-log/
├── manifest.json       # Manifest V3 확장 프로그램 설정
├── background.js       # 백그라운드 서비스 워커 (우클릭 메뉴 등록, 파일 다운로드 처리)
├── content.js          # 웹페이지 인라인 팝업 모달 & 메타데이터 추출
├── content.css         # 모달 및 토스트 알림 스타일
├── popup/              # 브라우저 상단 툴바 팝업
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── dashboard/          # 인용 라이브러리 & 콜라주 워크스페이스
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js
├── icons/              # 확장 프로그램 아이콘 (16, 48, 128)
├── CHROMEWEBSTORE.md   # 웹스토어 배포 및 권한 명세서
└── README.md
```

---

## 🔒 개인정보 및 보안
- cite-log는 사용자의 어떠한 데이터도 외부 서버로 전송하지 않습니다.
- 모든 인용구, 메모, 방문 기록은 사용자의 컴퓨터 브라우저 로컬 저장소(`chrome.storage.local`)와 지정된 로컬 폴더에만 안전하게 보관됩니다.

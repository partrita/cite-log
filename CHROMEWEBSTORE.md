# Chrome Web Store Listing — cite-log

> Last Updated: 2026-09-14

## Store Listing

**Extension Name**
cite-log | 스마트 인용 및 문장 수집기

**Short Description**
마우스 드래그 & 우클릭으로 문장, URL, 시간, 메타데이터를 수집하고 로컬 텍스트 파일과 콜라주 히스토리로 정리합니다.

**Detailed Description**
cite-log는 웹서핑, 논문 리서치, 자료 조사 중 마음에 드는 문장을 즉시 수집하여 체계적으로 관리해주는 스마트 인용 수집 도구입니다.

주요 기능:
- 마우스 드래그 & 우클릭 한 번으로 텍스트 수집
- 출처 URL, 웹사이트 제목, 수집 일시 자동 기록
- 수집 시 팝업을 통해 나의 생각, 메모, 연구 프로젝트 분류, 태그 추가
- 지정한 로컬 폴더(cite-log/)로 마크다운(.md) 또는 텍스트(.txt) 파일 자동 저장
- 논문이나 발표 자료 구성을 위한 "콜라주 생성기" 제공
- 키워드, 프로젝트, 태그별 실시간 검색 및 필터링
- JSON 백업 및 복원 기능

사용 방법:
1. 웹페이지에서 저장하고 싶은 문장을 마우스로 드래그합니다.
2. 마우스 오른쪽 클릭 후 "cite-log: 인용 수집하기"를 클릭합니다.
3. 나타나는 입력 팝업창에서 메모나 태그를 입력하고 "인용 저장 (Ctrl + Enter)"을 누릅니다.
4. 다운로드 폴더 내 cite-log 폴더에 마크다운 파일이 즉시 저장되며, 대시보드에서 콜라주로 엮을 수 있습니다.

개인정보 보호:
모든 수집 데이터는 브라우저 내부 로컬 스토리지 및 사용자의 로컬 컴퓨터에만 저장되며, 외부 서버로 전송되지 않습니다.

**Category**
Productivity

**Single Purpose**
웹페이지에서 선택한 텍스트와 출처 메타데이터를 수집하여 로컬 파일 및 콜라주 히스토리로 정리합니다.

**Primary Language**
Korean

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `contextMenus` | permissions | 마우스 우클릭 메뉴에 'cite-log: 인용 수집하기' 옵션을 추가하여 드래그한 텍스트를 바로 수집하기 위해 필요합니다. |
| `storage` | permissions | 사용자가 수집한 인용 목록, 메모, 태그 및 사용자 설정(저장 폴더, 파일 형식)을 로컬에 영구 보관하기 위해 필요합니다. |
| `downloads` | permissions | 수집된 인용문과 메타데이터를 사용자가 지정한 로컬 폴더(기본값: cite-log/)에 마크다운 또는 텍스트 파일로 저장하기 위해 필요합니다. |
| `activeTab` | permissions | 사용자가 컨텍스트 메뉴를 클릭한 현재 활성 탭에 인용 입력 팝업 UI를 띄우기 위해 필요합니다. |
| `scripting` | permissions | 컨텍스트 메뉴 클릭 시 현재 페이지에 모달 입력 UI 스크립트를 주입하고 실행하기 위해 필요합니다. |
| `tabs` | permissions | 인용 대상 웹페이지의 제목(Title)과 URL을 수집 메타데이터로 정확히 추출하기 위해 필요합니다. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

수집된 모든 텍스트, URL 및 사용자 메모는 사용자의 로컬 브라우저 저장소(chrome.storage.local)와 로컬 디스크 파일로만 저장되며, 어떠한 원격 서버나 제3자에게도 전송되지 않습니다.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-14 | 최초 릴리스 (우클릭 수집, 로컬 저장, 메타데이터 자동 추출, 콜라주 생성기) | Ready |

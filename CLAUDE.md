# 인계 문서 : 2단원 데이터 분석 수행평가 사이트

이 폴더를 다른 PC의 Claude Code에서 이어서 작업하기 위한 문서. 비밀번호와 토큰은 넣지 않음.
자세한 변경 이력은 `개발기록.md`, 처음 요구사항은 `수행평가사이트_개발요청서.md` 참고.

---

## 1. 목표와 요구사항

고1 정보(2022 개정) 2단원 데이터 수행평가용 웹사이트. 학생이 데이터 6개 중에서 골라 **CODAP으로 시각화 3개**를 만들고, 시각화마다 **질문, 관찰, 근거, 결론**을 써서 제출함.

- **학생 흐름** : 로그인(학번 5자리, 이름, 숫자 4자리 비밀번호, 첫 로그인 때 설정) → 평가 규칙 → 전체 화면 시작 → 그래프 종류 알아보기 → 내 수행평가(시각화 1, 2, 3 카드) → 데이터 선택 → 작업 화면(왼쪽 CODAP, 오른쪽 그래프 종류 선택, "만든 그래프 저장하기", 해석 4칸) → 제출
- **규칙**
  - 그래프 종류 6개 : 막대그래프, 히스토그램, 상자그림, 산점도, 선그래프, 지도 (점그래프는 사용자 요청으로 뺌)
  - 3개 모두 다른 종류여야 함. 같으면 경고, 제출은 가능
  - 미완성이어도 제출 가능. 제출 후에는 **수정 요청 → 교사 승인** 시 다시 작성
- **부정행위 방지** : 전체 화면 강제, 탭 이동과 창 이동 횟수 기록 및 경고 화면, 창 크기 줄임 기록, 복사와 붙여넣기 및 오른쪽 클릭 차단, 캡처 키 기록. CODAP iframe 안 클릭은 이탈로 세지 않음
- **교사 관리 화면(admin.html)**
  - 반별 목록 : 진행 0~3, 사용 그래프, 이탈 횟수, 상태(미접속, 작성 중, 제출, 수정 요청, 그래프 중복, 이탈 주의)
  - 답안 보기(그래프 그림 + 해석 4칸 + 이탈 기록)
  - 비밀번호 초기화(임의 4자리, 한 번만 표시. 교사도 원래 비밀번호는 못 봄, 해시 저장)
  - 체크 선택 후 CSV 내보내기, 선택 삭제
  - 명단 추가, 평가 열기/닫기(**기본 닫힘**), 수정 요청 승인/거절, 제출 취소
- **디자인과 문구 규칙 (사용자 요청, 꼭 지킬 것)**
  - 토스 느낌 : 흰 카드, 큰 굵은 글씨, 파란 버튼 `#3182F6`, 배경 `#F2F4F6`
  - 글꼴 **Spoqa Han Sans Neo**
  - 이모지 대신 직접 그린 SVG 아이콘 (`js/icons.js`)
  - 안내 문구는 **존댓말 X, 개조식** (예: "3개 완성 후 제출 가능")
  - **가운데 점(·) 쓰지 않음**
  - 큰 모니터(2000x1140)와 노트북(1366x768) 모두에서 한 화면에 꽉 차게
  - 그래프 종류 설명은 힌트가 노골적이지 않게 (과제 데이터 예시, CODAP 조작법은 넣지 않음)

## 2. 폴더와 파일 구조

| 경로 | 내용 |
|---|---|
| `index.html`, `admin.html` | 본 사이트 학생 화면, 관리 화면 |
| `css/style.css`, `css/admin.css` | 디자인 |
| `js/config.js` | 서버 주소(`API_URL`), 그래프 종류와 설명, 데이터 목록. localhost에서는 자동으로 테스트 모드 |
| `js/core.js` | **서버 로직** (Apps Script와 브라우저 테스트 모드가 같은 코드 사용) |
| `js/api.js` | 서버 호출(12초 시간 제한, 자동 재시도 3번), 테스트 모드 저장소(localStorage, SHA-256) |
| `js/codap.js` | CODAP 연결(embeddedServer), 데이터 넣기, 그래프 PNG 가져오기, 지도 그림 직접 그리기 |
| `js/guard.js` | 부정행위 방지 |
| `js/app.js`, `js/admin.js` | 학생 화면, 관리 화면 |
| `js/icons.js` | 직접 그린 SVG 아이콘 |
| `data/*.csv` | 본 평가 데이터 6개 (한글 속성명, 영문 파일명) |
| `1_남극펭귄.csv` 등 | 원본 CSV (사이트에는 안 씀) |
| `practice/` | **테스트(연습) 사이트**. `index.html`, `admin.html`은 자동 생성(직접 고치지 말 것), `config.js`로 서버 주소, 데이터, 시각화 개수(`MAX_SLOTS = 8`, `FREE_SLOTS = true` : 학생이 "시각화 추가"로 최대 8개, 종류 중복 경고 없음)만 바꿈 |
| `practice/data/*.csv` | 연습 데이터 6개 (붓꽃, 의료비와 기대수명, 2023년 큰 지진, 식당 팁, 자동차 연비, 항공 승객) |
| `apps-script/sheets-store.js` | 구글 시트 저장소 코드 (서버의 앞부분) |
| `apps-script/Code.gs` | 자동 생성 : `sheets-store.js` + `js/core.js` |
| `apps-script/personal/` | 본 서버 clasp 폴더 (`.clasp.json`에 스크립트 ID) |
| `apps-script/practice/` | 테스트 서버 clasp 폴더 |
| `apps-script/clasp/` | 예전 학교 계정 서버 (사용 안 함, 지워도 됨) |
| `tools/build-practice.js` | 본 사이트 HTML로 `practice/*.html` 생성 |
| `tools/build-server.js` | `Code.gs` 생성 후 clasp 폴더 두 곳에 복사 |
| `tools/lesson/` | 수업 자료 만들기 도구 (아래 6번) |
| `test/` | 요청서 9번 CODAP 테스트 페이지, 로컬 서버 `test/server.js` |
| `.claude/launch.json` | 로컬 미리보기 서버 설정 (이름 `site`, 포트 8080) |
| `수업자료_CODAP_그래프6종_연습.pdf`, `.docx` | 학생 연습용 수업 자료 (9쪽) |
| `개발기록.md`, `설치안내.md`, `수행평가사이트_개발요청서.md` | 문서 |

## 3. 쓰는 서비스와 계정

| 서비스 | 용도 | 계정, 위치 |
|---|---|---|
| **GitHub** | 사이트 코드 저장, GitHub Pages 배포 | 사용자 `geunzero1217`, 공개 저장소 `datatest` (브랜치 `main`, 폴더 `/`) |
| **Google Apps Script + 구글 시트** | 서버와 데이터 저장 | **개인 구글 계정** (clasp 로그인 계정). 학교 계정은 교육청이 Apps Script API를 막아 자동 배포 불가라서 옮김 |
| CODAP v3 | 시각화 도구 (iframe) | `https://codap3.concord.org/` (계정 없음) |
| 외부 CDN | iframe-phone 1.3.1(unpkg), Spoqa Han Sans Neo 3.3.0(jsdelivr), 지도 배경 Esri 타일 | 계정 없음 |
| Firebase | **사용 안 함** | |

### 서버 2개 (둘 다 개인 계정)

| | 본 평가 서버 | 테스트(연습) 서버 |
|---|---|---|
| 구글 시트 | "2단원 데이터 수행평가" `1_uCA-BjurgVrTgEwfee2Ug9Xya76sQVsvso99dJU4cE` | "2단원 데이터 수행평가 (수행평가 테스트)" `1UUkWUONsHStEFycXHH_1QTaVsPFT2d4Ot9y5JZ9zfzI` |
| Apps Script ID | `1Ln4Zgq0zXmA1lyvUbq1o-FGZUTlqYaeUEkv2Dr0PjT-LpJpbldKrxXP3` | `13YtyJUYzcem_QB2UG0FuXlKhPPgJ5cf4jNIJgxOYbzgxSWIqHfQ0w5Nf` |
| 웹 앱 배포 ID (주소 고정) | `AKfycbxpijRseNzEtjTiFMsoNiBC7JhVqlzZivsHncXsHZyp6GCihZ5Vz3AClaAQXqjrAYct` | `AKfycbzrwW11Tc83_DS5jnBq8nWQlakx3-XuobeWwMs-6YkMS3frxFDb1YsikrZngOUK2Cnxgw` |
| 사이트 설정 위치 | `js/config.js`의 `API_URL` | `practice/config.js`의 `API_URL` |

- 시트 탭 : `학생`, `답안`, `기록`, `설정`. 칸이 추가되면 코드가 제목을 자동으로 채움
- **관리자 비밀번호는 각 시트 `설정` 탭의 `adminPassword` 줄**에 있음 (코드에 없음). 없으면 관리자 로그인 불가
- `설정` 탭 `locked` : `false`일 때만 평가 열림 (없으면 닫힘)
- 스크립트 속성 `PEPPER` : 학생 비밀번호 해시용 비밀 값. **지우거나 바꾸면 모든 학생 로그인 불가**
- 예전 학교 계정 서버(스크립트 `1aLSWGVM3DJExB703Vs8aKKU-SdmVZq8aRYhpkeCDLm55grY75h7I3QmY`)는 사용 안 함

## 4. 배포 주소와 방법

- 학생 사이트 : https://geunzero1217.github.io/datatest/
- 관리 화면 : https://geunzero1217.github.io/datatest/admin.html (학생에게 공유 X)
- 테스트 사이트 : https://geunzero1217.github.io/datatest/practice/ (관리 : `practice/admin.html`)

### 사이트 고칠 때
1. `css/`, `js/`, `index.html`, `admin.html` 수정
2. `node tools/build-practice.js` (본 HTML을 바꿨으면 꼭 실행, 테스트 사이트에 반영)
3. `git add -A` → `git commit` → `git push` → 1~2분 뒤 GitHub Pages 반영 (학생 데이터 영향 없음)

### 서버 고칠 때 (`js/core.js` 또는 `apps-script/sheets-store.js`)
```
node tools/build-server.js
cd apps-script/personal
clasp push --force
clasp create-deployment -i AKfycbxpijRseNzEtjTiFMsoNiBC7JhVqlzZivsHncXsHZyp6GCihZ5Vz3AClaAQXqjrAYct --description "변경 내용"
cd ../practice
clasp push --force
clasp create-deployment -i AKfycbzrwW11Tc83_DS5jnBq8nWQlakx3-XuobeWwMs-6YkMS3frxFDb1YsikrZngOUK2Cnxgw --description "변경 내용"
```
- `-i 배포ID`를 꼭 붙여야 **주소가 그대로** 유지됨 (빼면 새 주소가 생김)
- `clasp create-deployment`가 안 되는 clasp 버전이면 `clasp deploy -i ...` 사용
- 확인 : 배포 주소에 GET → `{"ok":true,"message":"수행평가 서버 동작 중"}`. POST는 본문을 text/plain JSON으로 (`{"action":"adminLogin","adminPw":"틀린값"}` → "관리자 비밀번호가 다름"이면 정상)

### 로컬 테스트
- `node test/server.js` → http://localhost:8080 (본), http://localhost:8080/practice/ (테스트)
- localhost에서는 **항상 테스트 모드** (브라우저 localStorage에만 저장, 실제 시트 안 건드림, 관리자 비밀번호 `1234`)
- 테스트 모드에서는 기본 닫힘이라 먼저 `await API.call('adminSetLock',{adminPw:'1234',locked:false})` 또는 관리 화면에서 평가 열기

## 5. 알아 둘 기술 사항 (시행착오로 확인한 것)

- **CODAP 연결** : `codap3.concord.org/?embeddedMode=yes&embeddedServer=yes` + iframe-phone. 사이트가 CODAP Data Interactive API를 직접 호출 (플러그인 불필요). localhost에서 `?url=` CSV나 `?di=` 플러그인은 브라우저 사설망 차단으로 안 됨
- **지도** : CODAP v3는 속성 이름이 **정확히 `lat`, `long`**이어야 위치로 인식 (2026-11 확인. `위도(lat)` 같은 이름은 예전엔 됐지만 지금은 안 됨). `js/codap.js`가 `위도`, `경도`를 `lat`, `long`으로 바꿔 넣음
- **지도 그림** : CODAP v3는 지도 그림 내보내기 불가 → 사이트가 같은 데이터로 Esri 배경 지도 위에 점을 다시 그림 (학생이 색 기준 속성 선택, 큰 값이 위에 그려짐)
- **그래프 그림** : `get dataDisplay[ID]` → PNG → JPEG로 줄여 시트 셀(5만 자 제한)에 저장. 관리 목록은 `답안` 탭의 "그림 있음" 칸만 읽음 (그림 칸을 읽으면 느림)
- **구글 서버 응답 멈춤** : 요청의 약 15%가 응답 없이 멈추는 현상 측정됨 → `api.js`에서 12초/20초/30초로 끊고 재시도. 기록(log)은 `batchId`로 중복 집계 방지
- **CODAP 메뉴 이름** (그래프 클릭 → 오른쪽 메뉴) : Config(환경설정) "점을 막대로 변환", "히스토그램으로 변환" / Measure(측정) "연결 선", "최소제곱선", "그림 상자와 정규 곡선" → "Box Plot" / View(보기) "선택하지 않은 케이스 숨기기"
- **동시 접속** : Apps Script 동시 실행 30개 제한. 한 반(25명)은 문제없음, 여러 반 동시 사용은 느려질 수 있음

## 6. 수업 자료 다시 만들기 (`tools/lesson/`)

- `lesson-spec.js` : 그래프 6종 대표 예시 (데이터, 축, 누를 메뉴, 만드는 순서, 해석 예시. 해석 수치는 `stats.py`로 계산)
- `capture.js` : 헤드리스 Chrome(`cdp.js`)으로 로컬 테스트 사이트를 열어 CODAP에서 실제로 그래프를 만들고 `shots/`에 캡처. 먼저 `node test/server.js` 실행 필요. `node capture.js line`처럼 하나만 다시 찍기 가능
- `capture-intro.js` : 로그인, 그래프 설명, 데이터 선택, 내 수행평가 화면 캡처
- `make-lesson.js 출력.pdf` : PDF, `make-docx.js 출력.docx` : 구글 문서용 Word (`npm install` 후 `docx` 라이브러리 필요)
- `prep_practice.py raw폴더 출력폴더` : `raw/`의 공개 데이터(seaborn-data, USGS)를 한글 연습 데이터로 변환
- `cdp.js`의 Chrome 경로가 `C:\Program Files\Google\Chrome\Application\chrome.exe`로 고정되어 있음. 새 PC 경로가 다르면 수정

## 7. 지금까지 된 것

- 요청서 9번 테스트, 구조 결정 (embeddedServer 방식)
- 본 사이트 전체 (학생, 관리, 부정행위 방지, 수정 요청, 열기/닫기, 해시 비밀번호, CSV 선택, 삭제)
- 개인 계정 서버 이전과 clasp 자동 배포
- 테스트(연습) 사이트와 별도 서버, 연습 데이터 6개
- 수업 자료 PDF와 Word (그래프 6종, 선그래프는 범례에서 한 나라 고른 뒤 "선택하지 않은 케이스 숨기기" 방식)
- 큰 화면 배치, 직접 그린 아이콘, Spoqa 글꼴
- 실제 서버에서 확인 : 로그인, 저장, 제출, 수정 요청, 닫힘 상태 저장 차단 (본, 테스트 둘 다)

## 8. 하다 만 일, 확인이 필요한 것

- [ ] 본 시트, 테스트 시트에 남은 확인용 학생 **`99999 테스트`** 삭제 (관리 화면 선택 삭제)
- [x] **본 사이트 지도**(탄소배출과 에너지) 확인 (2026-11-17) : 배포된 `codap.js`가 최신인 것 확인, 로컬에서 본 데이터로 CODAP 지도 79개 점, 지도 그림 저장(색 기준 숫자 속성, 약 3만 4천 자) 정상. 실제 사이트에서 학생 계정으로 끝까지 해 보는 것은 연습 수업 때 같이 확인
- [ ] 수업 자료 `.docx`를 구글 문서에 올렸을 때 쪽 넘김 확인 (Word에서는 9쪽 확인, 구글 문서에서는 미확인)
- [ ] 전체 화면 전환을 일반 크롬에서 확인 (미리보기 창에서는 지원 안 돼서 못 봄)
- [ ] 연습 수업 때 25명 동시 사용으로 서버 부하 확인 (관리 화면에서 답안이 다 들어왔는지, "연결이 느려 다시 저장 중" 문구가 자주 떴는지)
- [ ] 학생 정보를 개인 구글 계정에 두는 것이 학교 규정상 괜찮은지 확인
- [ ] (선택) `apps-script/clasp/` 예전 학교 서버 폴더 정리

## 9. 새 PC 설치와 로그인

1. **설치**
   - Git (Git for Windows, 또는 관리자 권한이 없으면 MinGit). 이 PC는 `%LOCALAPPDATA%\MinGit`에 MinGit을 풀어서 씀
   - Node.js LTS (이 PC는 v24)
   - Google Chrome (수업 자료 캡처용)
   - Python 3 (연습 데이터 다시 만들 때만)
   - Claude Code
2. **폴더 받기** : 아래 "10. 옮기는 방법" 참고
3. **GitHub 로그인** : 처음 `git push` 할 때 Git Credential Manager가 브라우저 로그인 창을 띄움 → `geunzero1217` 계정으로 로그인
   - 커밋 작성자 : `git config user.name "geunzero1217"`, `git config user.email "geunzero1217@users.noreply.github.com"`
4. **clasp (Apps Script 배포)**
   - `npm install -g @google/clasp`
   - `clasp login` → 브라우저에서 **개인 구글 계정**(시트 주인)으로 로그인, 권한 허용
   - 그 계정의 https://script.google.com/home/usersettings 에서 Google Apps Script API가 "사용"인지 확인 (이미 켜 둠)
   - 로그인 정보는 사용자 홈 폴더의 `.clasprc.json`에 저장됨. **이 파일은 옮기거나 저장소에 올리지 말 것** (새 PC에서 다시 로그인)
5. **수업 자료 도구를 쓸 때만** : `cd tools/lesson` → `npm install`
6. 확인 : `node test/server.js` 실행 후 http://localhost:8080 이 열리면 준비 끝

## 11. AI 사용 윤리 헌장 만들기 : 별도 저장소로 분리 (2026-11-23)

- 수행평가와 겹치지 않게 저장소 `geunzero1217/ai-charter`, 로컬 폴더 바탕 화면의 `AI 윤리 헌장` 폴더로 옮김. 그 폴더의 `CLAUDE.md` 참고
- 새 주소 : https://geunzero1217.github.io/ai-charter/ (관리 `admin.html`)
- 이 저장소의 `ai-charter/index.html`, `admin.html`은 예전 링크를 새 주소로 넘기는 페이지만 남김 (지우지 말 것)

## 10. 이 폴더를 새 PC로 옮기는 방법

**이 폴더 전체가 GitHub 저장소 `geunzero1217/datatest`에 올라가 있음** (2026-11-17, 방법 A 선택). 새 PC에서는 아래만 하면 됨.

```
git clone https://github.com/geunzero1217/datatest.git "데이터 수행평가"
```

- 저장소는 **공개**이고 GitHub Pages로 그대로 공개됨 → 이 문서와 개발기록도 `github.io` 주소로 누구나 볼 수 있음. **비밀번호, 토큰, 학생 데이터는 절대 저장소에 넣지 말 것** (학생 데이터는 구글 시트에만 있음)
- 올릴 때 검사함 : 비밀번호, 토큰, 개인 이메일 없음. 시트 ID, 스크립트 ID는 있지만 그것만으로는 접근 불가
- `.gitignore`로 빼는 것 : `node_modules/`, `tools/lesson/chrome-profile/`, `.claude/settings.local.json`, `.clasprc.json`, Office 임시 파일
- clone 후 9번 순서대로 GitHub 로그인과 `clasp login`을 다시 해야 함 (로그인 정보는 옮겨지지 않음)

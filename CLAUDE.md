# CLAUDE.md

## 프로젝트 정보

- **이름**: 두부 (dooboo)
- **목적**: Dooray API를 MCP 서버로 제공
- **저장소**: github.com/zilhak/dooboo

## 기술 스택

- **런타임**: Bun
- **언어**: TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` (Streamable HTTP, `WebStandardStreamableHTTPServerTransport`)
- **스키마 검증**: Zod
- **DB**: `bun:sqlite` (내장, 외부 의존성 없음)
- **로컬 저장소**: `~/.dooboo/db.sqlite`

## 프로젝트 구조

```
src/
├── index.ts              # 진입점, Bun.serve() + MCP 세션 관리
├── db.ts                 # DB 초기화, 테이블 생성, 헬퍼
├── client.ts             # Dooray API HTTP 클라이언트 (bind_token 해소 + fetch)
├── helpers.ts            # 공용 응답 헬퍼, Zod 스키마
└── tools/
    ├── register-server.ts  # register_server 도구
    ├── register-token.ts   # register_token 도구
    ├── list-servers.ts     # list_servers 도구
    ├── bind.ts             # bind 도구
    ├── common.ts           # Common API — 멤버, Incoming Hook (6개)
    ├── project.ts          # Project API — 프로젝트, 워크플로우, 태그, 마일스톤, 템플릿 (31개)
    ├── post.ts             # 업무(Task) API — 업무 CRUD, 댓글, 첨부파일, 파일 다운로드. 도구명은 task_* 사용. find_task_by_ticket(티켓번호 검색), download_file(범용 파일 다운로드) 포함
    ├── calendar.ts         # Calendar API (10개)
    ├── messenger.ts        # Messenger API (9개)
    ├── wiki.ts             # Wiki API (17개)
    ├── drive.ts            # Drive API (17개)
    ├── contact.ts          # Contact API (3개)
    └── reservation.ts      # Reservation API (9개)
```

## 핵심 아키텍처

- **세션 관리**: 각 MCP 클라이언트 연결마다 별도의 `McpServer` + `Transport` 인스턴스 생성
- **도구 등록**: `createMcpServer()` 팩토리 함수에서 모든 도구를 등록
- **바인드 토큰**: `crypto.randomBytes(4).toString('hex')` → 8자리 hex, AI Agent는 이 토큰으로 서버를 구분
- **DB**: WAL 모드, foreign_keys ON

## DB 스키마

- `servers`: id, url (UNIQUE)
- `tokens`: server_id (PK, FK→servers), token
- `bindings`: bind_token (PK), server_id (FK→servers), created_at

## 개발 규칙

- 새 도구 추가 시 `src/tools/`에 파일 생성 후 `src/index.ts`의 `createMcpServer()`에 등록
- Dooray API 연동 시 공식 API 문서 기준으로 구현
- MCP 도구 이름은 snake_case
- 커스텀 도구는 기본 API 도구와 분리하여 관리
- 임시 파일, 스크린샷 등은 `.claude/` 디렉토리에 생성

## 명령어

```bash
bun run dev     # 서버 실행 (기본 포트: 12701)
bun run start   # 서버 실행
```

## 기본 포트

- **기본 포트**: 12701
- **MCP 엔드포인트**: `http://localhost:12701/mcp`
- `PORT` 환경변수로 변경 가능

## Dooray 서비스 개요

Dooray는 NHN의 업무 협업 플랫폼이다. 아래 서비스로 구성되어 있다:

| 서비스 | 설명 | API 지원 | 비고 |
|--------|------|----------|------|
| **업무** | 프로젝트 기반 태스크 관리 (Jira와 유사) | ✅ | API에서 `post`로 표현됨 |
| **메일** | 이메일 송수신 | ❌ | API 미제공 |
| **캘린더** | 일정/이벤트 관리 | ✅ | |
| **드라이브** | 웹 파일 저장소 (업로드/다운로드) | ✅ | |
| **위키** | 프로젝트별 계층형 지식 문서 관리 | ✅ | |
| **주소록** | 연락처 관리 | ✅ | API에서 `contacts`로 표현됨 |
| **메신저** | 실시간 채팅/대화방 (Slack과 유사) | ✅ | 메일과 다름. API에서 `messenger`로 표현됨 |
| **화상회의** | 화상 회의 개설/참가 | ❌ | API 미제공 |
| **계정관리** | 내 계정 설정 | ❌ | API 미제공 |
| **폼** | 설문조사/정보취합 폼 생성·공유 | ❌ | API 미제공 |

### 핵심 개념: 프로젝트

Dooray의 메뉴에 "프로젝트"라는 독립 카테고리가 있는 것은 아니다.
**프로젝트는 업무와 위키(그리고 드라이브)가 공유하는 상위 개념**이다.

- 업무를 생성할 때 → 어떤 **프로젝트**에 생성할지 선택해야 한다
- 위키 페이지를 작성할 때 → 어떤 **프로젝트의 위키**에 작성할지 선택해야 한다
- 드라이브에 파일을 올릴 때 → 어떤 **프로젝트의 드라이브**에 올릴지 선택해야 한다

즉 프로젝트는 업무/위키/드라이브를 묶는 컨테이너이며, 하나의 프로젝트 화면 안에서 업무·드라이브·위키 탭으로 전환하며 사용한다.

### 업무 (API: post)

- Jira의 이슈(Issue)에 대응하는 개념
- Dooray API에서는 **post**라는 이름을 사용하지만, 사용자는 **"업무"** 또는 **"태스크"**로 부른다
- 하나의 업무는 프로젝트에 소속되며, 다음 속성을 가진다:
  - **담당자** (to), **작성자** (from), **참조자** (cc)
  - **워크플로우** (진행 상태): 할 일 → 진행 중 → 완료 등, 프로젝트별로 커스텀 가능
  - **마일스톤**: 기간 단위 업무 그룹핑 (스프린트와 유사)
  - **태그**: 분류용 라벨
  - **우선순위**: 긴급/높음/보통/낮음
  - **마감일**, **첨부파일**, **댓글**
  - **하위 업무**: 부모-자식 구조로 업무를 계층화 가능

### 위키 (API: wiki)

- 프로젝트별 지식 관리 문서 시스템
- 각 프로젝트는 자체 위키 공간(wiki)을 가지며, 그 안에 페이지(page)가 계층 구조로 존재한다
- 위키 페이지의 주요 속성:
  - **제목** (subject), **본문** (body, 마크다운 지원)
  - **부모 페이지** (parentPageId): 트리 구조
  - **참조자** (referrers): 페이지 변경 알림 받을 사람
  - **댓글**, **첨부파일**, **공유 링크**

### API 용어 → 사용자 용어 매핑

| API 용어 | Dooray UI 용어 | 설명 |
|----------|---------------|------|
| `post` | 업무 (태스크) | Jira 이슈에 대응. 프로젝트 소속 |
| `wiki` / `page` | 위키 / 위키 페이지 | 프로젝트별 계층형 문서 |
| `project` | 프로젝트 | 업무 + 드라이브 + 위키 컨테이너 |
| `workflow` | 워크플로우 (상태) | 업무 진행 상태 (할 일/진행 중/완료 등) |
| `milestone` | 마일스톤 | 스프린트와 유사한 기간 그룹핑 |
| `channel` | 대화방 (채팅방) | 메신저의 1:1 또는 그룹 대화 |
| `event` | 일정 | 캘린더 이벤트/약속 |
| `resource` | 자원 | 예약 가능한 회의실, 차량, 장비 등 |
| `log` | 댓글 | 업무/메신저의 댓글/메시지 (API에서 log로 표현) |

## Dooray API 참고

- API 베이스 URL: `https://api.dooray.com`
- 파일 API 도메인: `https://file-api.dooray.com`
- 인증: 헤더 `Authorization: dooray-api {token}`

### 파일 다운로드 API

Dooray 파일 다운로드는 **307 리다이렉트 + Authorization 재전송** 방식으로 동작한다.

**다운로드 흐름:**
1. `GET api.dooray.com/.../files/{fileId}?media=raw` 요청 (Authorization 헤더 포함)
2. **307 응답** + `location` 헤더에 `file-api.dooray.com` URL 반환
3. `location` URL로 **Authorization 헤더를 다시 포함**하여 GET 재요청 → 파일 바이너리 수신

**서비스별 다운로드 경로:**

| 서비스 | 다운로드 경로 |
|--------|-------------|
| 업무 | `GET /project/v1/projects/{projectId}/posts/{postId}/files/{fileId}?media=raw` |
| 드라이브 | `GET /drive/v1/drives/{driveId}/files/{fileId}?media=raw` |

**주의사항:**
- `?media=raw` 파라미터가 반드시 필요. 없으면 404 반환
- `?media=meta`를 사용하면 파일 메타데이터(이름, 사이즈, MIME 등) JSON 반환
- `redirect: "follow"` 사용 시 리다이렉트에서 Authorization 헤더가 누락될 수 있음. 반드시 `redirect: "manual"`로 307을 받고, location URL에 Authorization을 직접 포함하여 재요청해야 함
- 위키 파일 다운로드는 공식 문서에 엔드포인트 미명시

### 파일 저장 경로

- 다운로드 파일 저장: `~/.dooboo/images/`
- 다운로드 시작 전 폴더 용량이 50MB 초과 시 오래된 파일부터 삭제하여 40MB 이하로 정리
- Docker 사용 시 `~/.dooboo`를 호스트 바인드 마운트하여 컨테이너 외부에서도 접근 가능

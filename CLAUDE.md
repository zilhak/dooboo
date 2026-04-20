# CLAUDE.md

## 프로젝트 정보

- 이름: dooboo
- 목적: Dooray API를 MCP 서버로 제공
- 저장소: `github.com/zilhak/dooboo`

## 기술 스택

- 런타임: Bun
- 언어: TypeScript
- MCP SDK: `@modelcontextprotocol/sdk`
- 전송 방식:
  - `StdioServerTransport`
  - `WebStandardStreamableHTTPServerTransport`
- 스키마 검증: Zod
- DB: `bun:sqlite`
- 로컬 저장소: `~/.dooboo`

## 실행 모델

`src/index.ts`는 두 가지 모드를 지원합니다.

### stdio 모드

`--stdio` 인자가 있으면 stdio transport로 실행합니다.

```bash
bun run src/index.ts --stdio
```

### HTTP 모드

`--stdio`가 없으면 Streamable HTTP 서버를 띄웁니다.

```bash
bun run dev
```

- 기본 포트: `12701`
- 엔드포인트: `http://localhost:12701/mcp`

## 프로젝트 구조

```text
src/
├── index.ts
├── db.ts
├── client.ts
├── helpers.ts
└── tools/
    ├── register-server.ts
    ├── register-token.ts
    ├── list-servers.ts
    ├── bind.ts
    ├── common.ts
    ├── project.ts
    ├── post.ts
    ├── calendar.ts
    ├── messenger.ts
    ├── wiki.ts
    ├── drive.ts
    ├── contact.ts
    └── reservation.ts
```

## 핵심 아키텍처

- `createMcpServer()`에서 모든 도구를 등록합니다.
- stdio 모드에서는 프로세스당 단일 MCP 서버를 사용합니다.
- HTTP 모드에서는 세션마다 별도 `McpServer`와 transport 인스턴스를 생성합니다.
- 바인딩 토큰은 8자리 hex 문자열입니다.

## 저장 구조

기본 데이터 디렉터리:

```text
~/.dooboo/
├── db.sqlite
└── images/
```

설명:

- `db.sqlite`: 서버 목록, API 토큰, bind 토큰 저장
- `images/`: 다운로드 파일 및 티켓 이미지 캐시

관련 환경변수:

- `PORT`: HTTP 서버 포트 변경
- `DOOBOO_HOST_DATA_DIR`: Docker 등에서 컨테이너 내부 경로를 호스트 경로로 매핑할 때 사용

## DB 스키마

- `servers`
  - `id`
  - `url`
- `tokens`
  - `server_id`
  - `token`
- `bindings`
  - `bind_token`
  - `server_id`
  - `created_at`

DB 동작:

- WAL 모드 활성화
- foreign key 활성화

## Dooray 연결 방식

- `register_server(url)`로 Dooray 사이트 URL을 저장합니다.
- `register_token(server_id, token)`으로 API 토큰을 저장합니다.
- `bind(server_id)`로 짧은 `bind_token`을 발급합니다.
- 이후 모든 실제 Dooray 도구는 `bind_token`을 사용합니다.

`src/client.ts`에서 다음을 처리합니다.

- Dooray 사이트 URL로부터 API base URL 자동 파생
- 일반 JSON API 호출
- 파일 다운로드의 307 redirect 수동 처리
- 파일 업로드의 redirect 처리

## 도구 설계 원칙

- 도구 이름은 snake_case를 사용합니다.
- 기본 CRUD 도구와 탐색/보조 도구를 같은 도메인 파일에 배치합니다.
- 응답은 `helpers.ts`의 `ok`, `err`, `okList`를 통해 일관된 텍스트 JSON 형식으로 반환합니다.
- 검색성 높은 도구는 목록 응답을 요약 형태로 반환하고, 상세 도구에서 전체 payload를 반환합니다.

## 주요 도메인 메모

### Post

- Dooray API의 `post`는 사용자 관점에서 업무(Task)입니다.
- `find_task_by_ticket`는 `PROJ-123` 같은 티켓 번호로 업무를 찾는 보조 도구입니다.
- `download_file`은 범용 파일 다운로드 도구입니다.

### Wiki

- Dooray 위키는 한 번에 한 depth만 자연스럽게 탐색할 수 있습니다.
- 문서 탐색은 `search_wiki_tree`로 시작하고, 내용이 필요하면 `get_wiki_page`를 사용합니다.

### Files

- 이미지/첨부파일 다운로드는 `~/.dooboo/images` 아래에 저장됩니다.
- 용량이 커지면 오래된 파일부터 정리합니다.

## 문서 수정 원칙

- README는 사용자 실행 관점으로 유지합니다.
- CLAUDE.md는 유지보수자 관점의 구현 메모를 적습니다.
- 코드에 없는 기능이나 지원 방식은 문서에 단정적으로 쓰지 않습니다.
- 실행 방식, 저장 구조, 도구 예시는 `src/index.ts`, `src/db.ts`, `src/client.ts`, `src/tools/*.ts` 기준으로 맞춥니다.

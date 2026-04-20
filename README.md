# 두부 (dooboo)

Dooray API를 MCP(Model Context Protocol) 서버로 제공하는 Bun 기반 프로젝트입니다.

기본 Dooray API를 MCP 도구로 노출하고, 티켓 검색이나 파일 다운로드처럼 에이전트 사용에 맞춘 보조 도구도 함께 제공합니다.

## 개요

- 런타임: Bun
- 언어: TypeScript
- MCP 전송:
  - stdio
  - Streamable HTTP (`/mcp`)
- 저장소: SQLite (`bun:sqlite`)
- 로컬 데이터 디렉터리: `~/.dooboo`

## 실행 방식

### 1. stdio 실행

Codex 같은 로컬 MCP 클라이언트에 연결할 때 권장되는 방식입니다.

```bash
bun install
bun run src/index.ts --stdio
```

Codex 등록 예시:

```bash
codex mcp add dooboo -- bun --cwd /absolute/path/to/dooboo run src/index.ts --stdio
```

### 2. Streamable HTTP 실행

HTTP MCP 서버로 띄울 때 사용합니다.

```bash
bun install
bun run dev
```

기본 포트는 `12701`이며, `PORT` 환경변수로 변경할 수 있습니다.

```bash
PORT=8080 bun run dev
```

엔드포인트:

```text
http://localhost:12701/mcp
```

## Docker

```bash
docker compose up -d
```

Docker 환경에서 호스트 경로를 MCP 응답에 노출해야 하면 `DOOBOO_HOST_DATA_DIR`를 사용할 수 있습니다.

## 로컬 저장 구조

기본 저장 위치는 `~/.dooboo/` 입니다.

```text
~/.dooboo/
├── db.sqlite            # 서버, 토큰, 바인딩 저장
└── images/              # 다운로드한 첨부파일/이미지 캐시
```

추가 사항:

- SQLite는 WAL 모드로 동작합니다.
- `find_task_by_ticket`와 `download_file` 같은 도구는 파일을 로컬에 저장할 수 있습니다.
- 이미지 캐시는 용량이 커지면 오래된 파일부터 정리합니다.

## 사용 흐름

최초 설정:

1. `register_server`
2. `register_token`
3. `bind`
4. 발급받은 `bind_token`으로 실제 Dooray 도구 호출

일반 사용:

1. `list_servers`
2. `bind`
3. `bind_token`으로 도구 호출

## 주요 도구 범주

### 서버 관리

- `register_server`
- `register_token`
- `list_servers`
- `bind`

### Common

- 멤버 조회
- Incoming Hook 생성/조회/삭제

### Project

- 프로젝트 조회/생성
- 업무 워크플로우 관리
- 태그/마일스톤/멤버/템플릿 관리

### Post

- 업무(Task) 조회/생성/수정/이동
- 댓글 관리
- 첨부파일 업로드/삭제/다운로드
- `find_task_by_ticket`
- `download_file`

### Calendar

- 캘린더/이벤트 조회 및 생성

### Messenger

- 채널 조회/생성
- 메시지 전송 및 수정

### Wiki

- 위키/페이지 조회
- 트리 탐색 (`search_wiki_tree`)
- 페이지/댓글 수정

### Drive

- 드라이브/파일/폴더 조회 및 관리
- 공유 링크 관리
- 파일 업로드/복사/이동

### Contact

- 주소록 조회/검색

### Reservation

- 자원/예약 조회 및 생성/수정

## MCP 클라이언트 설정 예시

### stdio 예시

```json
{
  "mcpServers": {
    "dooboo": {
      "command": "bun",
      "args": ["--cwd", "/absolute/path/to/dooboo", "run", "src/index.ts", "--stdio"]
    }
  }
}
```

### Streamable HTTP 예시

```json
{
  "mcpServers": {
    "dooboo": {
      "type": "streamable-http",
      "url": "http://localhost:12701/mcp"
    }
  }
}
```

## Dooray API 메모

- API base URL은 Dooray 사이트 도메인에 따라 자동 결정됩니다.
- 지원 도메인:
  - `*.dooray.com`
  - `*.dooray.co.kr`
  - `*.gov-dooray.com`
  - `*.gov-dooray.co.kr`
- 인증 헤더:

```text
Authorization: dooray-api {token}
```

### 파일 다운로드

Dooray 파일 다운로드는 307 리다이렉트를 수동 처리합니다.

1. API 요청
2. `location` 헤더 확인
3. 인증 헤더를 유지한 채 redirect URL 재요청

`redirect: "follow"`에 의존하지 않는 이유는 리다이렉트 과정에서 인증 헤더가 누락될 수 있기 때문입니다.

## 참고

- 유지보수 문서는 [CLAUDE.md](/Users/ljh/workspace/etc/dooboo/CLAUDE.md)에 정리되어 있습니다.

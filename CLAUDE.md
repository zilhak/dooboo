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
    ├── common.ts           # Common API (멤버, Incoming Hook)
    ├── project.ts          # Project API (31개)
    ├── post.ts             # Post/Task API (19개)
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

## Dooray API 참고

- API 베이스 URL: `https://api.dooray.com`
- 인증: 헤더 `Authorization: dooray-api {token}`

# 두부 (dooboo)

Dooray API를 MCP(Model Context Protocol) 서버로 제공하는 프로젝트.

## 개요

Dooray의 기본 API들을 MCP 도구로 노출하고, 추가로 커스텀 도구들을 제공하여 AI 에이전트가 Dooray 워크스페이스와 상호작용할 수 있게 한다.

## 기술 스택

- **런타임**: Bun
- **언어**: TypeScript
- **MCP 전송**: Streamable HTTP (`/mcp`)
- **저장소**: SQLite via `bun:sqlite` (`~/.dooboo/db.sqlite`)

## 실행

```bash
# 의존성 설치
bun install

# 서버 실행 (기본 포트: 12701)
bun run dev

# 포트 변경
PORT=8080 bun run dev
```

## Docker

```bash
docker compose up -d
```

## 저장 구조

```
~/.dooboo/
└── db.sqlite       # 서버 목록, 토큰, 바인딩 데이터
```

서버는 `~/.dooboo/` 디렉토리를 자체 저장 공간으로 사용한다. 첫 실행 시 자동 생성된다.

## MCP 도구

### 서버 관리

| 도구 | 설명 |
|------|------|
| `register_server` | Dooray 사이트 URL 등록 |
| `register_token` | 서버에 API 인증 토큰 등록 |
| `list_servers` | 등록된 서버 목록 조회 (토큰 값은 숨김) |

### 바인딩

| 도구 | 설명 |
|------|------|
| `bind` | 서버에 바인드하여 세션 토큰 발급 |

AI 에이전트는 실제 API 토큰을 알 필요 없이, `bind`로 발급받은 짧은 해시 토큰을 사용하여 이후 도구를 호출한다. 서버가 내부적으로 실제 토큰을 매핑하여 Dooray API를 호출한다.

### Dooray API

- Common (멤버, Incoming Hook)
- Project (프로젝트, 워크플로우, 태그, 마일스톤, 멤버, 템플릿)
- Post (업무 CRUD, 댓글, 첨부파일)
- Calendar (캘린더, 이벤트)
- Messenger (대화방, 메시지)
- Wiki (위키, 페이지, 댓글, 공유링크)
- Drive (드라이브, 파일, 폴더, 공유링크)
- Contact (주소록)
- Reservation (자원 예약)

## MCP 클라이언트 설정 예시

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

## 라이선스

(추가 예정)

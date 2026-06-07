# Licks — 기타 릭 TAB 라이브러리 (설계 문서)

- 날짜: 2026-06-07
- 상태: 승인됨 (구현 진행)

## 1. 한 줄 정의
내가 수집한 기타 릭(lick)을, 프렛 클릭 에디터로 입력하고 TAB로 저장·검색하는 개인용 클라우드 웹 서비스.

## 2. 핵심 결정 요약
| 항목 | 결정 |
|---|---|
| 사용자 | 나 혼자 (단일 계정 비밀번호 로그인) |
| TAB 입력 | 구조화 에디터 (6줄 그리드, 프렛 클릭) |
| 음악 상세도 | 프렛 + 기본 주법 (h/p/슬라이드 up·down/벤딩/비브라토) |
| 정리·검색 | 태그, 키워드 검색, 메모/출처 |
| 스택 | Next.js (App Router) + TypeScript, Drizzle ORM + libSQL |
| 배포 | Vercel + Turso |

## 3. 아키텍처
```
[브라우저]
   │  (Server Components로 읽기, Server Actions로 쓰기)
[Next.js on Vercel]
   │  middleware.ts → 단일 비밀번호 세션 쿠키 검사
   │  Drizzle ORM
[Turso (libSQL / 호스팅 SQLite)]
```
- 별도 API 서버 없음. Next.js 한 덩어리.
- 읽기는 Server Component에서 직접 DB 조회, 쓰기는 Server Action.
- 개발: 로컬 SQLite 파일(`file:./local.db`). 운영: Turso(libSQL HTTP).

## 4. 데이터 모델 (핵심)
TAB는 구조화 JSON으로 저장하고, 화면에선 그리드 에디터로 편집 + ASCII로도 렌더(복사용).

```ts
type Articulation = "h" | "p" | "/" | "\\" | "b" | "~";
// h=hammer-on, p=pull-off, /=slide up, \=slide down, b=bend, ~=vibrato

interface Note {
  string: 0 | 1 | 2 | 3 | 4 | 5; // 0 = 가장 낮은 줄(저음 E), 5 = 가장 높은 줄(고음 e)
  fret: number;                   // 0..24
  artic?: Articulation;
}
interface Column { notes: Note[] } // 한 칸(동시 음 = 더블스톱/코드 허용)

interface Lick {
  id: string;
  title: string;
  tuning: string[];   // 길이 6, 기본 ["E","A","D","G","B","e"] (index 0 = 저음)
  tab: Column[];      // 왼 → 오 시간 순서
  memo: string;
  source: string;     // 곡명 / 유튜브 링크 등
  createdAt: number;
  updatedAt: number;
}
```

### DB 스키마 (Drizzle / libSQL)
- `licks`: `id` TEXT PK, `title` TEXT, `tuning` TEXT(JSON 배열), `tab` TEXT(JSON `Column[]`), `memo` TEXT, `source` TEXT, `created_at` INTEGER, `updated_at` INTEGER.
- `tags`: `id` TEXT PK, `name` TEXT UNIQUE.
- `lick_tags`: `lick_id` TEXT, `tag_id` TEXT, PK(lick_id, tag_id). 태그 필터링용 조인.

**설계 근거**
- 릭 하나는 통째로 읽고 쓰는 단위 → `tab`을 JSON TEXT로 담아 에디터 구조를 그대로 보존, 정규화 복잡도 제거.
- 태그만 조인으로 분리 → 태그 목록/자동완성/필터를 깔끔하게.
- 검색은 title/memo/태그 대상 LIKE (개인 규모엔 충분). 추후 FTS5 확장 가능.

## 5. TAB 에디터 (제품의 심장)
- 6줄 × N칸 그리드. 칸 클릭 → 프렛 숫자 입력(키보드 0–24, 2자리 지원).
- 음표 선택 후 단축키로 주법 토글: `h p / \ b ~` (한 번 더 누르면 해제).
- 우측 끝 `+`로 칸 추가, 칸 우클릭/Del로 삭제. 빈 칸은 휴지(rest).
- 상단에 같은 데이터를 ASCII TAB로 실시간 미리보기 + 복사 버튼:
  ```
  e|-----------------|
  B|--8b-----5--------|
  G|-----7h9----7-----|
  D|------------------|
  A|------------------|
  E|------------------|
  ```
- 튜닝 드롭다운(스탠다드 / Drop D 등)으로 줄 라벨만 변경.

### 직렬화 규칙 (JSON ↔ ASCII)
- 각 줄(string)을 한 행으로, 각 칸을 좌→우로 이어 붙임.
- 음표 칸: 프렛 숫자 + (artic 기호). 빈 음표 칸: 프렛 폭만큼 `-`.
- 칸 폭은 그 칸에서 가장 넓은 셀(숫자 자릿수 + 기호)에 맞춰 패딩 → 줄 정렬 유지.
- 왕복(round-trip) 단위 테스트로 보장: `toAscii(parseFromEditor(x)) === toAscii(x)`.

## 6. 화면 구성 (4개)
1. **라이브러리(홈) `/`**: 릭 카드 그리드(제목·미니 TAB·태그). 상단 검색창 + 태그 필터 칩.
2. **릭 상세 `/licks/[id]`**: 큰 TAB 렌더, 메모/출처, 태그. 편집·삭제 버튼.
3. **에디터 `/licks/new`, `/licks/[id]/edit`**: 5번 에디터 + 메타 폼(제목·태그·메모·출처·튜닝).
4. **로그인 `/login`**: 비밀번호 한 칸.

## 7. 인증 (최소)
- `APP_PASSWORD` 환경변수 1개. 로그인 시 검증 → 서명된 httpOnly 쿠키(JWT, `jose`).
- `middleware.ts`가 `/login`·정적 자산 외 모든 경로 보호. 회원가입·다중 사용자 없음.
- `SESSION_SECRET`로 JWT 서명. 만료 30일, 슬라이딩 갱신은 비범위.

## 8. 백업·내보내기
- 인앱 JSON 내보내기/가져오기(전체 릭 dump/restore).
- 인프라 백업은 `turso db dump`.

## 9. 테스트 전략
- 단위: TAB JSON ↔ ASCII 직렬화 왕복 검증, 태그 필터/검색 로직.
- 컴포넌트: 에디터 상호작용(프렛 입력·주법 토글·칸 추가/삭제).
- (선택) E2E(Playwright): 생성 → 검색 → 편집 흐름 1개.

## 10. 환경 변수
| 이름 | 용도 |
|---|---|
| `TURSO_DATABASE_URL` | 운영 DB(libSQL) URL. 로컬은 `file:./local.db` |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰(운영) |
| `APP_PASSWORD` | 단일 로그인 비밀번호 |
| `SESSION_SECRET` | 세션 JWT 서명 키 |

## 11. 명시적 비범위 (YAGNI)
- 다중 사용자/공유, 음원 재생, 박자·악보 출력(PDF), 모바일 네이티브 앱, AI 자동 채보 — 전부 제외.

# Licks — 기타 릭 TAB 라이브러리

개인용. 프렛 클릭 에디터로 기타 릭을 입력하고 TAB로 저장·검색한다.

- 구조화 TAB 에디터(6줄 그리드, 프렛 클릭, 주법 `h p / \ b ~`)
- 태그 / 키워드 검색 / 메모·출처
- 단일 비밀번호 로그인
- JSON 내보내기·가져오기 백업
- Next.js(App Router) + Drizzle + libSQL(Turso)

## 로컬 개발

1. 환경변수 설정:
   ```bash
   cp .env.example .env
   ```
   `.env`에서 `APP_PASSWORD`와 `SESSION_SECRET`(32바이트 이상)을 채운다.
2. 의존성 설치 & DB 마이그레이션:
   ```bash
   npm install
   npm run db:migrate
   ```
3. 개발 서버:
   ```bash
   npm run dev
   ```
   `http://localhost:3000` → 로그인 후 사용.

## 테스트

```bash
npm test
```

## 배포 (Vercel + Turso)

1. Turso DB 생성:
   ```bash
   turso db create licks
   turso db show licks --url      # → TURSO_DATABASE_URL
   turso db tokens create licks   # → TURSO_AUTH_TOKEN
   ```
2. 스키마 적용(로컬에서 위 값을 환경변수로 두고 실행):
   ```bash
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:migrate
   ```
3. Vercel에 프로젝트를 임포트하고 환경변수 등록:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, `SESSION_SECRET`
4. 배포.

## 백업

- 앱 내 **내보내기** 버튼으로 전체 릭을 JSON으로 저장, **가져오기**로 복원.
- 인프라 레벨: `turso db dump licks`.

## 설계 문서

- 스펙: `docs/superpowers/specs/2026-06-07-licks-tab-library-design.md`
- 구현 계획: `docs/superpowers/plans/2026-06-07-licks-tab-library.md`

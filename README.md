# ♪ Woodshed — 기타 릭 공유 커뮤니티

기타리스트가 릭(짧은 프레이즈)을 **프렛 클릭 에디터**로 적고, TAB로 저장·공유·발견하는 커뮤니티.

- 구조화 TAB 에디터(6줄 그리드, 프렛 클릭, 주법 `h p / \ b ~`, 풀/하프 벤딩·슬라이드·비브라토)
- OAuth 로그인(Google), 사용자 핸들·프로필
- 공개 범위(공개 / 링크 공유 / 비공개), 소유권 기반 권한
- 공개 발견: Explore 피드, 프로필 `/u/[handle]`, 공유 링크
- 소셜: 좋아요, 댓글, 컬렉션(플레이리스트)
- 영어/한국어 i18n
- Next.js(App Router) + Drizzle + libSQL(Turso)

## 로컬 개발

1. 환경변수:
   ```bash
   cp .env.example .env
   ```
   `AUTH_SECRET`을 채운다(`npx auth secret` 또는 `openssl rand -base64 33`).
   OAuth 자격증명이 없으면 `AUTH_DEV_LOGIN=1`로 개발용 모의 로그인 사용.
2. 설치 & 마이그레이션:
   ```bash
   npm install
   npm run db:migrate
   ```
3. 개발 서버:
   ```bash
   npm run dev   # http://localhost:3000
   ```

## OAuth 자격증명 (실로그인)

- Google: https://console.cloud.google.com → OAuth client(Web). 콜백 `…/api/auth/callback/google`
- `.env`에 `AUTH_GOOGLE_ID/SECRET` 입력 후 `AUTH_DEV_LOGIN=0`.

## 테스트

```bash
npm test
```

## 배포 (Vercel + Turso)

1. Turso DB 생성:
   ```bash
   turso db create woodshed
   turso db show woodshed --url      # → TURSO_DATABASE_URL
   turso db tokens create woodshed   # → TURSO_AUTH_TOKEN
   ```
2. 스키마 적용:
   ```bash
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:migrate
   ```
3. Vercel 환경변수: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`,
   `AUTH_GOOGLE_ID/SECRET`. (`AUTH_DEV_LOGIN`은 등록하지 않음)
4. 배포 후 운영자 계정으로 로그인 → 레거시 릭이 있으면 `licksRepo.claimOrphans`로 귀속.

## 백업

- 인프라 레벨: `turso db dump woodshed`.

## 설계 문서

- 스펙: `docs/superpowers/specs/2026-06-07-licks-tab-library-design.md`
- 구현 계획: `docs/superpowers/plans/2026-06-07-licks-tab-library.md`
- 커뮤니티 로드맵: `~/.claude/plans/mighty-painting-bengio.md`

# MCE Slack 브릿지

Slack 메시지를 받아 **이 PC의 Claude Code(CLI)** 로 처리하고 결과를 회신한다.
Socket Mode를 쓰므로 공개 IP·포트개방·터널이 필요 없다. PC가 켜져 있기만 하면 동작한다.

> **두 가지 대화 방식** (`@slack/bolt` v4 기준)
> - **Assistant 모드 (기본)** — 좌측 사이드바의 전용 어시스턴트 패널에서 멘션 없이 바로 대화한다. 자동으로 스레드가 잡히고 "처리 중…" 상태가 표시되며, 답변이 패널 안에만 쌓여 채널이 더러워지지 않는다.
> - **채널 @멘션 모드 (호환용)** — 채널에서 봇을 멘션하면 스레드로 답한다. 기존 방식 그대로 함께 동작한다.

---

## Slack 앱 설정 (토큰 2개 발급)

### 1. 앱 생성
1. https://api.slack.com/apps 접속 → **Create New App** → **From scratch**
2. App Name(예: `MCE봇`) 입력, 사용할 워크스페이스 선택 → **Create App**

### 2. Socket Mode 켜기 → App 토큰(xapp-) 발급
1. 좌측 **Settings → Socket Mode** → 토글 **Enable Socket Mode** 켜기
2. 토큰 이름 입력(예: `socket`) → 자동으로 `connections:write` 권한의 **App-Level Token** 생성
3. `xapp-` 로 시작하는 토큰 **복사** → `.env` 의 `SLACK_APP_TOKEN` 에 붙여넣기

### 3. Assistant(에이전트) 기능 켜기 — Assistant 모드용
1. 좌측 **Features → Agents & AI Apps**(또는 **App Home**의 Assistant 항목) → **활성화(Enable)**
2. 이 기능을 켜야 좌측 사이드바에 어시스턴트 패널이 나타나고 Assistant 모드가 동작한다.
   (이 단계를 건너뛰면 패널이 안 보이고 채널 @멘션 모드만 쓸 수 있다.)

### 4. 봇 권한(Scope) 추가
1. 좌측 **Features → OAuth & Permissions** → **Scopes → Bot Token Scopes**
2. 다음 권한 추가:
   - `app_mentions:read` (멘션 읽기 — 채널 @멘션 모드)
   - `chat:write` (메시지 보내기 — 공통)
   - `assistant:write` (어시스턴트 패널 응답 — Assistant 모드)
   - `im:history` (어시스턴트 스레드 메시지 읽기 — Assistant 모드)

### 5. 이벤트 구독
1. 좌측 **Features → Event Subscriptions** → **Enable Events** 켜기
2. **Subscribe to bot events** → **Add Bot User Event** 로 아래 이벤트 추가 → **Save Changes**
   - `app_mention` (채널 @멘션 모드)
   - `assistant_thread_started` (Assistant 모드 — 패널 대화 시작)
   - `assistant_thread_context_changed` (Assistant 모드 — 컨텍스트 변경)
   - `message.im` (Assistant 모드 — 패널 사용자 메시지)

### 6. 워크스페이스에 설치 → Bot 토큰(xoxb-) 발급
1. 좌측 **Settings → Install App** → **Install to Workspace** → 허용
2. **Bot User OAuth Token** (`xoxb-` 로 시작) **복사** → `.env` 의 `SLACK_BOT_TOKEN` 에 붙여넣기

> ⚠️ 스코프·이벤트를 나중에 추가하면 **반드시 Reinstall** 해야 반영된다. (Install App 페이지에서 재설치)

### 7. 채널에 봇 초대 (채널 @멘션 모드를 쓸 때)
- 사용할 Slack 채널에서: `/invite @MCE봇`
- Assistant 모드만 쓸 거면 채널 초대 없이 좌측 사이드바의 봇(어시스턴트)을 열어 바로 입력하면 된다.

---

## 실행

```powershell
# 1) .env.example 을 .env 로 복사 후 토큰 2개 채우기
Copy-Item slack-bridge\.env.example slack-bridge\.env

# 2) 실행
npm start --prefix slack-bridge
```

콘솔에 `⚡ MCE Slack 브릿지 실행 중 (Socket Mode · Assistant 모드)` 이 뜨면 성공.

**사용 방법 (택1)**

- **Assistant 모드** — 좌측 사이드바에서 봇(어시스턴트)을 열고 바로 입력. 첫 진입 시 추천 프롬프트가 뜬다.
- **채널 @멘션 모드** — 채널에서 봇을 멘션:
  ```
  @MCE봇 이탈 고객 캠페인 만들어줘
  ```

두 방식 모두 **같은 스레드(또는 같은 어시스턴트 대화)에서 이어 말하면 대화가 유지**된다(`--resume`). 캠페인 선택·승인 등 수동 모드 후속 질문에 그대로 응답할 수 있다.

**누적 사용량 조회**: 대화 중 `사용량`(또는 `usage`) 이라고 입력하면 해당 대화의 처리 횟수·누적 비용을 보여준다.

---

## 봇 메시지 정리 — `cleanup.js`

봇이 채널에 남긴 **자기 메시지를 일괄 삭제**하는 1회용 유틸이다. (사용자 메시지는 `chat:write`로 지울 수 없다.)

```powershell
node slack-bridge\cleanup.js <채널이름 또는 채널ID>
# 예: node slack-bridge\cleanup.js mce-bot
```

- 채널 히스토리를 읽어야 하므로 채널 종류에 맞는 `history` 스코프(`channels:history` / `groups:history` 등)가 필요하다. 스코프가 없으면 `missing_scope` 오류와 함께 필요한 스코프를 안내한다.

---

## 참고
- 봇은 사람이 "허용"을 못 누르므로 `--dangerously-skip-permissions` 로 자동 승인한다.
  보안이 신경 쓰이면 `.claude/settings.json` 의 `allowedTools` 화이트리스트(sfmc 도구만)로 대체 가능.
- **무응답일 때 1순위 점검** — 이 PC에서 `npm start --prefix slack-bridge` 프로세스가 떠 있는지 확인한다. Socket Mode는 이 프로세스가 살아 있을 때만 연결되므로, 꺼져 있으면 멘션·패널 입력 모두 무응답이다.
- 이 PC가 꺼지면 봇도 멈춘다. 상시 운영하려면 PC 절전 해제 또는 서비스 등록 필요.
- 의존성: `@slack/bolt` v4 (Assistant API 사용). 구버전(v3)에서는 Assistant 모드가 동작하지 않는다.

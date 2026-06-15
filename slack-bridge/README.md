# MCE Slack 브릿지

Slack 메시지를 받아 **이 PC의 Claude Code(CLI)** 로 처리하고 결과를 회신한다.
Socket Mode를 쓰므로 공개 IP·포트개방·터널이 필요 없다. PC가 켜져 있기만 하면 동작한다.

---

## Slack 앱 설정 (토큰 2개 발급)

### 1. 앱 생성
1. https://api.slack.com/apps 접속 → **Create New App** → **From scratch**
2. App Name(예: `MCE봇`) 입력, 사용할 워크스페이스 선택 → **Create App**

### 2. Socket Mode 켜기 → App 토큰(xapp-) 발급
1. 좌측 **Settings → Socket Mode** → 토글 **Enable Socket Mode** 켜기
2. 토큰 이름 입력(예: `socket`) → 자동으로 `connections:write` 권한의 **App-Level Token** 생성
3. `xapp-` 로 시작하는 토큰 **복사** → `.env` 의 `SLACK_APP_TOKEN` 에 붙여넣기

### 3. 봇 권한(Scope) 추가
1. 좌측 **Features → OAuth & Permissions** → **Scopes → Bot Token Scopes**
2. 다음 2개 추가:
   - `app_mentions:read` (멘션 읽기)
   - `chat:write` (메시지 보내기)

### 4. 이벤트 구독
1. 좌측 **Features → Event Subscriptions** → **Enable Events** 켜기
2. **Subscribe to bot events** → **Add Bot User Event** → `app_mention` 추가 → **Save Changes**

### 5. 워크스페이스에 설치 → Bot 토큰(xoxb-) 발급
1. 좌측 **Settings → Install App** → **Install to Workspace** → 허용
2. **Bot User OAuth Token** (`xoxb-` 로 시작) **복사** → `.env` 의 `SLACK_BOT_TOKEN` 에 붙여넣기

### 6. 채널에 봇 초대
- 사용할 Slack 채널에서: `/invite @MCE봇`

---

## 실행

```powershell
# 1) .env.example 을 .env 로 복사 후 토큰 2개 채우기
Copy-Item slack-bridge\.env.example slack-bridge\.env

# 2) 실행
npm start --prefix slack-bridge
```

콘솔에 `⚡ MCE Slack 브릿지 실행 중` 이 뜨면 성공.
채널에서 봇을 멘션해 사용:

```
@MCE봇 이탈 고객 캠페인 만들어줘
```

같은 스레드에서 다시 멘션하면 **대화가 이어진다**(캠페인 선택·승인 등 후속 질문 응답 가능).

---

## 참고
- 봇은 사람이 "허용"을 못 누르므로 `--dangerously-skip-permissions` 로 자동 승인한다.
  보안이 신경 쓰이면 `.claude/settings.json` 의 `allowedTools` 화이트리스트(sfmc 도구만)로 대체 가능.
- 이 PC가 꺼지면 봇도 멈춘다. 상시 운영하려면 PC 절전 해제 또는 서비스 등록 필요.

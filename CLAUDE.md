# MCE 캠페인 자동화 — 프로젝트 가이드

이 저장소는 **MCE(SFMC Marketing Cloud Engagement) 캠페인 자동화** 도구다.
사용자가 만들고 싶은 캠페인을 **간략한 한 문장**(예: "신규 회원 캠페인 생성", "이탈 고객 캠페인")으로 입력하면,
**메인 루프(이 에이전트)가 처음부터 끝까지 직접** ① 주제 선정 → ② 기획/정의서 → ③ Journey 생성을 수행한다.

> **단일 에이전트 원칙**: 서브에이전트로 위임하지 않는다. 메인 루프가 사용자와 직접 대화하면서 동시에 MCP 도구(`sfmc_*`)를 직접 호출한다.
> 수동 모드의 단계별 합의·승인과 자동 모드의 일괄 실행이 모두 한 흐름 안에서 이뤄진다.

---

## ⭐ 라우팅 — 캠페인 작업은 `mce-campaign` 스킬로

아래 의도가 감지되면 **반드시 `mce-campaign` 스킬을 먼저 로드**하여 그 절차(STEP 1~4)를 따른다.
캠페인 생성의 모든 상세 절차·참조 데이터·검증된 페이로드는 그 스킬 안에 있다.

**트리거 (하나라도 해당되면 `mce-campaign` 로드):**
- 캠페인 생성/추천/리스트업 요청 — "캠페인 만들어줘", "신규회원/이탈/장바구니/생일/쿠폰 캠페인", "어떤 캠페인 만들 수 있어", "캠페인 목록"
- 저니(Journey) 생성 요청 — "저니 만들어줘", "journey 생성"
- 정의서(xlsx / CSV / Google Sheets) 첨부 또는 "이 정의서로 저니 생성"
- 그 외 SFMC Journey Builder / Event Definition / Decision·Engagement Split 관련 작업

스킬 본문: [`.claude/skills/mce-campaign/SKILL.md`](.claude/skills/mce-campaign/SKILL.md)
참조 데이터: `.claude/skills/mce-campaign/reference/` (진입 DE·저니 페이로드·이메일 표준·고정값·오류 학습)

---

## 결과만 전달 (과정 비노출) — 전역 원칙

진행 과정·중간 작업·"이제 ~를 조회합니다 / 생성합니다 / 확인합니다" 같은 설명은 출력하지 않는다.
도구 호출이나 내부 처리 과정을 설명하지 말고 **결과물만** 전달한다.
사용자에게 노출하는 것은 ① 단계 전환에 필요한 질문(캠페인 선택·모드 선택·Plan 승인), ② 최종 결과 보고, ③ 오류 — 이 셋뿐이다.
자동 모드는 무발화 일괄 실행 후 마지막 결과만, 수동 모드도 도구 호출 사이에 진행 멘트를 넣지 않는다. (상세 규칙은 SKILL.md 참조)

---

## 경로 자동 적용 규칙 (다른 PC에서 실행 시 필수)

> 아래 절대경로는 **작성 당시 PC 기준 예시**다. 사용자명·드라이브·폴더 위치는 PC마다 다르므로 **그대로 쓰지 말 것.**
> **항상 현재 작업 디렉토리(cwd = 이 저장소가 clone된 위치)를 "프로젝트 루트"로 삼고, 모든 경로를 그 기준으로 도출**한다.
> cwd가 예시 경로와 다르면 **무조건 cwd를 우선**한다. (별도 설치/치환 스크립트 불필요 — 런타임에 알아서 적용)

- **프로젝트 루트**: 현재 cwd (환경 정보의 working directory) — *예시: `C:\Users\MILVUS\Desktop\mce-packege-v2-main`*
- **정의서 폴더**: `<프로젝트 루트>\campaign_definitions`
- **정의서 생성 스크립트**: `generate_campaign_definition.js` (`__dirname` 기준 자동 처리)

스킬 본문/참조 파일에 등장하는 모든 `C:\Users\MILVUS\...` 예시 경로도 동일하게 **현재 프로젝트 루트로 치환**하여 사용한다.

---

## Google Sheets 정의서 (직접 첨부 입력 시)

- **Spreadsheet ID**: `1QMILA9OOVJ6bqydgG9UQP8pgBTRBttcWsr4_PdNXltc`
- **URL**: `https://docs.google.com/spreadsheets/d/1QMILA9OOVJ6bqydgG9UQP8pgBTRBttcWsr4_PdNXltc`
- Apps Script는 사용하지 않는다.

---

## 저니 생성 이력

- 저니 생성 결과는 `<프로젝트 루트>\.claude\journey_history.md` 에 누적 append 한다. (형식은 SKILL.md STEP 4 참조)
- `MEMORY.md` 인덱스에는 등록하지 않는다. (자동 로딩 방지)

---

## 참고 — 기존 서브에이전트 파일

`.claude/agents/mce-topic-agent.md`, `mce-planning-agent.md`, `mce-journey-agent.md` 3개 파일은 **롤백/참고용으로 보존**되어 있으나 현재 워크플로우에서는 **사용하지 않는다.** 모든 단계는 메인 루프가 `mce-campaign` 스킬을 따라 직접 수행한다.

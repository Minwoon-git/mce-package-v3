# MCE 캠페인 자동화 통합 에이전트 — 오케스트레이터

이 문서는 **통합 캠페인 에이전트**의 오케스트레이터 정의다.
사용자가 만들고 싶은 MCE 캠페인을 **간략한 한 문장**(예: "신규 회원을 위한 캠페인 생성", "이탈 고객을 위한 캠페인 생성")으로 입력하면,
3개의 서브에이전트를 순서대로 구동하여 정확한 MCE 캠페인을 완성한다.

> **서브에이전트는 실행 중 사용자와 대화할 수 없다.** 따라서 사용자와의 대화·확인·선택은 **메인 루프(이 오케스트레이터)** 가 직접 처리하고,
> 한 번에 끝나는 작업(DE 분석 / 정의서 생성 / Journey 생성)만 서브에이전트(Agent 도구)에 위임한다.

---

## 시트 정보 (Google Sheets 정의서 입력 시)

- **Spreadsheet ID**: `1QMILA9OOVJ6bqydgG9UQP8pgBTRBttcWsr4_PdNXltc`
- **URL**: `https://docs.google.com/spreadsheets/d/1QMILA9OOVJ6bqydgG9UQP8pgBTRBttcWsr4_PdNXltc`

> Apps Script는 사용하지 않는다.

---

## 3개 서브에이전트 구성

| 단계 | 에이전트 | 역할 | 호출 방식 |
|---|---|---|---|
| **①** | `mce-topic-agent` | MC에 연결된 Data Extension을 읽어 **생성 가능한 캠페인 목록** 추천 | Agent 도구 (1회 실행) |
| **②** | `mce-planning-agent` | 선택된 캠페인의 **Plan 설계 + xlsx 정의서 생성** | Agent 도구 (1회 실행) / 수동 모드는 메인 루프가 대화로 진행 후 위임 |
| **③** | `mce-journey-agent` | Plan/정의서 기반 **SFMC Journey 생성** | Agent 도구 (1회 실행) |

---

## 전체 흐름

```
사용자: "신규 회원을 위한 캠페인 생성"
   │
   ▼
[STEP 1] ① mce-topic-agent  →  연결된 DE 분석 → 캠페인 후보 목록 추천
   │        → 사용자가 만들 캠페인을 선택   (※ 모드와 무관, 항상 동일)
   │
   ▼
[STEP 2] 실행 모드 선택  ──  수동 / 자동   (※ 기획부터 적용)
   │        ② mce-planning-agent  →  Plan 설계 + xlsx 정의서
   │        (수동: 메인 루프가 대화로 Plan 합의 후 정의서 생성)
   │        (자동: 에이전트가 기본값으로 일괄 설계 → 그대로 STEP 3까지 진행)
   ▼
[STEP 3] ③ mce-journey-agent  →  SFMC Journey 생성 (기본 Draft)
   │
   ▼
[STEP 4] 결과 보고
```

> 사용자가 정의서(xlsx/CSV/Google Sheets)를 **직접 첨부**한 경우 STEP 1·2를 건너뛰고 STEP 3(저니 생성)으로 바로 이동한다.

---

## STEP 1. ① 주제 선정 — `mce-topic-agent`

> **모드 선택과 무관하게 항상 동일하게 동작한다.** 주제 선정은 "연결된 DE를 읽어 캠페인을 추천"하는 단계다.

사용자의 간략한 의도(예: "신규 회원", "이탈 고객", "장바구니 이탈")를 그대로 전달하여 `mce-topic-agent`를 호출한다.

이 에이전트는:
1. MC 계정에 연결된 Data Extension 목록과 필드를 읽고
2. 사용자 의도에 부합하는 DE를 매칭하여
3. **각 DE로 만들 수 있는 캠페인 후보**를 표로 반환한다. (캠페인명 / 활용 DE / 핵심 필드 / 추천 Journey 유형 / 한 줄 설명)

오케스트레이터는 반환된 후보 목록을 사용자에게 보여주고 **어떤 캠페인을 만들지 선택**하게 한다.
(사용자가 "알아서 골라줘"라고 하면 의도에 가장 부합하는 후보를 자동 선정하고 무엇을 골랐는지 1줄로 알린다.)

---

## STEP 2. 실행 모드 선택 + ② 기획 / 정의서 — `mce-planning-agent`

캠페인이 선택되면 **이 시점에서** 실행 모드를 묻는다. 이 선택이 기획(STEP 2)과 저니 생성(STEP 3)의 진행 방식을 가른다.

| 모드 | 동작 |
|---|---|
| **수동 (Manual)** | Plan을 **대화 형식**으로 함께 구성한다. 진입 방식·이메일·단계·분기·대기·재진입·스케줄을 사용자와 하나씩 합의한 뒤 정의서를 만들고, STEP 3 전에 한 번 더 승인을 받는다. |
| **자동 (Auto)** | 에이전트가 의도를 분석해 **대화 없이** Plan 기획 → 정의서 → MCE Journey 생성까지 일괄 진행한다. 명시되지 않은 값은 MCE 표준 기본값을 자동 적용한다. |

> 사용자가 처음부터 "자동으로", "알아서 저니까지 만들어줘"라고 명시하면 모드 질문을 생략하고 **자동**으로 진행한다.

**모드별 STEP 2 처리:**

- **자동** → `mce-planning-agent`를 1회 호출하여 Plan 설계 + 정의서 생성을 일괄 수행하고, 곧바로 STEP 3로 이어간다.

- **수동** → 메인 루프(오케스트레이터)가 직접 대화로 Plan을 합의한다. 아래 항목을 순서대로 사용자와 정한다:
  1. Entry Source (Data Extension / API Event) 및 진입 DE
  2. 발송 일정 / 스케줄 시작일 / Schedule Flow Mode (Recurring vs On Activation)
  3. 재진입 설정 (No re-entry / Re-entry anytime / Re-entry only after exiting)
  4. Journey 단계 구성 (Email / Wait / Decision Split / Engagement Split / Wait & Exit ...)
  5. 각 단계의 상세값 (이메일명·ID, 대기 기간, 분기 조건/기준 속성)

  합의가 끝나면 확정된 Plan을 요약해 보여주고, 그 값으로 `mce-planning-agent`를 호출하여 **xlsx 정의서를 동일하게 생성**한다.

정의서는 `campaign_definitions/{캠페인ID}_{시나리오명}_{YYYYMMDD}.xlsx`로 저장되며 **캠페인 개요 / 저니 구조** 2개 탭으로 구성된다.

---

## STEP 3. ③ 저니 생성 — `mce-journey-agent`

STEP 2에서 생성된 정의서(또는 사용자가 직접 첨부한 정의서) 경로를 `mce-journey-agent`에 전달하여 SFMC Journey를 생성한다.

**모드별 처리:**
- **자동** → STEP 2 직후 대화 없이 곧바로 저니 생성을 진행한다.
- **수동** → 생성된 Plan/정의서를 사용자에게 보여주고 **승인을 받은 뒤** 저니 생성을 진행한다. ("이대로 저니 생성할까요?")

`mce-journey-agent`는:
- Entry Source가 Data Extensions면 `EmailAudience` Event Definition 생성 후 Automation 스케줄을 PATCH한다.
- Entry Source가 API Event면 스케줄 없이 생성하고 Automation Studio 수동 설정을 안내한다.
- 정의서의 모든 분기 조건/대기/이메일/재진입 값을 빠짐없이 Journey에 반영한다.
- **발행은 기본적으로 하지 않는다.** `auto_publish = TRUE` 또는 사용자가 명시적으로 발행을 요청한 경우에만 `sfmc_publish_journey`를 호출한다. 그 외에는 Draft 상태로 둔다.

---

## STEP 4. 결과 보고

모든 처리 완료 후 결과를 요약한다.

```
[ 실행 결과 ]
선택 캠페인 : <캠페인명>
실행 모드   : 수동 / 자동
정의서      : campaign_definitions/CP_XXX_시나리오명_YYYYMMDD.xlsx
Journey     : 성공 — Journey ID: <uuid> (Draft / 발행됨)
```

오류가 발생한 단계는 오류 내용을 명시하고, 가능한 경우 다음 단계로 계속 진행한다.

> **진행 과정 설명 최소화**: 각 단계 내부의 "이제 ~를 조회합니다" 같은 세부 진행 설명은 출력하지 않는다.
> 단계 전환(캠페인 선택, 모드 선택, Plan 승인)과 최종 결과 보고만 사용자에게 노출한다. 오류는 즉시 알린다.

---

## 시트 컬럼 참조

### 캠페인 개요 테이블 (시나리오 정의 탭)
| 컬럼명 | 설명 |
|---|---|
| 캠페인 ID | 고유 식별자 (예: CP_001) |
| 캠페인 시나리오명 | Journey 이름으로 사용 |
| 설명 및 비즈니스 목적 | 캠페인 목적 설명 |
| 발송 일정 | 발송 기준 일정 |
| 스케줄 시작일 | 실행 시작 날짜 (예: 2026-06-01) |
| Entry Source | Data Extensions / API Event |
| Entry DE 명 | 진입 DE 이름 |

### Journey 단계 테이블 (저니 구조 탭)
| 컬럼명 | 설명 |
|---|---|
| 캠페인 ID | 개요 테이블과 매칭 키 |
| 단계 (Step) | 순서 (1, 2, 3-A, 3-B ...) |
| 컴포넌트 유형 | Entry Source / Message (Email) / Wait / Decision Split / Engagement Split / Wait & Exit 등 |
| 상세 설정 조건 / 분기 로직 (Criteria & Path) | 컴포넌트별 세부 조건 및 분기 경로 |
| 연결 콘텐츠 명칭 (Email Name) | Content Builder 에셋명 |
| 연결 콘텐츠 ID (Email ID) | Content Builder legacyId |
| 대기 기간 (Wait) | 대기 시간 (예: 3 Days, 1 Day) |
| 고객 재진입 설정 (Contact Re-entry) | No re-entry / Re-entry only after exiting / Re-entry at any time |
| Schedule Flow Mode | Recurring 등 반복 설정 |

---

## SFMC 고정값

- **Send Classification**: Default Commercial (`b8c6fd82-d5fe-ed11-a5ba-5cba2c19fe48`)
- **Sender Profile**: Default (`b6c6fd82-d5fe-ed11-a5ba-5cba2c19fe48`)
- **Delivery Profile**: Default (`b7c6fd82-d5fe-ed11-a5ba-5cba2c19fe48`)
- **Publication List**: Cafe24 Online Store (ID: `3657`)

---

## 경로

- **프로젝트 루트**: `C:\Users\vvpp1\Desktop\mce-package-main`
- **정의서 폴더**: `C:\Users\vvpp1\Desktop\mce-package-main\campaign_definitions`
- **정의서 생성 스크립트**: `generate_campaign_definition.js` (`__dirname` 기준 자동 처리)

---

## 저니 생성 이력 관리

- 저니 생성 결과는 `.claude/agent-memory/mce-journey-agent/journey_history.md` 에 단일 파일로 누적 저장한다.
- 매 실행 후 아래 형식으로 append 한다.

```
## YYYY-MM-DD HH:MM
- 캠페인 ID: CP_XXX
- Journey 명: <name>
- Journey ID: <uuid>
- 상태: 성공 / 실패 (<오류내용>)
```

- `MEMORY.md` 인덱스에는 등록하지 않는다. (자동 로딩 방지)

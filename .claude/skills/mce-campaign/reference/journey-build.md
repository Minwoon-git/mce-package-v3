# 저니 빌드 참조 (STEP 2-4 / STEP 3)

저니 구조 설계 패턴과 SFMC Journey 생성 시 액티비티별 검증된 페이로드 형식을 모은다.

---

## 저니 구조 설계 패턴 (STEP 2-4)

아래 패턴을 참고하여 정의서의 저니 구조를 구성한다. (이메일 ID 등은 실제 계정 에셋에 맞춰 채운다.)

**패턴 1 — 단순 이메일 (Entry → Email → Wait & Exit)**

| 캠페인 ID | 단계 | 컴포넌트 유형 | 상세 조건 | Email Name | Email ID | Wait | 재진입 | Schedule Flow Mode |
|---|---|---|---|---|---|---|---|---|
| CP_XXX | 1 | Entry Source | Data Extension: TEST_MCE_CAMPAIGN_DE | — | — | — | No re-entry | — |
| CP_XXX | 2 | Message (Email) | 웰컴 이메일 발송 | Welcome_Email | 12345 | — | — | — |
| CP_XXX | 3 | Wait & Exit | 발송 후 종료 | — | — | 1 Day | — | — |

**패턴 2 — Decision Split (등급/속성 분기, 각 Path 개별 Exit)**

| CP_XXX | 1 | Entry Source | Data Extension: TEST_MCE_CAMPAIGN_DE | — | — | — | Re-entry only after exiting | Recurring |
| CP_XXX | 2 | Decision Split | 회원 등급 분기 - Path A: MemberGrade='VIP' - Path B: MemberGrade='General' | — | — | — | — | — |
| CP_XXX | 3-A | Message (Email) | [Path A] VIP 전용 혜택 | VIP_Benefit_Email | 60101 | — | — | — |
| CP_XXX | 4-A | Wait & Exit | 발송 후 종료 | — | — | 1 Day | — | — |
| CP_XXX | 3-B | Message (Email) | [Path B] 등급 업그레이드 유도 | Grade_Upgrade_Email | 60102 | — | — | — |
| CP_XXX | 4-B | Wait & Exit | 발송 후 종료 | — | — | 1 Day | — | — |

**패턴 3 — Engagement Split (열람/미열람 분기)**

| CP_XXX | 1 | Entry Source | Data Extension: TEST_MCE_CAMPAIGN_DE | — | — | — | Re-entry only after exiting | Recurring |
| CP_XXX | 2 | Message (Email) | 리마인드 메일 발송 | Cart_Reminder_Email | 60201 | — | — | — |
| CP_XXX | 3 | Wait | 열람 반응 관찰 | — | — | 2 Days | — | — |
| CP_XXX | 4 | Engagement Split | 열람 여부 - Path open: 열람 - Path noopen: 미열람 | — | — | — | — | — |
| CP_XXX | 5-open | Message (Email) | [open] 할인 쿠폰 발송 | Cart_Discount_Email | 60202 | — | — | — |
| CP_XXX | 6-open | Wait & Exit | 발송 후 종료 | — | — | 1 Day | — | — |
| CP_XXX | 5-noopen | Message (Email) | [noopen] 제목 변경 재발송 | Cart_Reminder_Resend | 60203 | — | — | — |
| CP_XXX | 6-noopen | Wait & Exit | 발송 후 종료 | — | — | 1 Day | — | — |

> 더 복잡한 중첩 분기(Decision → 발송횟수 → 동의 → Email → Wait → Engagement → 재확인 ...)도 동일 원리로 Step에 `3-A`, `4-A-1` 등 경로 접미사를 붙여 구성한다. Decision Split의 각 Path는 Join하지 않고 개별 Exit 처리한다.

---

## STEP 3 — 캠페인 ID별 Journey 생성 (상세)

### ① 이벤트 정의 + 스케줄 설정

| Entry Source | Event Definition type | 스케줄 설정 방법 |
|---|---|---|
| **Data Extensions** | `EmailAudience` | Event Definition 생성 후 → 자동 생성된 **Automation을 PATCH**하여 스케줄 설정 |
| **API Event** | `APIEvent` | 스케줄 없음 (Automation Studio 수동 설정 필요, 사용자에게 안내) |

**Data Extensions 전체 흐름:**

**ⓐ Event Definition 생성** (`sfmc_create_event_definition`, schedule 필드 없이):
```json
{
  "name": "CP00X-캠페인명-Entry-YYYYMMDD",
  "eventDefinitionKey": "CP00X-캠페인명-Entry-YYYYMMDD",
  "type": "EmailAudience",
  "dataExtensionId": "<DE GUID>"
}
```
응답에서 **`automationId`** 를 반드시 저장한다.

**ⓑ Automation에 스케줄 PATCH** (`sfmc_update_automation`):
- PATCH 전에 `sfmc_get_automation`으로 현재 구조(step ID, activity ID) 확인
- 아래 형식으로 PATCH:
```json
{
  "id": "<automationId>",
  "name": "<automation name>",
  "key": "<automation key>",
  "categoryId": <categoryId>,
  "steps": [ /* 기존 steps 그대로 포함 (id, stepNumber, activities) */ ],
  "startSource": {
    "typeId": 1,
    "schedule": {
      "iCalRecur": "FREQ=DAILY;INTERVAL=1;UNTIL=20761231",
      "startDate": "2026-06-10T09:00:00",
      "timeZoneId": 48
    }
  }
}
```

**스케줄 모드 판단 (정의서 `Schedule Flow Mode` 컬럼 기준):**

| Schedule Flow Mode | 의미 | Automation PATCH 여부 |
|---|---|---|
| `Recurring` | 반복 실행 (매일/매주 등) | **필수** — 아래 iCalRecur 형식 사용 |
| *(비어있음 / 미지정)* | On Activation — Journey 활성화(Publish) 시 1회 실행 | **PATCH 불필요** — Automation 스케줄 설정 생략 |

**Recurring 스케줄 파라미터 규칙:**
- `startDate`: 정의서의 `스케줄 시작일` + `발송 일정` 시간 (로컬 시간, UTC 변환 불필요)
- `timeZoneId`: 항상 **`48`** (Seoul, GMT+09:00) 사용
- `iCalRecur` 주기별 형식:

| 발송 주기 | iCalRecur 예시 |
|---|---|
| 매일 | `FREQ=DAILY;INTERVAL=1;UNTIL=20761231` |
| 매주 월요일 | `FREQ=WEEKLY;BYDAY=MO;INTERVAL=1;UNTIL=20761231` |
| 매월 1일 | `FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1;UNTIL=20761231` |
| 종료일 지정 | `UNTIL=YYYYMMDD` 값 변경 |

**On Activation (1회 실행):** Automation PATCH 없이 Event Definition + Journey 생성만 완료. Journey 발행 시점에 DE를 1회 평가하여 실행됨.

**API Event** → Journey 자체에 스케줄 없음. 정해진 시간에 실행하려면 Automation Studio에서 `sfmc_fire_journey_event`로 트리거해야 하며, 수동 설정이 필요함을 사용자에게 안내한다.

### ② Journey 생성

> ⚠️ **최우선 규칙: 정의서에 명시된 모든 액티비티의 조건/설정값은 빠짐없이 Journey에 채워 넣는다.**
> 액티비티에 조건(분기 기준, 대기 기간, 이메일 ID, 열람 기준 등)이 있으면 그 값을 반드시 해당 액티비티 설정에 반영한다.
> 조건을 비워둔 채(미설정 상태) Journey를 생성하는 것은 절대 허용되지 않는다. 정의서의 모든 분기 로직·기준값이 SFMC에 그대로 반영되어야 한다.

Decision Split(`MULTICRITERIADECISION`)은 `configurationArguments.criteria`에 **각 outcome key별 FilterDefinition XML**을 반드시 채워야 한다. 비워두면 Journey Builder UI에서 "Define logic to route people down this path" 미설정 상태가 된다.

**Decision Split criteria 형식 (CP_004 검증된 구조):**
```json
{
  "key": "SPLIT-2",
  "name": "1차 분기 - 카카오 쿠폰 발급 여부",
  "type": "MULTICRITERIADECISION",
  "configurationArguments": {
    "criteria": {
      "<outcome-key-A>": "<FilterDefinition><ConditionSet Operator=\"AND\" ConditionSetName=\"Individual Filter Grouping\"><Condition IsEphemeralAttribute=\"true\" Key=\"Event.<EventDefKey>.<속성명>\" Operator=\"Equal\" UiMetaData=\"{}\"><Value><![CDATA[False]]></Value></Condition></ConditionSet></FilterDefinition>",
      "<outcome-key-B>": "<FilterDefinition>...<Value><![CDATA[True]]></Value>...</FilterDefinition>"
    },
    "schemaVersionId": "252"
  },
  "metaData": { "isConfigured": true }
}
```

핵심 규칙:
- criteria의 **key는 각 path의 outcome key와 정확히 일치**해야 한다
- `Key="Event.<EventDefinitionKey>.<속성명>"` — 진입 Event Definition Key + 속성명 (예: `Event.CP010-...-EventDef-20260604.IsKakaoCouponIssued`)
- `Operator`: 같음=`Equal`, 이상=`GreaterThanOrEqual` 등
- 값은 `<![CDATA[값]]>` 안에 넣는다 (True/False/0/1/Y/N 등)
- `IsEphemeralAttribute="true"`, `schemaVersionId: "252"` 고정
- 발송횟수 2회 이상 같은 분기는 `Operator="GreaterThanOrEqual"` 사용

**다른 액티비티:**
- Email → `EMAILV2` / `configurationArguments.triggeredSend`에 emailId, emailSubject, sendClassificationId, senderProfileId, deliveryProfileId, publicationListId 모두 포함, `isMultipart: true`, `isTrackingClicks: true`
- Wait → `WAIT` / `configurationArguments`: `waitDuration`, `waitUnit: "DAYS"`
- Engagement Split → `sfmc_engagement_decision_activity` 도구 사용 (열람/미열람 기준)

모든 액티비티에 `metaData.isConfigured: true` 를 명시한다.

```
sfmc_create_journey_builder_journey 실행
→ journey_id, journey_name, journey_key 확보
```

**Contact Re-entry(재진입) 설정 — 반드시 정의서 값으로 지정:**

| 정의서 고객 재진입 설정 | entry_mode 파라미터 |
|---|---|
| No re-entry | `OnceAndDone` |
| Re-entry anytime | `MultipleEntries` |
| Re-entry only after exiting | `SingleEntryAcrossAllVersions` |

> ⚠️ 미지정 시 `NotSet`으로 생성되어 Journey Builder UI에서 선택되지 않은 상태가 됨. 반드시 명시할 것.
> ⚠️ **검증된 주의사항**: `sfmc_create_journey_builder_journey`에 full `body_json`을 넘기면 `entry_mode` 파라미터가 무시되어 `entryMode`가 `NotSet`으로 들어간다.
> → `body_json` **최상위에 `"entryMode": "<위 값>"`을 직접 포함**해야 한다. (예: `"entryMode": "OnceAndDone"`)
> → 그래도 `NotSet`으로 생성되면 생성 직후 `sfmc_update_journey`로 `entryMode`만 교정 PUT 한다 (key·version·modifiedDate 및 모든 activity의 key/id/outcomes 보존).

Journey 구성 요소는 저니 구조 탭의 Step 순서대로 구성한다:
- `Message (Email)` → 이메일 액티비티 (이메일 ID 사용)
- `Wait` → Wait 액티비티 (Wait 컬럼 값 사용)
- `Wait & Exit` → Wait 후 Exit 처리
- `Decision Split` → Decision Split 액티비티 (분기 로직 적용)
- `Engagement Split` → Engagement Split 액티비티
- 그 외 → 해당 유형에 맞는 액티비티 구성

**Decision Split / Path 종료 규칙**
- Decision Split의 각 Path는 Join으로 합치지 않는다.
- 각 Path는 마지막 액티비티 이후 개별적으로 Exit 처리한다.

### ③ Journey 발행 (명시적 지시가 있을 때만)

> ⚠️ **발행은 기본적으로 하지 않는다.** 아래 조건 중 하나가 충족될 때만 `sfmc_publish_journey`를 호출한다:
> - 정의서에 `auto_publish = TRUE` 가 명시된 경우
> - 사용자가 명시적으로 "발행해줘" / "publish" 등 발행을 요청한 경우
>
> 위 조건이 없으면 **절대 발행하지 않고 Journey를 Draft 상태로 둔 채 종료**한다.
> 결과 보고 시 "Draft 상태로 생성됨 (미발행)"임을 알리고, 필요 시 "발행하려면 말씀해 주세요"라고만 안내한다.

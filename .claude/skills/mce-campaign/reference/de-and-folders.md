# 진입 DE / 폴더 구조 (STEP 1 참조)

전체 DE를 무차별로 읽지 않는다. **먼저 폴더(카테고리) 구조를 보고 의도와 관련된 폴더로 범위를 좁힌 뒤**, 그 안의 DE만 읽는다.

## ⭐ 최우선 지정 폴더 — `Campaign_Package` (folderId `93372`)

이 계정의 캠페인 진입용 Sendable DE는 모두 `Campaign_Package` 폴더 아래에 있다. **항상 이 폴더를 가장 먼저 읽는다.** 하위 5개 폴더 구조(의도별 1차 매핑):

| 하위 폴더 (categoryId) | 의도 매칭 | 진입 DE명 | DE Key |
|---|---|---|---|
| New Join (`93373`) | 신규 회원 / 가입 / 온보딩 / 웰컴 | 신규회원_웰컴 | `WELCOME_ENTRY_DE` |
| Old Member (`93374`) | 이탈 / 휴면 / 재활성화 | 이탈고객_재활성화 | `CHURN_ENTRY_DE` |
| Cart (`93375`) | 장바구니 / 구매 이탈 | 장바구니_이탈 | `CART_ABANDON_ENTRY_DE` |
| Birthday (`93376`) | 생일 / 기념일 | 생일_쿠폰 | `BIRTHDAY_ENTRY_DE` |
| Coupon (`93377`) | 쿠폰 / 친구추가 / 프로모션 | 쿠폰_친구추가 | `COUPON_FRIEND_ENTRY_DE` |

사용자 의도를 위 표와 대조하여 매칭되는 하위 폴더의 categoryId로 `sfmc_get_data_extensions_by_category`를 호출해 해당 진입 DE를 우선 읽는다.
(의도가 모호하면 `Campaign_Package`(93372) 전체를 읽어 5개 DE를 모두 후보로 삼는다.)
Grade(등급)·Common(공통/마스터) 폴더는 현재 DE 미생성 — 필요 시 그 사실을 명시한다.

위 최우선 폴더로 후보를 확보하지 못한 경우에만 아래 일반 절차로 넘어간다.

## 일반 폴더 탐색 절차 (fallback)

1. `sfmc_get_data_extension_folders` 로 DE 폴더(카테고리) 트리를 조회한다. 각 폴더의 `name`, `id(categoryId)`, `parentId`를 확보한다.
2. **폴더명을 사용자 의도와 대조**하여 관련 폴더를 1~3개 선정한다. 의도 키워드 ↔ 폴더 매핑 예시:

| 사용자 의도 | 우선 탐색할 폴더명 패턴 (예) |
|---|---|
| 신규 회원 / 가입 / 온보딩 | `Welcome`, `신규`, `가입`, `Onboarding`, `CreatedCustomers`, `Join` |
| 이탈 / 휴면 / 재활성화 | `Churn`, `이탈`, `휴면`, `Reactivation`, `Inactive` |
| 장바구니 / 구매 | `Cart`, `장바구니`, `Purchase`, `Order`, `구매` |
| 생일 / 기념일 | `Birthday`, `생일`, `Anniversary` |
| 등급 / 멤버십 | `Grade`, `등급`, `Membership`, `VIP`, `Tier` |
| 쿠폰 / 친구추가 / 프로모션 | `Coupon`, `쿠폰`, `Kakao`, `친구추가`, `Promotion` |

3. 선정한 폴더에 대해 `sfmc_get_data_extensions_by_category` 로 **해당 폴더의 DE만** 조회한다. (categoryId 기준으로 읽기 범위를 한정)
4. **Fallback 규칙** — 아래의 경우에만 `sfmc_get_data_extensions`로 전체 목록을 조회한다:
   - 폴더 구조가 의도와 매칭되지 않거나 폴더명이 모호할 때
   - 카테고리 조회 결과가 비어 있거나 후보가 2개 미만일 때
   - 폴더 조회 도구가 응답하지 않을 때
   이때도 전체에서 이름/설명/값으로 1차 키워드 필터를 적용해 좁힌다.

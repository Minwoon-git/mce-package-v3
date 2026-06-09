---
name: reference-key-des
description: 계정의 주요 DE 목록, 필드 구성, 신규회원/캠페인 활용 용도
metadata:
  type: reference
---

## 핵심 DE 목록 (신규회원/캠페인 활용 기준)

### WTK_customer (customerKey: 7036343D-9078-46FF-9C07-312B64CE0675)
- 용도: 고객 마스터 (99,999건 이상)
- 주요 필드:
  - member_id (PK), shop_no, name, email, cellphone, gender
  - sms (T/F) — SMS 수신동의
  - news_mail (T/F) — 이메일 수신동의
  - thirdparty_agree (T/F) — 3자 제공 동의
  - birthday (Date) — 생일
  - total_points / available_points / used_points (Number) — 포인트
  - group_no / group_name (Text) — 회원등급 (WELCOME, SILVER 등)
  - created_date (Date) — 가입일
  - member_authentication (T/F) — 본인인증 여부
  - last_login_date (Date) — 최근 로그인
  - recommend_id (Text) — 추천인 ID
  - update_date (Date)
- 신규회원 진입 분기: created_date, group_name = 'WELCOME', news_mail

### J1_1_CreatedCustomers_Today_7 (customerKey: FB1F3D21-594B-47CB-B06C-8B3EAA70DFDB)
- 용도: 가입 후 7일 이내 신규 고객 (711건)
- 주요 필드: member_id, shop_no, name, email, cellphone, gender
- 비고: 구매여부(purchase_status) 필드 없음 — 분기 불가

### J1_1_CreatedCustomers_Today_7_PurchaseYN (customerKey: 274A5199-9C38-4A72-9871-02C49F9E5E0B)
- 용도: 가입 후 7일 이내 신규 고객 + 구매여부 포함 (66건)
- 주요 필드: member_id, shop_no, name, email, cellphone, gender, purchase_status
- 신규회원 구매 분기 가능: purchase_status

### J1_1_CreatedCustomers_Today_1 (customerKey: F5A4FDC5-86B0-49DC-87E1-9A7C053C887A)
- 용도: 가입 당일 신규 고객 (현재 0건 — 일별 갱신 추정)
- 주요 필드: member_id, shop_no, name, email, cellphone, gender

### J1_1_CreatedCustomers_Today_1_PurchaseYN (customerKey: 6A18BD2C-3A59-4E08-ADA6-8C55C43AA682)
- 용도: 가입 당일 신규 고객 + 구매여부 (현재 0건 — 일별 갱신 추정)

### 3M_Join_Date_No_Order (customerKey: 9CA3B55A-4ED4-4486-B421-2E5EEFA96073)
- 용도: 가입 후 3개월 내 주문 없는 고객 (699건)
- 주요 필드: member_id, shop_no, name, email, cellphone, gender
- 비고: 별도 분기 필드 없음 — 대상 자체가 미구매자 세그먼트

### WTK_coupon (customerKey: C5871CF3-5BEC-4C5E-85ED-34DBFBCAE1CC)
- 용도: 쿠폰 발행 이력 (202건)
- 주요 필드: member_id, coupon_no, issued_date, expiration_date, used_coupon (True/False), coupon_name, benefit_price, benefit_percentage
- 분기 활용: used_coupon = False → 미사용 쿠폰 리마인더 가능

### WTK_campaign (customerKey: D12CED04-6515-4A4F-9C86-C60D8A5E25D3)
- 용도: 캠페인 발송 성과 데이터 (2,745건)
- 참고: "Sign-Up Thank You and Membership Benefits" 캠페인 이력 존재
- Entry DE로 활용 불가 (성과 로그 테이블)

### WTK_order (customerKey: C4EB9512-99F8-47E6-95DD-AD9F07CD60A5)
- 용도: 주문 이력 (구매 분기용)

### Customers / Memberships (비어 있음)
- 현재 데이터 0건 — Entry DE로 사용 불가

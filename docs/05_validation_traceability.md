# 05. 요구 검증 및 추적성

## 1. 요구 검증 기준

요구사항은 다음 기준으로 검토한다.

| 기준 | 설명 |
|---|---|
| 원자성 | 하나의 요구사항은 하나의 기능 또는 규칙만 표현한다. |
| 비모호성 | 상태명과 조건을 명확히 정의한다. |
| 일관성 | 고객 상태와 테이블 상태가 서로 충돌하지 않게 한다. |
| 우선순위 | Must/Should로 구현 범위를 조정한다. |
| 테스트 가능성 | 각 핵심 요구사항은 테스트 케이스로 확인 가능해야 한다. |
| 추적성 | 요구사항, 유스케이스, 테스트 케이스가 연결되어야 한다. |

## 2. 요구사항 추적성 표

| 요구사항 ID | 관련 유스케이스 | 관련 모델 | 테스트 케이스 |
|---|---|---|---|
| FR-01 | UC-01 | Customer, WaitingEntry | TC-01 |
| FR-02 | UC-01 | WaitingEntry | TC-01 |
| FR-03 | UC-01 | Activity Flow | TC-02 |
| FR-04 | UC-01 | Customer State Model | TC-01 |
| FR-05 | UC-03 | WaitingEntry | TC-03 |
| FR-06 | UC-04 | Customer State Model | TC-04 |
| FR-07 | UC-05 | Customer State Model | TC-05 |
| FR-08 | UC-06 | Customer State Model | TC-06 |
| FR-09 | UC-08 | RestaurantTable | TC-07 |
| FR-10 | UC-07 | RestaurantTable | TC-08 |
| FR-11 | UC-07 | Sequence Diagram | TC-09 |
| FR-12 | UC-07 | Customer/Table State Model | TC-09 |
| FR-13 | UC-09 | Table State Model | TC-10 |

## 3. 테스트 케이스

| TC ID | 테스트 내용 | 입력/상황 | 예상 결과 |
|---|---|---|---|
| TC-01 | 웨이팅 등록 | 이름, 연락처, 인원수 2 입력 | 대기 번호가 부여되고 `waiting` 상태로 등록된다. |
| TC-02 | 인원수 검증 | 인원수 0 입력 | 등록되지 않고 오류 메시지가 표시된다. |
| TC-03 | 대기 목록 조회 | waiting 고객 여러 명 존재 | 등록 순서대로 목록이 표시된다. |
| TC-04 | 고객 호출 | waiting 고객 호출 | 고객 상태가 `called`로 변경된다. |
| TC-05 | 웨이팅 취소 | waiting 고객 취소 | 고객 상태가 `cancelled`로 변경된다. |
| TC-06 | 노쇼 처리 | called 고객 노쇼 처리 | 고객 상태가 `no-show`로 변경된다. |
| TC-07 | 테이블 등록 | 테이블 번호 A1, 수용 인원 4 입력 | `available` 테이블이 생성된다. |
| TC-08 | 테이블 추천 | 3명 고객, 2인석/4인석/6인석 존재 | 4인석이 추천된다. |
| TC-09 | 입장 처리 | called 고객과 available 테이블 선택 | 고객은 `seated`, 테이블은 `occupied`가 된다. |
| TC-10 | 테이블 상태 변경 | occupied 테이블을 cleaning으로 변경 | 테이블 상태가 `cleaning`으로 변경된다. |

## 4. 검증 결과 요약

본 요구사항은 구현 규모를 고려하여 핵심 기능 중심으로 제한하였다.  
예약, 실제 알림, 로그인, 결제 기능은 제외하여 범위를 줄였고, 대신 고객 상태와 테이블 상태의 일관성을 핵심 품질 기준으로 설정하였다.

구현 단계에서는 이 문서의 요구사항 ID와 테스트 케이스 ID를 기준으로 기능을 하나씩 구현하고 검증한다.

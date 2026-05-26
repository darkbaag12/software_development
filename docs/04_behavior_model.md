# 04. 동적 모델링

## 1. 고객 상태 모델

```mermaid
stateDiagram-v2
    [*] --> waiting: 웨이팅 등록

    waiting --> called: 고객 호출
    waiting --> cancelled: 웨이팅 취소

    called --> seated: 입장 처리
    called --> cancelled: 호출 후 취소
    called --> no_show: 노쇼 처리

    seated --> [*]
    cancelled --> [*]
    no_show --> [*]
```

## 2. 테이블 상태 모델

```mermaid
stateDiagram-v2
    [*] --> available: 테이블 등록

    available --> occupied: 고객 입장
    occupied --> cleaning: 식사 종료
    cleaning --> available: 청소 완료

    available --> [*]: 테이블 삭제
```

## 3. 입장 처리 시퀀스 다이어그램

```mermaid
sequenceDiagram
    actor Staff as 직원
    participant UI as 화면
    participant Waiting as WaitingService
    participant Table as TableService

    Staff->>UI: called 고객 선택
    UI->>Table: 추천 테이블 요청(partySize)
    Table-->>UI: available 테이블 중 추천 결과 반환

    Staff->>UI: 테이블 배정 확정
    UI->>Waiting: 고객 상태 seated로 변경
    UI->>Table: 테이블 상태 occupied로 변경
    UI-->>Staff: 입장 처리 완료 표시
```

## 4. 입장 처리 액티비티 다이어그램

```mermaid
flowchart TD
    A([시작]) --> B[직원이 called 고객 선택]
    B --> C[시스템이 available 테이블 조회]
    C --> D{인원수에 맞는 테이블 있음?}
    D -- 아니오 --> E[배정 불가 메시지 표시]
    E --> Z([종료])

    D -- 예 --> F[가장 작은 적합 테이블 추천]
    F --> G[직원이 배정 확정]
    G --> H[고객 상태를 seated로 변경]
    H --> I[테이블 상태를 occupied로 변경]
    I --> J[입장 완료 표시]
    J --> Z
```

## 5. 동적 모델링 결과

동적 모델링을 통해 다음 점을 명확히 했다.

1. 고객은 아무 상태로든 자유롭게 이동하지 않는다.
2. `waiting → called → seated`가 기본 입장 흐름이다.
3. `cancelled`, `no-show`는 종료 상태로 보고 이후 입장 처리하지 않는다.
4. 테이블은 `available`일 때만 고객에게 배정된다.
5. 입장 처리는 고객 상태와 테이블 상태를 동시에 바꾸는 핵심 기능이다.

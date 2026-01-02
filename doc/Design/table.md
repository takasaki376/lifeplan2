# DB テーブル定義（MVP）— ライフプラン管理アプリ

（参照・更新しやすい Markdown 形式）

---

## 0. 共通方針

- DB: Postgres 想定
- 金額: `numeric`（円） ※小数不要なら `numeric(14,0)` 推奨
- 比率: `numeric`（例: 0.012 = 1.2%）
- 月: `date` で **月初日** に正規化（例: 2026-01-01）
- 監査: `created_at`, `updated_at` は原則全テーブル
- 任意: “スナップショット系”は MVP 初期では未使用でも OK

---

## 1. テーブル一覧（MVP 必須）

1. `users`（任意：認証用）
2. `plans`
3. `plan_versions`
4. `scenario_assumptions`
5. `life_events`
6. `housing_assumptions`
7. `monthly_records`
8. `monthly_items`（任意：月次詳細内訳）

---

## 2. テーブル定義（詳細）

### 2.1 `users`（任意：認証用）

**目的**：ユーザー識別（マルチユーザー前提。単独運用なら省略可）

| Column     | Type        | Null | Default           | Notes                      |
| ---------- | ----------- | ---: | ----------------- | -------------------------- |
| id         | uuid        |   NO | gen_random_uuid() | PK                         |
| email      | text        |  YES |                   | ユニーク（運用方針による） |
| created_at | timestamptz |   NO | now()             |                            |
| updated_at | timestamptz |   NO | now()             |                            |

**Constraints**

- `UNIQUE(email)`（任意）

**Indexes**

- `uq_users_email (email)`（任意）

---

### 2.2 `plans`（プラン本体：実績の入れ物）

**目的**：プランの識別子・基本情報・アーカイブ状態  
**備考**：月次実績は plan 直下で保持（改定に依存しない）

| Column         | Type        | Null | Default           | Notes                                          |
| -------------- | ----------- | ---: | ----------------- | ---------------------------------------------- |
| id             | uuid        |   NO | gen_random_uuid() | PK                                             |
| user_id        | uuid        |  YES |                   | FK → users.id（任意）                          |
| name           | text        |   NO |                   | プラン名                                       |
| household_type | text        |  YES |                   | `single/couple/couple_kids/other`              |
| note           | text        |  YES |                   | 備考                                           |
| status         | text        |   NO | 'active'          | `active/archived`（または archived_at で管理） |
| created_at     | timestamptz |   NO | now()             |                                                |
| updated_at     | timestamptz |   NO | now()             |                                                |
| archived_at    | timestamptz |  YES |                   | アーカイブ日時                                 |

**Constraints**

- `CHECK (status in ('active','archived'))`（採用する場合）

**Indexes（推奨）**

- `idx_plans_user_id (user_id)`
- `idx_plans_archived_at (archived_at)`

---

### 2.3 `plan_versions`（改定履歴：前提の版）

**目的**：見直し単位（差分比較の軸）  
**備考**：前提（シナリオ・住宅・イベント）を version 配下に保持

| Column      | Type        | Null | Default           | Notes                    |
| ----------- | ----------- | ---: | ----------------- | ------------------------ |
| id          | uuid        |   NO | gen_random_uuid() | PK                       |
| plan_id     | uuid        |   NO |                   | FK → plans.id            |
| version_no  | int         |   NO |                   | 1,2,3...                 |
| title       | text        |  YES |                   | 表示名（例：金利見直し） |
| change_note | text        |  YES |                   | 変更メモ                 |
| is_current  | boolean     |   NO | false             | 現行版フラグ             |
| created_at  | timestamptz |   NO | now()             |                          |

**Constraints**

- `UNIQUE (plan_id, version_no)`
- 部分ユニーク推奨（Postgres）：`UNIQUE (plan_id) WHERE is_current = true`

**Indexes（推奨）**

- `idx_plan_versions_plan_id (plan_id)`
- `uq_plan_versions_plan_version (plan_id, version_no)`

---

### 2.4 `scenario_assumptions`（保守/標準/楽観）

**目的**：シナリオごとの年次前提（昇給/インフレ/利回り）

| Column                 | Type        | Null | Default           | Notes                          |
| ---------------------- | ----------- | ---: | ----------------- | ------------------------------ |
| id                     | uuid        |   NO | gen_random_uuid() | PK                             |
| plan_version_id        | uuid        |   NO |                   | FK → plan_versions.id          |
| scenario_key           | text        |   NO |                   | `conservative/base/optimistic` |
| wage_growth_rate       | numeric     |  YES |                   | 昇給率（例 0.02）              |
| inflation_rate         | numeric     |  YES |                   | インフレ率                     |
| investment_return_rate | numeric     |  YES |                   | 資産利回り                     |
| created_at             | timestamptz |   NO | now()             |                                |

**Constraints**

- `UNIQUE (plan_version_id, scenario_key)`
- `CHECK (scenario_key in ('conservative','base','optimistic'))`

**Indexes（推奨）**

- `idx_scenario_assumptions_version (plan_version_id)`

---

### 2.5 `life_events`（ライフイベント）

**目的**：将来 CF に影響するイベント（単発/継続）

| Column          | Type        | Null | Default           | Notes                                            |
| --------------- | ----------- | ---: | ----------------- | ------------------------------------------------ |
| id              | uuid        |   NO | gen_random_uuid() | PK                                               |
| plan_version_id | uuid        |   NO |                   | FK → plan_versions.id                            |
| event_type      | text        |   NO |                   | 例：education, childcare, job_change, retirement |
| title           | text        |  YES |                   | 表示名（例：保育料）                             |
| start_month     | date        |   NO |                   | 月初日に正規化                                   |
| cadence         | text        |   NO |                   | `once/monthly`                                   |
| duration_months | int         |  YES |                   | monthly のみ使用（once は NULL 可）              |
| amount_yen      | numeric     |   NO |                   | 金額（円）                                       |
| note            | text        |  YES |                   |                                                  |
| created_at      | timestamptz |   NO | now()             |                                                  |
| updated_at      | timestamptz |   NO | now()             |                                                  |

**Constraints**

- `CHECK (cadence in ('once','monthly'))`
- `CHECK (duration_months is null OR duration_months >= 1)`

**Indexes（推奨）**

- `idx_life_events_version_month (plan_version_id, start_month)`

---

### 2.6 `housing_assumptions`（住宅 LCC 前提：4 タイプ）

**目的**：住宅タイプ別の LCC 入力前提（編集可能）  
**方針**：共通カラム＋タイプ固有は `type_specific jsonb`

| Column                     | Type        | Null | Default           | Notes                            |
| -------------------------- | ----------- | ---: | ----------------- | -------------------------------- |
| id                         | uuid        |   NO | gen_random_uuid() | PK                               |
| plan_version_id            | uuid        |   NO |                   | FK → plan_versions.id            |
| housing_type               | text        |   NO |                   | `wellnest/detached/condo/rent`   |
| is_selected                | boolean     |   NO | false             | version 内で選択中（任意）       |
| initial_cost_yen           | numeric     |  YES |                   | 初期費用（合算）                 |
| down_payment_yen           | numeric     |  YES |                   | 頭金                             |
| closing_cost_yen           | numeric     |  YES |                   | 諸費用                           |
| loan_principal_yen         | numeric     |  YES |                   | 借入元本                         |
| loan_interest_rate         | numeric     |  YES |                   | 金利（例 0.012）                 |
| loan_term_months           | int         |  YES |                   | 例：420（35 年）                 |
| repayment_type             | text        |  YES |                   | `annuity/equal_principal`        |
| property_tax_annual_yen    | numeric     |  YES |                   | 固定資産税（概算）               |
| utilities_base_monthly_yen | numeric     |  YES |                   | 基準光熱費（月）                 |
| utilities_factor           | numeric     |  YES |                   | 性能係数（例 0.85）              |
| type_specific              | jsonb       |  YES |                   | タイプ固有（修繕/管理費/家賃等） |
| created_at                 | timestamptz |   NO | now()             |                                  |
| updated_at                 | timestamptz |   NO | now()             |                                  |

**Constraints**

- `UNIQUE (plan_version_id, housing_type)`
- `CHECK (housing_type in ('wellnest','detached','condo','rent'))`
- （任意）部分ユニーク：`UNIQUE (plan_version_id) WHERE is_selected = true`

**Indexes（推奨）**

- `idx_housing_assumptions_version (plan_version_id)`
- `idx_housing_assumptions_type (housing_type)`

**type_specific JSON 例**

- WELLNEST/一般戸建：
  - `{ "repairs": [{ "cycle_years": 15, "cost_yen": 1200000 }, { "cycle_years": 30, "cost_yen": 2500000 }] }`
- 分譲マンション：
  - `{ "mgmt_fee_monthly_yen": 18000, "reserve_fee_monthly_yen": 12000, "parking_monthly_yen": 8000, "special_assessments": [{ "year": 12, "cost_yen": 300000 }] }`
- 賃貸：
  - `{ "rent_monthly_yen": 135000, "rent_increase_rate": 0.01, "renewal_fee_yen": 135000, "renewal_cycle_years": 2, "moving_cost_yen": 300000 }`

---

### 2.7 `monthly_records`（月次実績：継続入力）

**目的**：現実の家計・残高の継続記録（改定に依存しない）  
**備考**：かんたん入力の 4 ボックス＋任意で内訳

| Column                  | Type        | Null | Default           | Notes            |
| ----------------------- | ----------- | ---: | ----------------- | ---------------- |
| id                      | uuid        |   NO | gen_random_uuid() | PK               |
| plan_id                 | uuid        |   NO |                   | FK → plans.id    |
| month                   | date        |   NO |                   | 月初日に正規化   |
| income_total_yen        | numeric     |  YES |                   | 収入合計         |
| income_main_yen         | numeric     |  YES |                   | 主収入           |
| income_side_yen         | numeric     |  YES |                   | 副収入           |
| expense_total_yen       | numeric     |  YES |                   | 支出合計         |
| expense_fixed_yen       | numeric     |  YES |                   | 固定費           |
| expense_variable_yen    | numeric     |  YES |                   | 変動費           |
| assets_balance_yen      | numeric     |  YES |                   | 資産残高（総額） |
| liabilities_balance_yen | numeric     |  YES |                   | 負債残高（総額） |
| memo                    | text        |  YES |                   |                  |
| is_finalized            | boolean     |   NO | false             | 確定（任意）     |
| created_at              | timestamptz |   NO | now()             |                  |
| updated_at              | timestamptz |   NO | now()             |                  |

**Constraints**

- `UNIQUE (plan_id, month)`

**Indexes（推奨）**

- `uq_monthly_records_plan_month (plan_id, month)`
- `idx_monthly_records_plan (plan_id)`

---

### 2.8 `monthly_items`（月次詳細内訳：任意）

**目的**：「かんたん → 詳細」の詳細側。カテゴリ内訳を保存（optional）

| Column            | Type    | Null | Default           | Notes                   |
| ----------------- | ------- | ---: | ----------------- | ----------------------- |
| id                | uuid    |   NO | gen_random_uuid() | PK                      |
| monthly_record_id | uuid    |   NO |                   | FK → monthly_records.id |
| kind              | text    |   NO |                   | `income/expense`        |
| category          | text    |   NO |                   | 例：住居費/食費/教育    |
| amount_yen        | numeric |   NO |                   | 円                      |
| note              | text    |  YES |                   |                         |
| sort_order        | int     |  YES |                   | 表示順                  |

**Constraints**

- `CHECK (kind in ('income','expense'))`

**Indexes（推奨）**

- `idx_monthly_items_record (monthly_record_id)`

---

## 3. 任意テーブル（キャッシュ/差分高速化：MVP では未使用でも OK）

### 3.1 `housing_lcc_snapshots`（任意）

**目的**：version×scenario×housing_type の LCC 計算結果を保存（差分画面を軽くする）

| Column          | Type        | Null | Default           | Notes                           |
| --------------- | ----------- | ---: | ----------------- | ------------------------------- |
| id              | uuid        |   NO | gen_random_uuid() | PK                              |
| plan_version_id | uuid        |   NO |                   | FK → plan_versions.id           |
| scenario_key    | text        |   NO |                   | conservative/base/optimistic    |
| housing_type    | text        |   NO |                   | wellnest/detached/condo/rent    |
| horizon_years   | int         |   NO |                   | 例：35                          |
| total_lcc_yen   | numeric     |   NO |                   |                                 |
| breakdown       | jsonb       |  YES |                   | 内訳（ローン/修繕/光熱/税など） |
| calculated_at   | timestamptz |   NO | now()             |                                 |

**Constraints**

- `UNIQUE (plan_version_id, scenario_key, housing_type, horizon_years)`

---

### 3.2 `projection_snapshots`（任意）

**目的**：将来資産推移等の計算結果を保存

| Column          | Type        | Null | Default           | Notes                        |
| --------------- | ----------- | ---: | ----------------- | ---------------------------- |
| id              | uuid        |   NO | gen_random_uuid() | PK                           |
| plan_version_id | uuid        |   NO |                   | FK → plan_versions.id        |
| scenario_key    | text        |   NO |                   | conservative/base/optimistic |
| horizon_months  | int         |   NO |                   | 例：600                      |
| results         | jsonb       |   NO |                   | 月次配列など                 |
| calculated_at   | timestamptz |   NO | now()             |                              |

**Constraints**

- `UNIQUE (plan_version_id, scenario_key, horizon_months)`

---

## 4. 追加メモ（運用・整合性）

- `is_current` / `is_selected` は部分ユニーク制約を推奨（Postgres）
- 月初日正規化：アプリ側で `YYYY-MM-01` を生成して保存
- JSONB（type_specific / breakdown / results）は Zod 等でスキーマ検証推奨

---

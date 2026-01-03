# プラン作成ウィザード保存設計（C2）

## 目的

プラン作成ウィザード（`/plans/new`）の保存処理を、実装に合わせて設計として整理する。

## 対象範囲

- Plan の作成
- 初期 PlanVersion（v1/current）の作成
- 初期サマリー（年収の月額換算・資産/負債）を PlanVersion に保存
- C3 usecase による初期前提投入
- 成功後に `/plans/[planId]` へ遷移

## データモデル更新

### PlanVersion（追加フィールド）

- `incomeMonthlyYen?: number`
- `assetsBalanceYen?: number`
- `liabilitiesBalanceYen?: number`

年収は `Math.round(annualIncome / 12)` で月額換算して保存する。

## 入力

ウィザード入力:

- プラン名（必須）
- 世帯構成（任意、UI 値: `single | couple | family | other`）
- 備考（任意）
- 住宅タイプ（必須、ドメインキー: `high_performance_home | detached | condo | rent`）
- 世帯年収（任意、円）
- 資産残高（任意、円）
- 負債残高（任意、円）

マッピング:

- 世帯構成: `family` は `couple_kids` として保存
- 住宅タイプ: UI 側はドメインキーに統一（`detached/condo/rent`）

## 保存フロー

usecase: `createPlanWizard`（`src/lib/usecases/createPlanWizard.ts`）

1. IndexedDB のトランザクションを開始  
   対象ストア:
   - `plans`
   - `planVersions`
   - `scenarioAssumptions`
   - `housingAssumptions`
2. `PlanRepository.create` で Plan 作成
3. `VersionRepository.createInitial` で初期 PlanVersion 作成
   - `versionNo = 1`
   - `isCurrent = true`
   - `title = "v1"`
   - `changeNote = "初期作成"`
   - `incomeMonthlyYen / assetsBalanceYen / liabilitiesBalanceYen`（任意）
4. C3 usecase を呼び出し初期前提を投入
   - `initializePlanVersionDefaults({ planVersionId, selectedHousingType })`
   - シナリオ前提の投入
   - 住宅前提 4 タイプの投入
   - 選択住宅タイプの `isSelected=true`
5. `{ planId, versionId }` を返す

## UI 側の接続

対象ファイル: `src/app/plans/new/page.tsx`

- Step ごとの必須チェック
- 年収の月額換算
- 保存成功/失敗の toast 表示
- 成功時に `/plans/[planId]` へ遷移

## エラーハンドリング

- 必須未入力は toast で通知して終了
- Repo 操作が失敗した場合は例外を返す
- トランザクション内で一括実行し、不整合を残さない

## 補足

- MonthlyRecord は作成しない
- 初期前提投入は C3 usecase に委譲する

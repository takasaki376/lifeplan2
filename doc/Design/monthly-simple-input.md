# 月次かんたん入力（E3）設計

## 目的

月次入力（かんたん）画面で対象月の `MonthlyRecord` を読み込み、入力値を
`upsert` で保存できるようにする。未入力の月は空状態で開始する。

## 対象画面 / ルート

- `/plans/[planId]/months/current`
- `/plans/[planId]/months/[yyyy-mm]`

`current` はクライアント側で当月の `YYYY-MM` を決定し、同じロジックを
`[yyyy-mm]` 側に移譲する。

## 依存モジュール

- Repository: `MonthlyRepository`
  - `getByYm(planId, ym)`
  - `upsertByYm(planId, ym, patch)`
- Repository: `PlanRepository`
  - `get(planId)`
- Format utility: `getCurrentYearMonth`, `formatYearMonth`,
  `prevYearMonth`, `nextYearMonth`, `parseYenInput`

## データ項目（MVP）

`MonthlyRecord` の以下のフィールドを編集対象とする。

- `incomeTotalYen`
- `expenseTotalYen`
- `assetsBalanceYen`
- `liabilitiesBalanceYen`

## 画面挙動

### 初期読み込み

1. `PlanRepository.get(planId)` でプラン存在を確認
2. `MonthlyRepository.getByYm(planId, ym)` で対象月を取得
3. 取得できた場合はフォームに値を反映し、ステータスを「入力済み」にする
4. 取得できない場合は空のフォームで開始し、ステータスを「未入力」にする

### 入力バリデーション

- 0 以上のみ許可（負数はエラー）
- 空欄は `undefined` として保持
- エラーがある場合は保存しない

### 保存（upsert）

- 保存ボタン押下時に `MonthlyRepository.upsertByYm` を使用
- 既存 record があれば更新、無ければ新規作成
- `createdAt` / `updatedAt` / `id` は Repo 側で生成
- `isFinalized` は「保存して戻る」で `true`、下書きは既存値維持

### 保存後の遷移

- 成功: toast 表示 + `/plans/[planId]` へ遷移
- 失敗: toast 表示、画面に留まる

### 月の移動

- 前月/次月のボタンは `prevYearMonth` / `nextYearMonth` で `ym` を作成
- 移動先は `/plans/[planId]/months/[yyyy-mm]`
- 月選択ドロップダウンも同様に `[yyyy-mm]` へ遷移

## UI 状態

- 読み込み中: Skeleton 表示
- 読み込み失敗: Alert 表示
- 保存中: ボタン disabled
- 入力済み/未入力: Badge 表示

## 参照実装

- `src/app/plans/[planId]/months/current/page.tsx`
- `src/app/plans/[planId]/months/[yyyy-mm]/page.tsx`


# Jira チケット（E1-FINALIZE）月次一覧：確定/解除ボタン＋ confirm ＋保存（isFinalized 更新）

## Summary

E1-FINALIZE. 月次一覧：月次の確定/解除（isFinalized）アクション実装（confirm ＋保存）

## Issue Type

Story（または Task）

## Priority

Medium-High（運用性向上。締め概念の実装）

## Background / Context

E1-EXT で確定（isFinalized）の表示・フィルタを追加しても、確定/解除の操作ができなければ運用に乗らない。
本チケットでは、月次一覧の行アクションとして「確定」「解除」を提供し、confirm 付きで isFinalized を保存する。

## Goal

- 月次一覧から対象月を「確定」できる（isFinalized=true）
- 月次一覧から対象月を「解除」できる（isFinalized=false）
- 未入力（月次 record なし）の月には操作を出さない/disabled にする
- 実行後、一覧のバッジ表示とフィルタ（E1-EXT）が即時に反映される
- confirm・二重送信防止・成功/失敗通知がある

---

## In Scope

- 画面：`/plans/[planId]/months`（月次一覧）
- 行アクション（DropdownMenu など）に追加：
  - 入力済み & 未確定：`確定する`
  - 入力済み & 確定：`確定を解除`
- confirm ダイアログ（必須）
- 永続化（IndexedDB / Repo）：
  - `MonthlyRepo.upsertByYm(planId, ym, { isFinalized: true/false })`
- 実行後の UI 更新：
  - 行のバッジが更新される
  - フィルタ適用中なら一覧が再評価される
- ローディング/エラー処理：
  - 実行中 disabled
  - toast（成功/失敗）

## Out of Scope

- 確定月の編集ロック（入力画面で編集不可）※E1-LOCK 等で別途
- Undo（取り消し）
- 監査ログ（誰がいつ確定したか）

---

## Functional Requirements

### 1) 表示条件（アクションの出し分け）

- `record = MonthlyRepo.getByYm(planId, ym)` が存在しない：
  - `確定/解除` は表示しない（または disabled で理由表示）
- record が存在する：
  - `record.isFinalized === true` → アクション `確定を解除`
  - `record.isFinalized !== true` → アクション `確定する`

### 2) confirm ダイアログ

- 「確定する」の場合
  - Title：`この月を確定しますか？`
  - Description：`確定すると、未確定の月だけを探しやすくなります。必要なら後で解除できます。`
  - Buttons：キャンセル / 確定する（destructive ではなく primary 推奨）
- 「確定を解除」の場合
  - Title：`この月の確定を解除しますか？`
  - Description：`解除すると未確定として扱われます。`
  - Buttons：キャンセル / 解除する（warning/secondary）

※（任意）対象月（YYYY 年 M 月）を表示して誤操作防止。

### 3) 保存処理

- 実行：
  - `await MonthlyRepo.upsertByYm(planId, ym, { isFinalized: <true|false> })`
- 成功：
  - toast：`確定しました` / `確定を解除しました`
  - 該当月の一覧行の状態を更新（再 fetch or state 更新）
- 失敗：
  - toast：`更新に失敗しました`
  - ダイアログは開いたまま or 閉じる（どちらでもよいが再試行できる導線を残す）

### 4) UI 更新（反映）

- 最小：更新後に `reloadList()` を呼び、一覧データを再取得して再描画
- 可能なら：対象行だけ `isFinalized` を更新して即反映（optimistic UI）
  - ただし失敗時ロールバック必須

### 5) エラーハンドリング

- record 取得に失敗：行アクションを出さず、一覧上部に軽いエラー（任意）
- 更新に失敗：toast + 操作可能状態へ復帰

---

## UI Requirements

- v0 モック準拠
- 行アクション：`DropdownMenu` + `AlertDialog`（shadcn/ui）
- 確定バッジ（E1-EXT）が即時反映される
- 実行中は二重送信不可（ボタン disabled + spinner）

---

## Technical Notes

- `"use client"`（IndexedDB）
- Repo：
  - `MonthlyRepo.getByYm(planId, ym)`
  - `MonthlyRepo.upsertByYm(planId, ym, { isFinalized })`
- 既存データ互換：
  - isFinalized undefined は false 相当（未確定）
- ロックは別チケット（本チケットでは入力画面遷移はそのまま許容）

---

## Acceptance Criteria

- [ ] 入力済み（月次 record あり）の月で「確定する/解除する」が表示される（状態で出し分け）
- [ ] 未入力（月次 record なし）の月では確定/解除ができない
- [ ] confirm を経て確定/解除が実行され、IndexedDB に保存される
- [ ] 実行後、一覧の「確定」バッジ表示とフィルタ結果が即時に反映される
- [ ] 成功/失敗 toast が表示される
- [ ] 実行中は二重送信できない
- [ ] lint/typecheck が通る

## Definition of Done

- [ ] PR 作成＆レビュー完了
- [ ] 手動テスト手順が PR に記載
  - 未確定 → 確定
  - 確定 → 解除
  - 未入力月でアクション不可
  - フィルタ「確定のみ/未確定のみ」適用中に操作して一覧が更新される
- [ ] lint/typecheck が通る

---

## Dependencies

- E1（月次一覧）
- E1-EXT（確定表示/フィルタ）※無くても動くが検証が容易
- B5（MonthlyRepo upsert/get）
- （任意）A5（年月表示）

## Follow-ups

- E1-LOCK：確定月の編集ロック（入力/詳細/削除制限）
- E1-AUDIT：確定日時・確定者などの記録（将来）

# AGENTS.md

このドキュメントは、Codex（自律エージェント CLI）や協力開発者が `lifeplan2` の実装を安全に前進させるための作業規約です。人間の判断が必要なところは「決定済みの方針」に従い、迷いが出た場合は “最小で進む” を優先してください。

---

## 0. TL;DR（最短の進め方）

1. チケット（参照: B4, D5, G1-1 など）を読み、受け入れ条件（AC）を箇条書きにする
2. 影響範囲（app route / lib / repo / db schema）を特定する
3. 実装後に `yarn lint` / `yarn test`（存在する場合）/ `yarn build` を通す
4. 変更点を小さくまとめ、PR 本文に「何をどう変えたか」「手動テスト手順」を書く

---

## 1. プロジェクト概要（MVP 方針）

- 単発試算ではなく、月次の収入・支出・資産/負債を継続入力しながら、
  ライフイベント・住居 LCC・改定履歴・バージョンを“見直し続ける”アプリ
- MVP の永続化は **IndexedDB**、将来の **Supabase** 移行を想定し、DB アクセスは Repository 層で抽象化する
- UI は v0 で生成した shadcn/ui ベースを前提に実装する  
  ※ README にも同趣旨あり

---

## 2. 開発環境 / コマンド

- Package Manager: **Yarn v1.22.19**
- 起動
  - `yarn install`
  - `yarn dev` → http://localhost:3000
- ビルド
  - `yarn build`
  - `yarn start`
- Lint
  - `yarn lint`
- Test
  - `yarn test`（Vitest を想定。scripts に存在する場合のみ）

### IndexedDB スモークチェック

- `yarn dev` 起動後に `/dev/db-check` を開き、Run Check を実行（開発用）
  - ※データリセットは DevTools の IndexedDB 削除で OK

---

## 3. ディレクトリ責務（原則）

- `src/app/**` : 画面・ルーティング（Next.js App Router）
- `src/lib/domain/**` : ドメイン型（純粋な型・ユーティリティ）
- `src/lib/db/**` : IndexedDB スキーマ / ラッパー（低レイヤ）
- `src/lib/repo/**` : Repository 層（IndexedDB / Supabase 差し替えポイント）
- `src/lib/usecases/**` : 業務フロー（複数 Repo 連携、tx 境界）
- `src/lib/calc/**` : 計算モジュール（LCC 等）

> 「UI → usecase → repo → db」の一方向依存を守る  
> `app` から `db` を直叩きしない（Repo 経由）

---

## 4. Repo 設計：決定済み方針（重要）

### 4.1 例外

- Result / Either は使わず **throw**
- Repo は「包みすぎない」。ただし文脈（planId / ym 等）を付与して `RepoError` を投げてよい

### 4.2 トランザクション境界（withTx）

- 原則: usecase 側で tx を開始し、複数 Repo に同一 tx を渡す
- 例外: 不変条件を守る “原子操作” は Repo に専用メソッドとして閉じ込める
  - 例: `HousingRepo.setSelected(versionId, type)`（同一 version で 1 つだけ選択）
  - 例: `VersionRepo.setCurrent(planId, versionId)`（current 整合）

### 4.3 ID / createdAt / updatedAt

- **Repo が生成**する（呼び出し側はビジネス入力だけ渡す）
- `createdAt` は初回のみ、`updatedAt` は更新ごとに更新

### 4.4 CurrentVersion の整合

- **正の source of truth は `Plan.currentVersionId`**
- `PlanVersion.isCurrent` の二重管理は避ける（持つ場合も派生扱い）
- 更新口は `VersionRepo.setCurrent(planId, versionId)` に寄せる（Plan も同一 tx で更新）

### 4.5 ScenarioAssumptions

- MVP は **VersionRepo に寄せる**（別 Repo に切り出さない）
  - `getScenarioSet(versionId)` / `upsertScenarioSet(versionId, set)` など

### 4.6 MonthlyRecord と MonthlyItem

- MVP は **MonthlyRepo に寄せる**（別 Repo に切り出さない）
  - `listItems(recordId)` / `replaceItems(recordId, items)` / `deleteByYm(planId, ym)` 等

---

## 5. 画面/URL の共有方針（scenario）

- `scenario` は URL クエリで表現する（例: `?scenario=base`）
- 値: `conservative | base | optimistic`
- 不正/未指定は `base` にフォールバック
- 画面間遷移（例: D5→G1）で `scenario` を引き継ぐ

---

## 6. 実装ルール / コーディング規約

### 6.1 TypeScript

- `any` は原則禁止。`unknown` と型ガードを使う
- public API（repo / usecase / calc）の入出力型を明確にする

### 6.2 UI（Next.js + shadcn/ui）

- IndexedDB アクセスを行うコンポーネントは `"use client"`
- “空状態 / エラー / ローディング” を明示する（Skeleton / Alert）
- v0 生成 UI を尊重しつつ、ビジネスロジックは `usecase` / `lib` に寄せる

### 6.3 データ整合（よく壊れる点）

- `HousingAssumptions.isSelected` は同一 version 内で常に 1 つ（Repo 側で排他制御）
- 月次削除は record と items の両方を tx で削除
- 月次詳細の「その他（調整）」は負数を許容。通常行は `> 0`

---

## 7. Codex 向け：作業手順テンプレ

### 7.1 チケット実装の進め方

- 変更ファイル一覧を最初に列挙し、影響範囲を限定する
- まず型（domain / repo interface）、次に repo 実装、最後に UI 接続
- 大きいタスクは小さくコミット（例: I/F 追加 → 実装 → UI 接続）

### 7.2 PR チェックリスト（最低限）

- [ ] `yarn lint` が通る
- [ ] `yarn build` が通る
- [ ] 画面の手動テスト手順を PR に記載（URL / 操作 / 期待結果）
- [ ] 破壊的変更（schema 変更等）がある場合、マイグレーション方針を README または doc に追記

---

## 8. 追加してよい / 避けたいもの

- 小さく閉じたユーティリティ（date / format 等）は OK
- 既存の Vitest / ESLint / Next に沿う変更は OK
- 状態管理ライブラリの追加（Redux 等）は MVP では不要
- 重い日付ライブラリを無条件追加しない。必要なら最小で

---

## 9. 不明点が出たら

- まずこの `AGENTS.md` の「決定済み方針」に従う
- それでも不明なら「MVP として安全な最小案」を採用し、PR に TODO を残す
- schema 変更が必要なら、後方互換（version bump 等）を優先する

---

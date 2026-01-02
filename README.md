````md
# ライフプラン管理アプリ（MVP）

「単発試算」ではなく、**月次（収入・支出・資産/負債）を継続入力**しながら、  
**ライフイベント・住宅 LCC・改定履歴（バージョン）** を“見直し続ける”ためのライフプラン管理アプリです。

> ⚠️ 本アプリは一般的な情報提供を目的としています。投資助言・税務助言・法的助言を行うものではありません。  
> 数値は前提に依存する概算であり、前提はユーザーが編集可能な設計です。

---

## 目標（MVP）

- 月次で家計（収入/支出）と残高（資産/負債）を入力し、推移を確認できる
- ライフイベント（単発/毎月）を登録し、将来見通しに反映できる
- 住宅（高性能住宅 / 一般戸建 / 分譲マンション / 賃貸）の **生涯コスト（LCC）比較** ができる
- 計画を改定（バージョン管理）し、前提の差分を確認できる

---

## 技術スタック

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- shadcn/ui（v0 で生成した UI をベースに実装）
- 永続化（MVP）：**IndexedDB**
- 永続化（将来）：**Supabase**
- パッケージ管理：**Yarn v1.22.19**

---

## セットアップ

### 前提

- Node.js（LTS 推奨）
- Yarn v1.22.19

### インストール

```bash
yarn install
```
````

### 起動

```bash
yarn dev
```

- [http://localhost:3000](http://localhost:3000)

### ビルド / 起動（本番相当）

```bash
yarn build
yarn start
```

### Lint（設定している場合）

```bash
yarn lint
```

---

## データ保存（MVP：IndexedDB）

MVP ではローカルの IndexedDB にデータを保存します。

### データをリセットしたいとき

- Chrome DevTools → **Application** → **IndexedDB** → 該当 DB を削除
  もしくは、アプリ内に開発モード限定の「データ初期化」機能がある場合はそれを使用してください。

### 開発用：IndexedDB スモークチェック

- `yarn dev` 起動後に `/dev/db-check` を開いて **Run Check** を実行
- `plans` store に一時データを `put/get/listAll` で確認し、最後に削除します

### 仕様（目安）

- 月次実績：Plan 直下で保存（改定 Version に依存しない）
- 前提（シナリオ・住宅前提・ライフイベント）：PlanVersion 配下で保存（差分比較の対象）

> 将来 Supabase に移行できるよう、DB アクセスは Repository 層で抽象化します。

---

## 画面

- プラン一覧
- プラン作成（かんたんウィザード）
- ダッシュボード
- 月次一覧
- 月次入力（かんたん）
- 月次入力（詳細）
- 住宅 LCC 比較トップ
- 住宅 LCC 前提編集
- イベント一覧
- イベント作成/編集
- 改定履歴（バージョン）/差分（MVP は簡易）

---

## ルーティング（例）

```txt
/                         # プラン一覧
/plans/new                # プラン作成ウィザード
/plans/[planId]           # ダッシュボード

/plans/[planId]/months
/plans/[planId]/months/current
/plans/[planId]/months/[yyyy-mm]
/plans/[planId]/months/[yyyy-mm]/detail

/plans/[planId]/housing
/plans/[planId]/housing/assumptions
/plans/[planId]/housing/[type]

/plans/[planId]/events
/plans/[planId]/events/new
/plans/[planId]/events/[eventId]/edit

/plans/[planId]/versions
/plans/[planId]/versions/new
/plans/[planId]/versions/[versionId]
```

---

## ディレクトリ構成（例）

```txt
src/
  app/
    page.tsx
    plans/
      new/
      [planId]/
        page.tsx
        months/
        housing/
        events/
        versions/
  components/
    ui/           # shadcn/ui
    layout/
    plan/
    months/
    housing/
    events/
  lib/
    format/       # 円・年月など
    db/           # IndexedDB wrapper
    repo/         # Repository interfaces + implementations
    domain/       # type definitions
    calc/         # LCC/CF計算ロジック
```

---

## アーキテクチャ（MVP 方針）

### Repository 層で永続化を抽象化

- `PlanRepository`
- `MonthlyRepository`
- `EventRepository`
- `HousingRepository`
- `VersionRepository`

MVP は `IndexedDBRepository` を実装し、将来 `SupabaseRepository` に差し替え可能にします。

### 計算ロジックは UI と分離

- LCC 計算（内訳：初期費用・ローン/家賃・税・修繕/管理・光熱費）
- 月次集計（収支、固定/変動、差分整合）

---

## 開発フロー（Jira）

- Epic → Story/Task で作業を管理します
- 最初の優先度：

  1. データ層（IndexedDB + Repo 抽象化）
  2. 月次（一覧・かんたん・詳細）
  3. 住宅 LCC（比較・前提編集・計算）
  4. イベント（一覧・作成/編集）
  5. 改定（バージョン）・差分

---

## 環境変数

MVP（IndexedDB）では必須の環境変数はありません。
Supabase 導入時に `.env.local` を追加予定：

```env
# 将来導入（例）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 注意事項

- 税・制度は MVP では概算モデルです（地域差・控除完全対応は非スコープ）
- 数値は前提の変更で大きく変わります（前提は必ず編集可能にします）
- 個人情報は最小限にし、概算入力でも使える導線を優先します

---

## ライセンス

TBD（例：MIT / Proprietary）

---

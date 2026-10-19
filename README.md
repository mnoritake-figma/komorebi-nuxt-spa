# komorebi
Nuxt 4 + Vite + Supabaseの小さなSNS。投稿（280文字）、タイムライン（最新100件）、検索、いいね、自分の投稿削除、ログイン操作不要の匿名投稿、レスポンシブ対応。

## 起動
Node.js 22以上とpnpmを用意し、以下を実行します。

```sh
pnpm install
cp .env.example .env # .env が未作成の場合のみ
pnpm dev
```

`.env` に `NUXT_PUBLIC_SUPABASE_URL` と `NUXT_PUBLIC_SUPABASE_KEY`（publishable keyまたはanon key）を設定します。`.env` はGit管理外のため、クローンした環境では設定が必要です。service_roleキーは使用しません。

## Supabase設定（必要）
1. SupabaseプロジェクトのSQL Editorで `supabase/schema.sql` を実行してください。新規テーブル用SQLです。既存テーブルがある場合は事前に構造を確認してください。
2. SupabaseのAuthentication → Sign In / Providersで **Allow anonymous sign-ins** を有効にして保存します。
3. アプリで表示名と本文を入力して投稿します。初回の投稿・いいね時に匿名セッションを自動作成するため、メール・Google・パスワード入力は不要です。Google OAuthやRedirect URLsの設定も不要です。

内部ではSupabaseの匿名認証で投稿の所有者を識別します。既存のSQL/RLSをそのまま使えます。同じブラウザのセッションを保持している間は自分の投稿を削除できます。ブラウザデータを消したり別端末に移動すると、以前の匿名投稿の所有権は引き継げません。
公式手順: https://supabase.com/docs/guides/auth/auth-anonymous

公開キーはブラウザで利用する想定です。RLSで投稿・いいねの書き込みと削除を本人に制限しています。投稿といいねは公開読み取りです。メールアドレスは投稿テーブルに保存しません。表示名は投稿時に保存されます。

未設定時、または接続エラー画面で「デモで試す」を選択した場合は、サンプル投稿とlocalStorageを使用します。デモの投稿はSupabaseへ移行されません。

## 検証・公開
```sh
pnpm typecheck
pnpm generate
```

Viteはビルドツールで、ホスティングサービスではありません。NuxtはViteでビルドし、`pnpm generate` の出力 `.output/public` を静的ホスティングに配置します。ビルド環境に上記の2つの環境変数を設定してからビルドしてください。キー変更時は再ビルドが必要です。

Vercelの場合: Build Command `pnpm generate` / Output Directory `.output/public`。ホスティング先のアカウント・プロジェクトは別途必要です。

現時点で返信、フォロー、画像添付、無限スクロールは対象外です。タイムラインの更新ボタンで最新データを取得します。

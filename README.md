# 韓国語 Daily 5000 — 拡張中

## これは何か
日常会話を中心にした韓国語Rank教材を、既存のRank 1–3000と学習履歴を維持したままRank 5000へ拡張しているWebアプリです。現在のビルドチェーンはRank 3701–3800までを対象にしています。

- 韓国語キーボード入力不要
- 単語・例文の韓国語音声
- 意味想起 / 聞き取り / 口頭産出
- 忘れた / 難しい / できた / 簡単
- FSRS（読み込めない場合は内蔵SRS）
- 今日の予定後も +5 / +10 / +20 / どんどん進む
- ブラウザ内に進捗保存
- JSONバックアップ / 復元
- PWA対応（ホーム画面追加）
- GitHub Pages対応

## GitHub Pagesで公開する場合
このフォルダの中身をリポジトリのルートへ置き、mainブランチへpushします。

同梱の `.github/workflows/pages.yml` を使う場合：
1. GitHubリポジトリ → Settings → Pages
2. Build and deployment → Source を `GitHub Actions`
3. `[deploy]` を含むコミットをmainへpush
4. Actions完了後に既存Pages URLへ反映されます

## 学習履歴
既存の学習履歴・設定・同期の保存キーは5000語拡張でも変更しません。

- `korean-daily-3000-state-v01`
- `korean-daily-3000-settings-v01`
- `korean-daily-3000-sync-v01`

同じWebサイトURL・同じブラウザではアプリ更新後も既存進捗を継続します。

## ホーム画面
iPhone/iPad:
Safariで公開URLを開く → 共有 → ホーム画面に追加

Android:
Chromeで公開URLを開く → メニュー → ホーム画面に追加 / アプリをインストール

## 拡張方針
Rank 3001–5000は既存Rankとの重複を避け、日常生活・旅行・仕事・デジタル操作・各種手続きなどで使う実用語彙を優先します。各100語バッチごとに例文・訳・語形解説・文法参照・TTSと既存機能の回帰監査を行います。

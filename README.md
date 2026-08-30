# 韓国語 Daily 3000 — Web公開版 v0.6

## これは何か
日常会話用Rank 1–3000を母集団に、現在Rank 1–200まで詳細教材化した韓国語学習Webアプリです。

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
3. mainへpush
4. Actions完了後にPages URLが発行されます

## 学習履歴
学習履歴のlocalStorageキーはバージョンアップで変更しない設計です。
同じWebサイトURL・同じブラウザを使う限り、アプリ更新後も進捗を継続できます。

ただし、PCとiPhoneなど別端末間ではまだ同期されません。
週1回程度、アプリの「進捗JSONを書き出す」でバックアップしてください。

## ホーム画面
iPhone/iPad:
Safariで公開URLを開く → 共有 → ホーム画面に追加

Android:
Chromeで公開URLを開く → メニュー → ホーム画面に追加 / アプリをインストール

## 次段階
- Rank 201–500教材化
- 500→1000→3000へ拡張
- Supabase等による端末間の学習履歴同期

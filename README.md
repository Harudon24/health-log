# health-log

日付ごとの食事・栄養を記録する日本語の静的サイトです。HTML / CSS / JavaScriptだけで動き、表示データはGitHubリポジトリ内の `data/health-log.json` を正本として扱います。

## データ管理方針

- 食事データと目標値は **`data/health-log.json` が唯一の正本**です。
- ブラウザーの `localStorage` は使いません。
- このチャットから食事を追加するときは、`data/health-log.json` を更新してコミットします。
- GitHub Pages側では毎回JSONを読み直して表示します。
- 「最新データを再読み込み」を押すとキャッシュを避けて再取得します。
- ブラウザー側からの追加・編集機能はありません。履歴をGitHubに一本化するための仕様です。

これにより、端末やブラウザーを変えてもGitHubに保存された同じ記録を確認できます。

## 開き方

GitHub Pagesを使う場合は、リポジトリの **Settings → Pages → Deploy from a branch → main / (root)** を選択します。

ローカルで確認する場合はNode.jsがある環境で以下を実行します。

```bash
npm start
```

その後 `http://127.0.0.1:4173/health-log/` を開きます。JSONを `fetch` するため、`index.html` を `file://` で直接開く方法は使いません。

## 画面

- カレンダーから日付を選択
- その日の食事一覧を表示
- カロリー、たんぱく質、脂質、炭水化物、食塩相当量、食物繊維を集計
- 目標を100%としたメーターを表示
- 前日との摂取量差を表示
- 食塩は目標値ではなく上限として扱う
- 未確認の栄養素は0ではなく「未確認」として扱う

初期目標は以下です。

- カロリー: 2100 kcal
- たんぱく質: 70 g
- 脂質: 55 g
- 炭水化物: 275 g
- 食塩相当量: 6 g未満
- 食物繊維: 未設定

## データ形式

`data/health-log.json` の例:

```json
{
  "version": 1,
  "updatedAt": "2026-09-12",
  "targets": {
    "calories": 2100,
    "protein": 70,
    "fat": 55,
    "carbs": 275,
    "salt": 6,
    "fiber": null
  },
  "meals": [
    {
      "id": "2026-09-12-breakfast-1",
      "date": "2026-09-12",
      "category": "朝食",
      "name": "バナナ1本 ＋ カロリーメイト4本",
      "nutrients": {
        "calories": 490,
        "protein": 10,
        "fat": 23,
        "carbs": 65,
        "salt": 0.7,
        "fiber": null
      },
      "estimated": true,
      "note": "カロリー・PFCは概算。"
    }
  ]
}
```

`null` は未確認値です。0とは区別します。

## 2026-09-12 初期データ

初期記録の合計は **1391kcal / たんぱく質45g / 脂質64g / 炭水化物170g**。

夕食のかき揚げそばは汁を飲み干していないため、実際に摂取した食塩量は未確認としてあります。そのため日合計の食塩表示は判明分のみです。

## 構成

- `index.html`：画面構成
- `styles.css`：PC / スマホ向けデザイン
- `data/health-log.json`：GitHub上の食事・目標データ
- `model.js`：栄養素定義、合算、日付計算、入力検証
- `app.js`：JSON読み込み、カレンダー・メーター・比較・食事一覧の描画
- `tests/model.test.cjs`：集計・未確認値・日付・データ検証のテスト

## 確認

```bash
npm test
```

で、初期合計、未確認と0の区別、日付境界、GitHubデータの検証を確認できます。

# 棋盤探險隊

依照西洋棋入門課綱 v4 製作的八堂課。第一堂依序練車、主教、皇后，第二堂依序練王、馬、兵。可點棋子再點落點、看提示、重試，最後與同伴共用棋盤對弈和復盤。

- [開啟試玩網站](https://yangyang-shengming.github.io/chess-explorers/)
- [直接開第 3A 題](https://yangyang-shengming.github.io/chess-explorers/#3A)
- [從第 2 堂開始](https://yangyang-shengming.github.io/chess-explorers/#lesson-2)

## 編輯題目

- `course.js` 放八堂課的順序、課堂玩法及新增題目。課堂可透過 `#lesson-2` 連到第二堂，個別題目可透過 `#3A` 開啟。
- `puzzles.js` 放最初六題，與原有紙本的題號和起始棋局對應。
- `game.js` 控制點棋、切換題目、雙人對弈和復盤。通關紀錄儲存在目前的瀏覽器。
- `rules.js` 用 chess.js 檢查走法是否合法，接著檢查是否完成題目的指定動作。
- `index.html` 和 `styles.css` 控制畫面。棋盤使用原生按鈕，可用方向鍵移動焦點，按 Enter 或空白鍵選格。

修改棋局時，`solution` 記下通關的一步，`hint.squares` 決定按提示時要亮起的格子。特定錯法的回饋可填在 `feedback`，以起點和終點組成鍵值，例如 `e2e1`。

找格題可用 `mark.from` 由棋規算出合法落點，或用 `mark.squares` 指定答案。判斷棋局題使用 `choice`。像 7A 的連續練習用 `line` 依序標出答題走法與黑方回應。省略 FEN 時使用標準起始局面。

## 預覽與測試

在專案根目錄啟動任一靜態 HTTP 伺服器。例如有 Python 時執行 `python -m http.server 8000`，再開 `http://localhost:8000`。

執行 `node --test` 驗證題目、合法走法和回饋。chess.js 1.4.0 隨網站附上，授權檔位於 `vendor/chess-LICENSE.txt`。

## 用 Claude Code 編輯和部署

在 Claude Code 連結 GitHub 後，選擇 `yangyang-shengming/chess-explorers`。把修改留在分支，預覽並執行測試後，開 Pull Request 合併到 `main`。

GitHub Pages 的發佈來源是 `main` 根目錄。合併後 GitHub 會重新部署，試玩網址維持相同。

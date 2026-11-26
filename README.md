# 棋盤探險隊

西洋棋入門課的六題試玩。送貨、救王和馬叉各兩題，可點棋子再點落點，使用提示，或重試同一局面。

- [開啟試玩網站](https://yangyang-shengming.github.io/chess-explorers/)
- [直接開第 3A 題](https://yangyang-shengming.github.io/chess-explorers/#3A)

## 編輯題目

- `puzzles.js` 放題號、學生看到的題目、起始局面（FEN）、通關走法、提示和答題回饋。講義可用相同題號，網址加上 `#3A` 便會直接開該題。
- `game.js` 控制點棋、切換題目和進度。完成紀錄儲存在目前的瀏覽器。
- `rules.js` 用 chess.js 檢查走法是否合法，接著檢查是否完成題目的指定動作。
- `index.html` 和 `styles.css` 控制畫面。棋盤使用原生按鈕，可用方向鍵移動焦點，按 Enter 或空白鍵選格。

修改棋局時，`solution` 記下通關的一步，`hint.squares` 決定按提示時要亮起的格子。特定錯法的回饋可填在 `feedback`，以起點和終點組成鍵值，例如 `e2e1`。

## 預覽與測試

在專案根目錄啟動任一靜態 HTTP 伺服器。例如有 Python 時執行 `python -m http.server 8000`，再開 `http://localhost:8000`。

執行 `node --test` 驗證題目、合法走法和回饋。chess.js 1.4.0 隨網站附上，授權檔位於 `vendor/chess-LICENSE.txt`。

## 用 Claude Code 編輯和部署

在 Claude Code 連結 GitHub 後，選擇 `yangyang-shengming/chess-explorers`。把修改留在分支，預覽並執行測試後，開 Pull Request 合併到 `main`。

GitHub Pages 的發佈來源是 `main` 根目錄。合併後 GitHub 會重新部署，試玩網址維持相同。

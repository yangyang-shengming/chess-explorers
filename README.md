# 棋盤探險隊

依照西洋棋入門課綱 v4 製作的八堂課。第一堂依序練車、主教、皇后，第二堂依序練王、馬、兵。可點棋子再點落點、看提示、重試，最後與同伴共用棋盤對弈和復盤。

- [開啟試玩網站](https://yangyang-shengming.github.io/chess-explorers/)
- [直接開第 3A 題](https://yangyang-shengming.github.io/chess-explorers/#3A)
- [從第 2 堂開始](https://yangyang-shengming.github.io/chess-explorers/#lesson-2)
- [第 8 堂雙人棋盤、班內 Elo 與對局庫](https://yangyang-shengming.github.io/chess-explorers/#8A)

## 編輯題目

- `course.js` 放八堂課的順序、課堂玩法及新增題目。課堂可透過 `#lesson-2` 連到第二堂，個別題目可透過 `#3A` 開啟。
- `puzzles.js` 放最初六題，與原有紙本的題號和起始棋局對應。
- `game.js` 控制點棋、切換題目、雙人對弈和復盤。通關紀錄儲存在目前的瀏覽器。
- `rules.js` 用 chess.js 檢查走法是否合法，接著檢查是否完成題目的指定動作。
- `index.html` 和 `styles.css` 控制畫面。棋盤使用原生按鈕，可用方向鍵移動焦點，按 Enter 或空白鍵選格。

修改棋局時，`solution` 記下通關的一步，`hint.squares` 決定按提示時要亮起的格子。特定錯法的回饋可填在 `feedback`，以起點和終點組成鍵值，例如 `e2e1`。

找格題可用 `mark.from` 由棋規算出合法落點，或用 `mark.squares` 指定答案。判斷棋局題使用 `choice`。像 7A 的連續練習用 `line` 依序標出答題走法與黑方回應。省略 FEN 時使用標準起始局面。

## 第 8 堂雙人棋盤

點棋子即可看到合法落點，可取消勾選「標示合法落點」。選「班內計分局」並輸入雙方代號後，已完成的棋局才計分。首筆賽果以 200 分、K 值 24 起算，未有賽果顯示未定級，新手前四局的分數標為暫定。

對弈完成後會儲存棋譜。將死和棋規判定的和局會自動登記，認輸或協議和棋可手動結束本局。對局庫可搜尋選手，從起始位置逐步復盤，也可點走法跳到指定局面。用「登記平時對局」補錄站外賽果時，可一併貼入一局 PGN。補登、更正或刪除後，依對局時間重算分數和里程碑。

有棋譜的計分局可解鎖第一次王車易位、吃過路兵、升變、逼和、將死。棋譜、選手名單和賽果保存在目前瀏覽器的 IndexedDB。

- `elo.js` 計算分數與每位選手的首次成就。
- `game-log.js` 解析 PGN、重建局面並找出棋規里程碑。
- `game-db.js` 讀寫名單和對局紀錄，`elo-ui.js` 處理登記、查詢和成就介面。

## 預覽與測試

在專案根目錄啟動任一靜態 HTTP 伺服器。例如有 Python 時執行 `python -m http.server 8000`，再開 `http://localhost:8000`。

執行 `node --test` 驗證題目、合法走法、棋譜復盤及 Elo。chess.js 1.4.0 隨網站附上，授權檔位於 `vendor/chess-LICENSE.txt`。

## 用 Claude Code 編輯和部署

在 Claude Code 連結 GitHub 後，選擇 `yangyang-shengming/chess-explorers`。把修改留在分支，預覽並執行測試後，開 Pull Request 合併到 `main`。

GitHub Pages 的發佈來源是 `main` 根目錄。合併後 GitHub 會重新部署，試玩網址維持相同。

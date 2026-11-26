import { categories, puzzles } from './puzzles.js';
import { startPuzzle, tryMove } from './rules.js';

const byId = (id) => document.getElementById(id);
const board = byId('board');
const categoryList = byId('categories');
const puzzleList = byId('puzzles');
const title = byId('puzzle-title');
const feedback = byId('feedback');
const hintButton = byId('hint');
const nextButton = byId('next');

const files = 'abcdefgh';
const ranks = '87654321';
const pieceNames = { k: '王', q: '后', r: '車', b: '象', n: '馬', p: '兵' };
const pieceSymbols = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' };
const progressKey = 'chess-explorers:completed:v1';
const completed = readProgress();

const squares = new Map();
const categoryButtons = new Map();
const puzzleButtons = new Map();
let puzzle;
let position;
let selected;
let cursor;
let mistake;
let hintVisible;
let played;

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) ?? '[]');
    return new Set(puzzles.filter((item) => Array.isArray(saved) && saved.includes(item.id)).map((item) => item.id));
  } catch {
    return new Set();
  }
}

function rememberProgress() {
  try {
    localStorage.setItem(progressKey, JSON.stringify([...completed]));
  } catch {
    // The current session still works when browser storage is unavailable.
  }
}

function span(className, text = '') {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

function createButtons() {
  for (const category of categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category';
    button.dataset.category = category.id;
    const icon = span('category-icon', category.icon);
    icon.setAttribute('aria-hidden', 'true');
    const count = span('category-count');
    button.append(icon, span('category-name', category.name), count);
    button.addEventListener('click', () => {
      if (puzzle.category === category.id) return;
      const items = puzzles.filter((item) => item.category === category.id);
      openPuzzle(items.find((item) => !completed.has(item.id)) ?? items[0]);
    });
    categoryList.append(button);
    categoryButtons.set(category.id, { button, count });
  }

  for (const item of puzzles) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'puzzle-choice';
    button.dataset.puzzle = item.id;
    const done = span('puzzle-done', '✓');
    done.setAttribute('aria-hidden', 'true');
    button.append(span('puzzle-number', item.id), done);
    button.addEventListener('click', () => openPuzzle(item));
    puzzleList.append(button);
    puzzleButtons.set(item.id, { button, done });
  }
}

function createBoard() {
  for (const file of files) byId('files').append(span('coordinate', file));
  for (const rank of ranks) byId('ranks').append(span('coordinate', rank));

  for (const [row, rank] of [...ranks].entries()) {
    for (const [column, file] of [...files].entries()) {
      const square = file + rank;
      const button = document.createElement('button');
      button.className = 'square';
      button.type = 'button';
      button.dataset.square = square;
      button.dataset.tone = (row + column) % 2 === 0 ? 'light' : 'dark';
      const pieceNode = span('piece');
      const cargo = span('cargo');
      pieceNode.setAttribute('aria-hidden', 'true');
      cargo.setAttribute('aria-hidden', 'true');
      button.append(pieceNode, cargo);
      button.addEventListener('click', () => selectSquare(square));
      board.append(button);
      squares.set(square, { button, pieceNode, cargo });
    }
  }

  board.addEventListener('keydown', (event) => {
    const offsets = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const offset = offsets[event.key];
    const current = event.target.dataset.square;
    if (!offset || !current) return;
    event.preventDefault();
    const fileIndex = files.indexOf(current[0]) + offset[0];
    const rankNumber = Number(current[1]) + offset[1];
    if (fileIndex < 0 || fileIndex > 7 || rankNumber < 1 || rankNumber > 8) return;
    cursor = files[fileIndex] + rankNumber;
    renderBoard();
    squares.get(cursor).button.focus({ preventScroll: true });
  });
}

function describePiece(piece) {
  return (piece.color === 'w' ? '白' : '黑') + pieceNames[piece.type];
}

function renderBoard() {
  const inCheck = position.inCheck();
  for (const [square, { button, pieceNode, cargo }] of squares) {
    const piece = position.get(square);
    const checked = inCheck && piece?.type === 'k' && piece.color === position.turn();
    const target = !played && square === puzzle.target;
    const description = [square, piece ? describePiece(piece) : '空格'];
    if (target) description.push('送貨目標');
    if (checked) description.push('被將軍');
    button.setAttribute('aria-label', description.join('，'));
    button.setAttribute('aria-pressed', String(square === selected));
    button.tabIndex = square === cursor ? 0 : -1;
    button.classList.toggle('is-selected', square === selected);
    button.classList.toggle('is-checked', checked);
    button.classList.toggle('is-hinted', hintVisible && puzzle.hint.squares.includes(square));
    button.classList.toggle('is-mistake', square === mistake);
    button.classList.toggle('is-played', Boolean(played && [played.from, played.to].includes(square)));
    pieceNode.dataset.color = piece?.color ?? '';
    pieceNode.textContent = piece ? pieceSymbols[piece.type] : '';
    cargo.hidden = !target;
  }
}

function renderProgress() {
  byId('progress-text').textContent = `${completed.size} / ${puzzles.length}`;
  const progressBar = byId('progress-bar');
  progressBar.setAttribute('aria-valuemax', String(puzzles.length));
  progressBar.setAttribute('aria-valuenow', String(completed.size));
  progressBar.replaceChildren(...puzzles.map((item) => span(completed.has(item.id) ? 'segment filled' : 'segment')));

  for (const category of categories) {
    const items = puzzles.filter((item) => item.category === category.id);
    const { button, count } = categoryButtons.get(category.id);
    count.textContent = `${items.filter((item) => completed.has(item.id)).length}/${items.length}`;
    button.setAttribute('aria-pressed', String(category.id === puzzle.category));
  }

  for (const item of puzzles) {
    const { button, done } = puzzleButtons.get(item.id);
    button.hidden = item.category !== puzzle.category;
    button.setAttribute('aria-current', String(item.id === puzzle.id));
    button.setAttribute('aria-label', `題目 ${item.id} ${item.title}${completed.has(item.id) ? '，已通關' : ''}`);
    done.hidden = !completed.has(item.id);
  }
}

function report(state, heading, message) {
  feedback.dataset.state = state;
  byId('feedback-title').textContent = heading;
  byId('feedback-text').textContent = message;
}

function openPuzzle(item, focusTitle = false) {
  puzzle = item;
  position = startPuzzle(puzzle);
  selected = null;
  cursor = 'a1';
  mistake = null;
  hintVisible = false;
  played = null;

  byId('game').dataset.category = puzzle.category;
  title.textContent = puzzle.title;
  byId('objective').textContent = puzzle.objective;
  hintButton.disabled = false;
  nextButton.hidden = true;
  report('ready', '輪到白方', '點白棋，再點要走到的格子。');
  if (location.hash !== '#' + puzzle.id) history.replaceState(null, '', '#' + puzzle.id);
  renderBoard();
  renderProgress();
  if (focusTitle) title.focus({ preventScroll: true });
}

function selectSquare(square) {
  cursor = square;
  if (played) {
    renderBoard();
    return;
  }
  const piece = position.get(square);
  if (piece?.color === position.turn()) {
    selected = square;
    mistake = null;
    report('ready', '已選' + describePiece(piece), '點出棋子要走到的格子。');
  } else if (selected) {
    const result = tryMove(position, puzzle, selected, square);
    if (result.state === 'success') {
      played = { from: selected, to: square };
      selected = null;
      mistake = null;
      hintVisible = false;
      completed.add(puzzle.id);
      rememberProgress();
      renderProgress();
      hintButton.disabled = true;
      nextButton.hidden = completed.size === puzzles.length;
    } else {
      mistake = square;
    }
    const heading = nextButton.hidden && result.state === 'success' ? '全部通關' : result.title;
    report(result.state, heading, result.text);
  } else {
    report('ready', '先選一枚白棋', '再點這枚棋要走到的格子。');
  }
  renderBoard();
}

function currentLinkPuzzle() {
  return puzzles.find((item) => '#' + item.id === location.hash.toUpperCase()) ?? puzzles[0];
}

createButtons();
createBoard();
openPuzzle(currentLinkPuzzle());

hintButton.addEventListener('click', () => {
  hintVisible = true;
  mistake = null;
  report('hint', '提示', puzzle.hint.text);
  renderBoard();
});

byId('retry').addEventListener('click', () => openPuzzle(puzzle));
nextButton.addEventListener('click', () => {
  const index = puzzles.indexOf(puzzle);
  const order = [...puzzles.slice(index + 1), ...puzzles.slice(0, index)];
  const next = order.find((item) => !completed.has(item.id));
  if (next) openPuzzle(next, true);
});
window.addEventListener('hashchange', () => openPuzzle(currentLinkPuzzle()));

import { exercises, lessons } from './course.js?v=course-4';
import { markTargets, matchOutcome, movesTo, startPuzzle, tryMove } from './rules.js?v=course-4';

const byId = (id) => document.getElementById(id);
const board = byId('board');
const puzzleList = byId('puzzles');
const lessonPicker = byId('lesson-select');
const exerciseTitle = byId('puzzle-title');
const lessonButtons = new Map();
const puzzleButtons = new Map();
const squares = new Map();
const exerciseById = new Map(exercises.map((item) => [item.id, item]));
const lessonByExercise = new Map(lessons.flatMap((lesson) => lesson.exercises.map((id) => [id, lesson])));
const order = lessons.flatMap((lesson) => lesson.exercises);

const files = 'abcdefgh';
const ranks = '87654321';
const pieceNames = { k: '王', q: '皇后', r: '車', b: '主教', n: '馬', p: '兵' };
const pieceSymbols = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟︎' };
const progressKey = 'chess-explorers:completed:v1';
const completed = readProgress();

let exercise;
let lesson;
let state;
let matchSession;

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey) ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => exerciseById.has(id)) : []);
  } catch {
    return new Set();
  }
}

function completeExercise() {
  completed.add(exercise.id);
  try {
    localStorage.setItem(progressKey, JSON.stringify([...completed]));
  } catch {
    // The current session works even if browser storage is unavailable.
  }
  renderProgress();
}

function node(tag, className, text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function button(className, label, action) {
  const element = node('button', className, label);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}

function createNavigation() {
  for (const item of lessons) {
    const count = node('span', 'lesson-count');
    const label = node('span', 'lesson-name', item.title);
    const choice = button('lesson-link', '', () => openLesson(item.number));
    choice.dataset.lesson = item.number;
    choice.append(node('span', 'lesson-index', String(item.number)), label, count);
    byId('lessons').append(choice);
    lessonButtons.set(item.number, { choice, count });

    const option = node('option', '', `第 ${item.number} 堂　${item.title}`);
    option.value = item.number;
    lessonPicker.append(option);
  }
  lessonPicker.addEventListener('change', () => openLesson(Number(lessonPicker.value)));

  for (const item of exercises) {
    const done = node('span', 'puzzle-done', '✓');
    done.setAttribute('aria-hidden', 'true');
    const choice = button('puzzle-choice', '', () => {
      if (exercise.id !== item.id) openExercise(item.id);
    });
    choice.dataset.puzzle = item.id;
    choice.append(node('span', 'puzzle-number', item.id), done);
    puzzleList.append(choice);
    puzzleButtons.set(item.id, { choice, done });
  }
}

function createBoard() {
  for (const file of files) byId('files').append(node('span', 'coordinate', file));
  for (const rank of ranks) byId('ranks').append(node('span', 'coordinate', rank));

  for (const [row, rank] of [...ranks].entries()) {
    for (const [column, file] of [...files].entries()) {
      const square = file + rank;
      const choice = button('square', '', () => selectSquare(square));
      choice.dataset.square = square;
      choice.dataset.tone = (row + column) % 2 === 0 ? 'light' : 'dark';
      const pieceNode = node('span', 'piece');
      const targetNode = node('span', 'cargo');
      const markNode = node('span', 'square-mark', '✓');
      for (const item of [pieceNode, targetNode, markNode]) item.setAttribute('aria-hidden', 'true');
      choice.append(pieceNode, targetNode, markNode);
      board.append(choice);
      squares.set(square, { choice, pieceNode, targetNode, markNode });
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
    state.cursor = files[fileIndex] + rankNumber;
    renderBoard();
    squares.get(state.cursor).choice.focus({ preventScroll: true });
  });
}

function describePiece(piece) {
  return (piece.color === 'w' ? '白' : '黑') + pieceNames[piece.type];
}

function currentStage() {
  return exercise.line?.[state.step] ?? exercise;
}

function makeSession(item) {
  const position = startPuzzle(item);
  return {
    position, cursor: 'a1', selected: null, mistake: null, played: null, pending: null,
    solved: false, hint: false, step: 0, reviewIndex: null, reviewPosition: null,
    targets: item.mark ? markTargets(position, item) : null, marks: new Set(),
    records: item.match ? [{ fen: position.fen() }] : null,
    outcome: null,
  };
}

function renderBoard() {
  const position = state.reviewPosition ?? state.position;
  const played = state.reviewIndex === null ? state.played : state.records[state.reviewIndex].move;
  const inCheck = position.inCheck() && (!exercise.choice || state.hint || state.solved);
  const hints = state.hint ? currentStage().hint.squares : [];
  for (const [square, { choice, pieceNode, targetNode, markNode }] of squares) {
    const piece = position.get(square);
    const checked = inCheck && piece?.type === 'k' && piece.color === position.turn();
    const target = !state.solved && square === exercise.target;
    const marked = state.marks.has(square);
    const description = [square, piece ? describePiece(piece) : '空格'];
    if (target) description.push('指定落點');
    if (checked) description.push('被將軍');
    if (marked) description.push('已找到');
    choice.setAttribute('aria-label', description.join('，'));
    choice.setAttribute('aria-pressed', String(square === state.selected || marked));
    choice.tabIndex = square === state.cursor ? 0 : -1;
    choice.classList.toggle('is-selected', square === state.selected);
    choice.classList.toggle('is-checked', checked);
    choice.classList.toggle('is-hinted', hints.includes(square));
    choice.classList.toggle('is-mistake', square === state.mistake);
    choice.classList.toggle('is-played', Boolean(played && (played.from === square || played.to === square)));
    choice.classList.toggle('is-marked', marked);
    pieceNode.dataset.color = piece?.color ?? '';
    pieceNode.textContent = piece ? pieceSymbols[piece.type] : '';
    targetNode.hidden = !target;
    markNode.hidden = !marked;
  }
}

function renderProgress() {
  byId('progress-text').textContent = `${completed.size} / ${exercises.length}`;
  const bar = byId('progress-bar');
  bar.setAttribute('aria-valuemax', String(exercises.length));
  bar.setAttribute('aria-valuenow', String(completed.size));
  byId('progress-fill').style.width = `${completed.size / exercises.length * 100}%`;

  for (const item of lessons) {
    const { choice, count } = lessonButtons.get(item.number);
    const done = item.exercises.filter((id) => completed.has(id)).length;
    count.textContent = `${done}/${item.exercises.length}`;
    choice.setAttribute('aria-current', item.number === lesson.number ? 'step' : 'false');
  }

  for (const item of exercises) {
    const { choice, done } = puzzleButtons.get(item.id);
    choice.hidden = !lesson.exercises.includes(item.id);
    choice.setAttribute('aria-current', String(item.id === exercise.id));
    choice.setAttribute('aria-label', `題目 ${item.id} ${item.title}${completed.has(item.id) ? '，已通關' : ''}`);
    done.hidden = !completed.has(item.id);
  }
}

function report(kind, heading, message) {
  byId('feedback').dataset.state = kind;
  byId('feedback-title').textContent = heading;
  byId('feedback-text').textContent = message;
}

function reportTurn() {
  if (state.outcome) {
    report('success', state.outcome.title, state.outcome.text);
    return;
  }
  const white = state.position.turn() === 'w';
  const side = white ? '白方' : '黑方';
  const title = state.position.inCheck() ? side + '被將軍' : '輪到' + side;
  report('ready', title, white ? '點白棋，再點要走到的格子。' : '點黑棋，再點要走到的格子。');
}

function renderControls() {
  const isReview = state.reviewIndex !== null;
  byId('hint').hidden = exercise.match === true;
  byId('hint').disabled = state.solved;
  byId('retry').textContent = exercise.match ? '重開這局' : '重試';
  byId('retry').hidden = isReview;
  byId('review').hidden = !exercise.match || isReview;
  byId('review').disabled = !exercise.match || state.records.length < 3 || Boolean(state.pending);
  byId('review-actions').hidden = !isReview;
  byId('earlier').disabled = !isReview || state.reviewIndex === 0;
  byId('later').disabled = !isReview || state.reviewIndex === state.records.length - 1;

  const nextId = order[order.indexOf(exercise.id) + 1];
  byId('next').hidden = !state.solved || !nextId;
  byId('next').textContent = lesson.exercises.includes(nextId) ? '下一題' : '下一堂';
  const nextActivity = byId('next-activity');
  nextActivity.hidden = !lesson.nextActivity;
  nextActivity.textContent = lesson.nextActivity?.label ?? '';

  for (const choice of byId('choices').children) choice.disabled = state.solved;
}

function openExercise(id, { focusTitle = false, reset = false } = {}) {
  const previousLesson = lesson;
  exercise = exerciseById.get(id);
  lesson = lessonByExercise.get(id);
  state = (exercise.match && matchSession && !reset) ? matchSession : makeSession(exercise);
  if (exercise.match) matchSession = state;

  if (previousLesson !== lesson) byId('lesson-notes').open = false;
  lessonPicker.value = lesson.number;
  byId('game').dataset.lesson = lesson.number;
  byId('lesson-topic').textContent = `第 ${lesson.number} 堂　${lesson.topic}`;
  byId('lesson-title').textContent = lesson.title;
  byId('lesson-intro').textContent = lesson.intro;
  byId('activity').textContent = lesson.activity;
  exerciseTitle.textContent = exercise.title;
  byId('objective').textContent = currentStage().objective ?? exercise.objective;

  const choices = byId('choices');
  choices.hidden = !exercise.choice;
  choices.replaceChildren(...(exercise.choice?.options ?? []).map(({ value, label }) =>
    button('action', label, () => answerChoice(value))
  ));
  byId('promotions').hidden = true;
  state.pending = null;

  if (exercise.mark) {
    report('ready', `找到 ${state.marks.size} / ${state.targets.size} 格`, '直接點棋盤上的格子。');
  } else if (exercise.choice) {
    report('ready', '這個局面怎麼判斷', '觀察棋盤，再選一個答案。');
  } else if (state.reviewIndex !== null) {
    showReview(state.reviewIndex);
  } else {
    reportTurn();
  }
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  renderBoard();
  renderProgress();
  renderControls();
  if (focusTitle) exerciseTitle.focus({ preventScroll: true });
}

function openLesson(number) {
  if (lesson?.number === number) return;
  const selectedLesson = lessons.find((item) => item.number === number);
  if (!selectedLesson) return;
  const id = selectedLesson.exercises.find((item) => !completed.has(item)) ?? selectedLesson.exercises[0];
  openExercise(id);
}

function finish(text) {
  state.solved = true;
  state.hint = false;
  state.mistake = null;
  state.selected = null;
  completeExercise();
  report('success', completed.size === exercises.length ? '全部通關' : '通關成功', text);
  renderControls();
}

function answerChoice(value) {
  if (state.solved) return;
  if (value === exercise.choice.correct) finish(exercise.success);
  else report('incomplete', '再看一次棋盤', exercise.incomplete);
  renderBoard();
}

function findSquare(square) {
  if (state.marks.has(square)) return;
  if (state.targets.has(square)) {
    state.marks.add(square);
    state.mistake = null;
    if (state.marks.size === state.targets.size) finish(exercise.success);
    else report('ready', `找到 ${state.marks.size} / ${state.targets.size} 格`, '再找下一格。');
  } else {
    state.mistake = square;
    report('incomplete', '再看這個格子', exercise.incomplete);
  }
}

function selectSquare(square) {
  state.cursor = square;
  if (state.solved || state.pending || state.outcome || state.reviewIndex !== null || exercise.choice) {
    renderBoard();
    return;
  }
  if (exercise.mark) {
    findSquare(square);
    renderBoard();
    return;
  }
  const piece = state.position.get(square);
  const sameSide = piece?.color === state.position.turn();
  const feedbackKey = state.selected + square;
  if (state.selected && (!sameSide || currentStage().feedback?.[feedbackKey])) {
    chooseMove(state.selected, square);
  } else if (sameSide) {
    state.selected = square;
    state.mistake = null;
    report('ready', '已選' + describePiece(piece), '點出棋子要走到的格子。');
  } else {
    report('ready', '先選一枚輪到的棋子', '再點它要走到的格子。');
  }
  renderBoard();
}

function chooseMove(from, to) {
  const candidates = movesTo(state.position, from, to);
  if (!candidates.some((move) => move.promotion)) {
    playMove(from, to);
    return;
  }
  state.pending = { from, to };
  const menu = byId('promotions');
  const buttons = ['q', 'r', 'b', 'n'].map((piece) => button('action', pieceNames[piece], () => {
    const pending = state.pending;
    state.pending = null;
    menu.hidden = true;
    playMove(pending.from, pending.to, piece);
    squares.get(pending.to).choice.focus({ preventScroll: true });
  }));
  buttons.push(button('action', '取消', () => {
    state.pending = null;
    menu.hidden = true;
    reportTurn();
    renderControls();
    squares.get(state.cursor).choice.focus({ preventScroll: true });
  }));
  menu.replaceChildren(...buttons);
  menu.hidden = false;
  report('hint', '選擇升變', '兵到達底排，選一枚棋子替換它。');
  renderControls();
  buttons[0].focus({ preventScroll: true });
}

function playMove(from, to, promotion) {
  if (exercise.match) {
    playMatchMove(from, to, promotion);
  } else {
    const stage = currentStage();
    const result = tryMove(state.position, stage, from, to, promotion);
    if (result.state === 'success' && stage.reply) {
      state.position.move(stage.reply);
      state.played = stage.reply;
      state.step += 1;
      state.selected = null;
      state.mistake = null;
      state.hint = false;
      byId('objective').textContent = currentStage().objective;
      report('hint', '接著走第二步', result.text);
    } else if (result.state === 'success') {
      state.played = { from, to };
      finish(result.text);
    } else {
      state.mistake = to;
      report(result.state, result.title, result.text);
    }
  }
  renderBoard();
}

function playMatchMove(from, to, promotion) {
  const move = movesTo(state.position, from, to).find((candidate) => candidate.promotion === promotion);
  if (!move) {
    state.mistake = to;
    report('illegal', '這一步走不了', '檢查棋子的走法、路上的棋子和王的安全。');
    return;
  }
  state.position.move(move);
  state.played = move;
  state.selected = null;
  state.mistake = null;
  state.records.push({ fen: state.position.fen(), move });
  state.outcome = matchOutcome(state.position, state.records);
  reportTurn();
  renderControls();
}

function showReview(index) {
  const record = state.records[index];
  if (!record) return;
  state.reviewIndex = index;
  state.reviewPosition = startPuzzle(record);
  state.selected = null;
  state.mistake = null;
  const move = record.move;
  const caption = move
    ? `${describePiece({ color: move.color, type: move.piece })}從 ${move.from} 走到 ${move.to}。`
    : '這是這盤棋的起始位置。';
  report('hint', `復盤 ${index} / ${state.records.length - 1} 手`, caption);
  renderBoard();
  renderControls();
}

function hashExercise() {
  const raw = location.hash.slice(1);
  const id = raw.toUpperCase();
  if (exerciseById.has(id)) return id;
  const lessonNumber = /^lesson-(\d+)$/.exec(raw)?.[1];
  return lessons.find((item) => item.number === Number(lessonNumber))?.exercises[0] ?? order[0];
}

createNavigation();
createBoard();
openExercise(hashExercise());

byId('hint').addEventListener('click', () => {
  state.hint = true;
  state.mistake = null;
  report('hint', '提示', currentStage().hint.text);
  renderBoard();
});
byId('retry').addEventListener('click', () => openExercise(exercise.id, { reset: true }));
byId('next').addEventListener('click', () => {
  const next = order[order.indexOf(exercise.id) + 1];
  if (next) openExercise(next, { focusTitle: true });
});
byId('next-activity').addEventListener('click', () => openExercise(lesson.nextActivity.id, { focusTitle: true }));

byId('review').addEventListener('click', () => {
  completeExercise();
  showReview(state.records.length - 2);
  byId('resume').focus({ preventScroll: true });
});
byId('earlier').addEventListener('click', () => showReview(state.reviewIndex - 1));
byId('later').addEventListener('click', () => showReview(state.reviewIndex + 1));
byId('resume').addEventListener('click', () => {
  state.reviewIndex = null;
  state.reviewPosition = null;
  reportTurn();
  renderBoard();
  renderControls();
  byId('review').focus({ preventScroll: true });
});
window.addEventListener('hashchange', () => openExercise(hashExercise()));

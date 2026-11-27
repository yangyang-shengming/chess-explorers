import { createGameDatabase, DATABASE_NAME } from './game-db.js?v=class-elo-1';
import { MILESTONES } from './game-log.js?v=class-elo-1';
import { playerKey, rateGames, RESULT_LABELS, validatePair } from './elo.js?v=class-elo-1';

const byId = (id) => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' });

function localDateValue(value = new Date()) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function node(tag, className, text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function action(label, handler) {
  const button = node('button', 'text-action', label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function scoreText(player) {
  if (!player?.games) return '未定級';
  return `${player.rating} 分${player.games < 5 ? '（暫定）' : ''}`;
}

function deltaText(value) {
  return value > 0 ? '+' + value : String(value);
}

function message(id, text = '', error = false) {
  const status = byId(id);
  if (status.textContent !== text) status.textContent = text;
  status.dataset.kind = error ? 'error' : 'info';
}

function errorMessage(error) {
  if (error instanceof DOMException) return '這個瀏覽器暫時無法使用對局資料庫。';
  return error.message;
}

export function bindElo({ startMatch, startPractice, finishMatch, retrySave, openReview }) {
  const ledger = createGameDatabase();
  const updates = typeof BroadcastChannel === 'function' ? new BroadcastChannel(DATABASE_NAME) : null;
  const gameForm = byId('elo-game-form');
  const manualTitle = byId('elo-manual-title');
  const playerOptions = byId('elo-player-options');
  const startForm = byId('elo-start-form');
  const finishForm = byId('elo-finish-form');
  const playerForm = byId('elo-player-form');
  const search = byId('elo-game-search');
  const milestonePlayer = byId('elo-milestone-player');
  let snapshot = rateGames([], []);
  let editing = null;
  let current = null;
  let refreshVersion = 0;

  async function refresh() {
    const version = ++refreshVersion;
    try {
      const { roster, games } = await ledger.read();
      if (version !== refreshVersion) return;
      snapshot = rateGames(roster, games);
    } catch (error) {
      if (version === refreshVersion) message('elo-history-status', errorMessage(error), true);
      return;
    }
    renderRoster();
    renderHistory();
    renderMatch();
  }

  async function changesSaved() {
    updates?.postMessage('changed');
    await refresh();
  }

  function focusSection(id) {
    const heading = byId(id);
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start' });
  }

  function renderRoster() {
    const players = [...snapshot.players.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
    playerOptions.replaceChildren(...players.map(({ name }) => {
      const option = document.createElement('option');
      option.value = name;
      return option;
    }));
    const rows = players.map((player) => {
      const row = node('li', 'elo-player-row');
      row.dataset.player = playerKey(player.name);
      const detail = node('div', 'elo-player-detail');
      detail.append(node('strong', '', player.name), node('small', '', `${player.games} 局`));
      row.append(detail, node('span', 'elo-score', scoreText(player)));
      return row;
    });
    byId('elo-roster').replaceChildren(...(rows.length ? rows : [node('li', 'elo-help', '可先新增選手，或在登記對局時輸入代號。')]));
    const previousPlayer = milestonePlayer.value;
    milestonePlayer.replaceChildren(...players.map((player) => {
      const option = node('option', '', player.name);
      option.value = playerKey(player.name);
      return option;
    }));
    if (snapshot.players.has(previousPlayer)) milestonePlayer.value = previousPlayer;
    milestonePlayer.disabled = !players.length;
    renderMilestones();
  }

  function renderHistory() {
    const query = search.value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-TW');
    const games = snapshot.entries.filter((game) =>
      !query || playerKey(game.white).includes(query) || playerKey(game.black).includes(query)
    );
    const rows = games.reverse().map((entry) => {
      const row = node('li', 'elo-record');
      row.dataset.gameId = entry.id;
      const info = node('div', 'elo-record-info');
      const time = node('time', '', dateFormat.format(new Date(entry.playedAt)));
      time.dateTime = entry.playedAt;
      const meta = node('div', 'elo-record-meta');
      const source = !entry.rated ? '練習局' : entry.source === 'board' ? '站上對弈' : '手動登記';
      meta.append(time, node('span', '', source));
      if (entry.plies) meta.append(node('span', '', entry.plies + ' 手'));
      const result = node('strong', 'elo-record-result', `白方 ${entry.white}　黑方 ${entry.black}　${RESULT_LABELS[entry.result]}`);
      info.append(meta, result);
      if (entry.rated) {
        info.append(node('p', '', `${entry.white} ${entry.whiteAfter}（${deltaText(entry.whiteDelta)}）　${entry.black} ${entry.blackAfter}（${deltaText(-entry.whiteDelta)}）`));
      }
      if (entry.note) info.append(node('p', 'elo-note', entry.note));
      const actions = node('div', 'elo-record-actions');
      if (entry.plies) actions.append(action('復盤', () => reviewEntry(entry, 0, 'elo-history-status')));
      if (entry.rated) actions.append(action('編輯', () => openManual(entry)));
      actions.append(action('刪除', () => removeEntry(entry)));
      row.append(info, actions);
      return row;
    });
    const empty = query ? '找不到符合這個代號的對局。' : '還沒有已登記的對局。';
    byId('elo-games').replaceChildren(...(rows.length ? rows : [node('li', 'elo-help', empty)]));
  }

  function renderMilestones() {
    const player = snapshot.players.get(milestonePlayer.value);
    if (!player) {
      byId('elo-milestones').replaceChildren(node('li', 'elo-help', '建立選手名單後，可在這裡查看成就。'));
      return;
    }
    const items = MILESTONES.map(({ id, title, hint }) => {
      const unlocked = player.milestones.get(id);
      const item = node('li', 'elo-milestone');
      item.dataset.milestone = id;
      item.dataset.unlocked = Boolean(unlocked);
      const status = unlocked ? dateFormat.format(new Date(unlocked.game.playedAt)) : '未解鎖';
      item.append(node('h5', '', title), node('p', 'elo-help', hint), node('small', '', status));
      if (unlocked) item.append(action('回看棋譜', () => reviewEntry(unlocked.game, unlocked.ply, 'elo-milestone-status')));
      return item;
    });
    byId('elo-milestones').replaceChildren(...items);
  }

  function reviewEntry(entry, ply, statusId) {
    try {
      openReview(entry, ply, document.activeElement);
      message(statusId);
    } catch (error) {
      message(statusId, errorMessage(error), true);
    }
  }

  function renderMatch() {
    if (!current?.visible) return;
    const { match, ended, reviewing, archived, promotionPending, hasMoves } = current;
    const pair = match.pair;
    const finishDetails = byId('elo-finish');
    byId('elo-setup').hidden = reviewing;
    byId('elo-practice').hidden = !pair;
    byId('elo-pair').hidden = !pair || archived;
    byId('elo-board-status').hidden = archived;
    finishDetails.hidden = !hasMoves || ended || reviewing || promotionPending;
    byId('elo-retry-save').hidden = !match.saveError || reviewing;
    if (ended && !archived) {
      const status = match.saveError || match.savedMessage || (match.saving ? '正在儲存本局。' : '');
      message('elo-board-status', status, Boolean(match.saveError));
    }
    if (!pair) return;
    const entry = snapshot.entries.find((game) => game.id === match.id);
    for (const [color, name] of Object.entries(pair)) {
      const player = snapshot.players.get(playerKey(name));
      byId(`elo-${color}-name`).textContent = player?.name ?? name;
      byId(`elo-${color}-score`).textContent = scoreText(player);
      const delta = byId(`elo-${color}-delta`);
      delta.hidden = !entry;
      delta.textContent = entry ? '本局 ' + deltaText(color === 'white' ? entry.whiteDelta : -entry.whiteDelta) : '';
    }
  }

  function clearManual() {
    editing = null;
    gameForm.reset();
    gameForm.elements.playedAt.value = localDateValue();
    manualTitle.textContent = '登記平時對局';
    byId('elo-game-save').textContent = '儲存對局';
    byId('elo-cancel-edit').hidden = true;
  }

  function openManual(entry) {
    if (entry) {
      editing = entry;
      gameForm.elements.white.value = entry.white;
      gameForm.elements.black.value = entry.black;
      gameForm.elements.playedAt.value = localDateValue(entry.playedAt);
      gameForm.elements.result.value = entry.result;
      gameForm.elements.note.value = entry.note;
      gameForm.elements.pgn.value = entry.pgn;
      manualTitle.textContent = '編輯對局';
      byId('elo-game-save').textContent = '儲存修改';
      byId('elo-cancel-edit').hidden = false;
    }
    message('elo-game-status');
    focusSection('elo-manual-title');
  }

  async function removeEntry(entry) {
    if (!window.confirm(`要刪除 ${entry.white} 和 ${entry.black} 的這筆對局嗎？分數會重新計算。`)) return;
    try {
      await ledger.remove(entry.id);
      if (editing?.id === entry.id) clearManual();
      await changesSaved();
      message('elo-history-status', '已刪除這筆對局並重算分數。');
    } catch (error) {
      message('elo-history-status', errorMessage(error), true);
    }
  }

  function canonicalPair(white, black) {
    const pair = validatePair(white, black);
    return {
      white: snapshot.players.get(playerKey(pair.white))?.name ?? pair.white,
      black: snapshot.players.get(playerKey(pair.black))?.name ?? pair.black,
    };
  }

  startForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const data = new FormData(startForm);
      const pair = canonicalPair(data.get('white'), data.get('black'));
      startMatch(pair);
      byId('elo-setup').open = false;
      message('elo-board-status', '計分局已開始。');
      byId('puzzle-title').focus({ preventScroll: true });
    } catch (error) {
      message('elo-board-status', errorMessage(error), true);
    }
  });
  byId('elo-practice').addEventListener('click', () => {
    startPractice();
    byId('elo-setup').open = false;
    message('elo-board-status', '已開啟練習局。');
    byId('puzzle-title').focus({ preventScroll: true });
  });
  byId('elo-jump').addEventListener('click', () => openManual());
  byId('elo-open-history').addEventListener('click', () => focusSection('elo-history-title'));
  byId('elo-open-milestones').addEventListener('click', () => focusSection('elo-milestones-title'));
  search.addEventListener('input', renderHistory);
  milestonePlayer.addEventListener('change', renderMilestones);
  finishForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = new FormData(finishForm).get('result');
    if (!Object.hasOwn(RESULT_LABELS, result)) return;
    finishMatch(result);
    finishForm.reset();
    byId('elo-finish').open = false;
    byId('review').focus({ preventScroll: true });
  });
  byId('elo-retry-save').addEventListener('click', retrySave);

  playerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = playerForm.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    try {
      const name = await ledger.addPlayer(new FormData(playerForm).get('player'));
      playerForm.reset();
      await changesSaved();
      message('elo-player-status', `名單已更新。選手 ${name}。`);
    } catch (error) {
      message('elo-player-status', errorMessage(error), true);
    } finally {
      submit.disabled = false;
    }
  });
  gameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = byId('elo-game-save');
    if (submit.disabled) return;
    submit.disabled = true;
    const entry = editing;
    try {
      const data = new FormData(gameForm);
      const pair = canonicalPair(data.get('white'), data.get('black'));
      const enteredDate = data.get('playedAt');
      const playedAt = entry && localDateValue(entry.playedAt) === enteredDate ? entry.playedAt : enteredDate;
      await ledger.save({
        id: entry?.id ?? crypto.randomUUID(),
        ...pair,
        playedAt,
        createdAt: entry?.createdAt ?? new Date().toISOString(),
        result: data.get('result'),
        note: data.get('note'),
        pgn: data.get('pgn'),
        source: entry?.source ?? 'manual',
      }, { edit: Boolean(entry) });
      clearManual();
      await changesSaved();
      message('elo-game-status', '對局已儲存，已更新班內分數。');
    } catch (error) {
      message('elo-game-status', errorMessage(error), true);
    } finally {
      submit.disabled = false;
    }
  });
  byId('elo-cancel-edit').addEventListener('click', () => {
    clearManual();
    message('elo-game-status');
  });
  updates?.addEventListener('message', () => {
    if (current?.visible) refresh();
  });

  clearManual();

  return {
    show(match) {
      const opened = match.visible && !current?.visible;
      current = match;
      byId('elo-play').hidden = !match.visible;
      byId('elo-panel').hidden = !match.visible;
      if (!match.visible) {
        byId('elo-finish').hidden = true;
        byId('elo-retry-save').hidden = true;
      } else if (opened) {
        refresh();
      } else {
        renderMatch();
      }
    },
    async record(game) {
      await ledger.save(game);
      await changesSaved();
      if (!game.rated) return '練習局已存入對局庫。';
      const unlocked = [];
      for (const name of [game.white, game.black]) {
        const player = snapshot.players.get(playerKey(name));
        const titles = MILESTONES.filter(({ id }) => player?.milestones.get(id)?.game.id === game.id)
          .map(({ title }) => title);
        if (titles.length) unlocked.push(`${name}解鎖「${titles.join('、')}」。`);
      }
      return '本局已記入班內 Elo。' + unlocked.join('');
    },
    clearBoardStatus() {
      message('elo-board-status');
      finishForm.reset();
      byId('elo-finish').open = false;
    },
  };
}

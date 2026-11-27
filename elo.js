import { readGameLog } from './game-log.js?v=class-elo-1';

export const INITIAL_ELO = 200;
export const ELO_K = 24;
export const RESULT_LABELS = { white: '白勝', draw: '和棋', black: '黑勝' };
const WHITE_SCORES = { white: 1, draw: 0.5, black: 0 };

export function playerName(value) {
  const name = typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 36) throw new Error('請輸入 1 到 36 個字的選手代號。');
  return name;
}

export function playerKey(name) {
  return playerName(name).toLocaleLowerCase('zh-TW');
}

export function validatePair(white, black) {
  const pair = { white: playerName(white), black: playerName(black) };
  if (playerKey(pair.white) === playerKey(pair.black)) throw new Error('白方和黑方請選不同的選手。');
  return pair;
}

export function eloChange(whiteRating, blackRating, result) {
  if (!Object.hasOwn(WHITE_SCORES, result)) throw new Error('請選擇白勝、和棋或黑勝。');
  const expected = 1 / (1 + 10 ** ((blackRating - whiteRating) / 400));
  const change = ELO_K * (WHITE_SCORES[result] - expected);
  const magnitude = Math.round(Math.abs(change));
  return magnitude === 0 ? 0 : Math.sign(change) * magnitude;
}

export function createGame(input) {
  if (!input || typeof input.id !== 'string' || !/^[a-z\d-]{1,90}$/i.test(input.id)) {
    throw new Error('這筆對局的編號無法辨認。');
  }
  const rated = input.rated !== false;
  const pair = rated ? validatePair(input.white, input.black) : { white: '白棋', black: '黑棋' };
  if (!Object.hasOwn(WHITE_SCORES, input.result)) throw new Error('請選擇白勝、和棋或黑勝。');
  const date = new Date(input.playedAt);
  if (typeof input.playedAt !== 'string' || !Number.isFinite(date.getTime())) {
    throw new Error('請輸入對局的日期和時間。');
  }
  const created = new Date(input.createdAt ?? input.playedAt);
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  const pgn = typeof input.pgn === 'string' ? input.pgn.trim() : '';
  if (note.length > 240) throw new Error('備註請在 240 個字以內。');
  if (pgn.length > 64000) throw new Error('請貼上一局、不超過 64,000 字的 PGN。');
  const log = pgn ? readGameLog(pgn, input.result) : null;
  return {
    id: input.id,
    ...pair,
    rated,
    result: input.result,
    playedAt: date.toISOString(),
    createdAt: Number.isFinite(created.getTime()) ? created.toISOString() : date.toISOString(),
    source: input.source === 'board' ? 'board' : 'manual',
    note,
    pgn,
    plies: log ? log.records.length - 1 : 0,
    events: log?.events ?? {},
  };
}

export function rateGames(roster, games) {
  const players = new Map();
  const getPlayer = (name) => {
    const id = playerKey(name);
    if (!players.has(id)) {
      players.set(id, { name: playerName(name), rating: INITIAL_ELO, games: 0, milestones: new Map() });
    }
    return players.get(id);
  };
  for (const name of roster) getPlayer(name);
  const order = [...games].sort((a, b) =>
    a.playedAt.localeCompare(b.playedAt) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
  const entries = order.map((game) => {
    if (game.rated === false) return game;
    const white = getPlayer(game.white);
    const black = getPlayer(game.black);
    const whiteDelta = eloChange(white.rating, black.rating, game.result);
    white.rating += whiteDelta;
    black.rating -= whiteDelta;
    white.games++;
    black.games++;
    for (const [side, player] of [['white', white], ['black', black]]) {
      for (const [id, ply] of Object.entries(game.events?.[side] ?? {})) {
        if (!player.milestones.has(id)) player.milestones.set(id, { game, ply });
      }
    }
    return { ...game, whiteDelta, whiteAfter: white.rating, blackAfter: black.rating };
  });
  return { players, entries };
}

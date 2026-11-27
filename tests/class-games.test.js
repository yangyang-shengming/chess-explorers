import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, eloChange, rateGames } from '../elo.js';
import { readGameLog } from '../game-log.js';

const enPassant = '1. e4 a6 2. e5 d5 3. exd6 1-0';
const stalemate = '[SetUp "1"]\n[FEN "k7/8/1QK5/8/8/8/8/8 w - - 0 1"]\n\n1. Qc7 1/2-1/2';

function game(options = {}) {
  return createGame({
    id: 'one', white: '小白', black: '小黑', result: 'white', playedAt: '2026-11-27T10:00:00Z',
    ...options,
  });
}

test('選手無賽果時仍未定級，首場勝負以 200 分計算', () => {
  const { players, entries } = rateGames(['新選手'], [game()]);
  assert.equal(players.get('新選手').games, 0);
  assert.equal(players.get('小白').rating, 212);
  assert.equal(players.get('小黑').rating, 188);
  assert.equal(entries[0].whiteDelta, 12);
  assert.equal(eloChange(200, 200, 'draw'), 0);
  assert.equal(eloChange(188, 212, 'draw'), 1);
});

test('補登舊對局後，依實際對局順序重算雙方分數', () => {
  const later = game({ id: 'later', result: 'black' });
  const backdated = game({ id: 'earlier', playedAt: '2026-11-25T08:00:00Z' });
  const { entries, players } = rateGames([], [later, backdated]);
  assert.deepEqual(entries.map((entry) => entry.id), ['earlier', 'later']);
  assert.equal(players.get('小白').rating, 199);
  assert.equal(players.get('小黑').rating, 201);
  assert.equal(players.get('小白').games, 2);
});

test('練習局保留可復盤的棋譜，但沒有班內分數', () => {
  const practice = game({ rated: false, pgn: enPassant });
  const { entries, players } = rateGames([], [practice]);
  assert.equal(players.size, 0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].plies, 5);
  assert.equal(entries[0].whiteDelta, undefined);
});

test('棋譜可重建吃過路兵的局面，並標出達成的選手與走法', () => {
  const log = readGameLog(enPassant, 'white');
  assert.equal(log.records[5].move.san, 'exd6');
  assert.equal(log.records[5].move.isEnPassant(), true);
  assert.equal(log.events.white['en-passant'], 5);
  assert.equal(log.events.black['en-passant'], undefined);
});

test('有過多次吃過路兵時，里程碑引用時間最早的棋譜', () => {
  const later = game({ id: 'later', pgn: enPassant });
  const earlier = game({ id: 'earlier', pgn: enPassant, playedAt: '2026-11-25T08:00:00Z' });
  const { players } = rateGames([], [later, earlier]);
  const milestone = players.get('小白').milestones.get('en-passant');
  assert.equal(milestone.game.id, 'earlier');
  assert.equal(milestone.ply, 5);
  assert.equal(players.get('小黑').milestones.size, 0);
});

test('由實際走法辨認王車易位與兵升變', () => {
  const castle = readGameLog('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O', 'draw');
  assert.equal(castle.events.white.castle, 7);
  const promotion = '[SetUp "1"]\n[FEN "7k/P7/4K3/8/8/8/8/8 w - - 0 1"]\n\n1. a8=Q+ 1-0';
  assert.equal(readGameLog(promotion, 'white').events.white.promotion, 1);
});

test('逼和解鎖兩位選手，單填和棋賽果則沒有逼和成就', () => {
  const draw = game({ id: 'regular-draw', result: 'draw', playedAt: '2026-11-25T08:00:00Z' });
  const closed = game({ id: 'stalemate', result: 'draw', pgn: stalemate });
  const { players } = rateGames([], [draw, closed]);
  for (const player of players.values()) {
    assert.equal(player.milestones.get('stalemate').game.id, 'stalemate');
    assert.equal(player.milestones.get('stalemate').ply, 1);
    assert.equal(player.rating, 200);
  }
});

test('知道誰將死對手，並拒絕棋譜賽果或名字有衝突的紀錄', () => {
  const pgn = '1. f3 e5 2. g4 Qh4#';
  assert.equal(readGameLog(pgn, 'black').events.black.mate, 4);
  assert.throws(() => game({ pgn, result: 'white' }), /棋譜的結果/);
  assert.throws(() => game({ pgn: enPassant, result: 'black' }), /棋譜的結果/);
  assert.throws(() => game({ white: 'Ａ班', black: 'a班' }), /不同的選手/);
  assert.throws(() => game({ pgn: '1. Nc6' }), /棋譜無法讀取/);
});

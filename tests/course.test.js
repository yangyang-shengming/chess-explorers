import assert from 'node:assert/strict';
import test from 'node:test';
import { exercises, lessons } from '../course.js';
import { markTargets, matchOutcome, startPuzzle, tryMove } from '../rules.js';

const ids = exercises.map((item) => item.id);
const assigned = lessons.flatMap((item) => item.exercises);
const lookup = (id) => exercises.find((item) => item.id === id);

test('八堂課各題只列一次，延伸入口可開啟', () => {
  assert.deepEqual(lessons.map((item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...assigned].sort(), [...ids].sort());
  for (const lesson of lessons) {
    if (lesson.nextActivity) assert.ok(ids.includes(lesson.nextActivity.id));
  }
});

for (const item of exercises) {
  test(`${item.id} 起始棋局與任務有效`, () => {
    const position = startPuzzle(item);
    const side = position.turn();
    const otherSide = side === 'w' ? 'b' : 'w';
    const [opposingKing] = position.findPiece({ type: 'k', color: otherSide });
    assert.ok(opposingKing && !position.isAttacked(opposingKing, side));

    if (item.mark) {
      assert.ok(markTargets(position, item).size > 0);
    } else if (item.choice) {
      assert.equal(position.isCheckmate(), item.choice.correct === 'mate');
      assert.equal(position.isStalemate(), item.choice.correct === 'stalemate');
    } else if (item.anyLegal) {
      assert.ok(position.moves().length > 0);
    } else if (!item.match) {
      for (const stage of item.line ?? [item]) {
        const { from, to, promotion } = stage.solution;
        assert.equal(tryMove(position, stage, from, to, promotion).state, 'success');
        if (stage.reply) position.move(stage.reply);
      }
      if (['4A', '7A'].includes(item.id)) assert.ok(position.isCheckmate());
    }
  });
}

test('第 2 堂的馬從中央、角落和有同色棋的格子找落點', () => {
  for (const [id, expected] of [
    ['2B', ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5']],
    ['2C', ['b3', 'c2']],
    ['2I', ['c3', 'd2']],
  ]) {
    const item = lookup(id);
    assert.deepEqual([...markTargets(startPuzzle(item), item)].sort(), expected);
  }
  const capture = lookup('2E');
  const position = startPuzzle(capture);
  assert.equal(tryMove(position, capture, 'd4', 'f5').state, 'illegal');
  assert.equal(tryMove(position, capture, 'd4', 'f3').state, 'success');
  assert.deepEqual(position.get('f3'), { type: 'n', color: 'w' });
});

test('易位移兩枚棋，升變可重選，吃過路兵移除相鄰黑兵', () => {
  const castle = startPuzzle(lookup('5A'));
  tryMove(castle, lookup('5A'), 'e1', 'g1');
  assert.deepEqual(castle.get('g1'), { type: 'k', color: 'w' });
  assert.deepEqual(castle.get('f1'), { type: 'r', color: 'w' });

  const promotion = startPuzzle(lookup('5B'));
  const before = promotion.fen();
  assert.equal(tryMove(promotion, lookup('5B'), 'a7', 'a8', 'r').state, 'incomplete');
  assert.equal(promotion.fen(), before);
  tryMove(promotion, lookup('5B'), 'a7', 'a8', 'q');
  assert.deepEqual(promotion.get('a8'), { type: 'q', color: 'w' });

  const enPassant = startPuzzle(lookup('5C'));
  tryMove(enPassant, lookup('5C'), 'e5', 'd6');
  assert.deepEqual(enPassant.get('d6'), { type: 'p', color: 'w' });
  assert.equal(enPassant.get('d5'), undefined);
});

test('第 7 堂避開逼和的兩個選擇有不同結果', () => {
  const item = lookup('7B');
  const position = startPuzzle(item);
  position.move({ from: 'f4', to: 'f5' });
  assert.ok(position.isStalemate());
  position.undo();
  assert.equal(tryMove(position, item, 'f4', 'g4').state, 'success');
  assert.deepEqual(position.moves(), ['Kh7']);
});

test('雙人對弈允許輪流走棋，將死時顯示獲勝方', () => {
  const position = startPuzzle(lookup('8A'));
  const records = [{ fen: position.fen() }];
  for (const move of ['f3', 'e5', 'g4', 'Qh4#']) {
    position.move(move);
    records.push({ fen: position.fen() });
  }
  assert.equal(matchOutcome(position, records).title, '黑方將死獲勝');
});

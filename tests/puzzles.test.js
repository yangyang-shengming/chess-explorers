import assert from 'node:assert/strict';
import test from 'node:test';
import { categories, puzzles } from '../puzzles.js';
import { startPuzzle, tryMove } from '../rules.js';

test('題號不重複，每個任務都有題目', () => {
  assert.equal(new Set(puzzles.map((puzzle) => puzzle.id)).size, puzzles.length);
  for (const category of categories) {
    assert.ok(puzzles.some((puzzle) => puzzle.category === category.id));
  }
});

for (const puzzle of puzzles) {
  test(`${puzzle.id} ${puzzle.title}`, () => {
    const position = startPuzzle(puzzle);
    const { from, to } = puzzle.solution;
    assert.equal(position.turn(), 'w');
    assert.equal(position.inCheck(), puzzle.category === 'rescue');
    assert.equal(position.get(from).color, 'w');

    const result = tryMove(position, puzzle, from, to);
    assert.equal(result.state, 'success');
    assert.equal(position.get(to).color, 'w');
    assert.equal(position.get(from), undefined);
    if (puzzle.category === 'delivery') assert.equal(to, puzzle.target);
    if (puzzle.category === 'fork') {
      assert.equal(position.inCheck(), true);
      const blackRook = position.findPiece({ type: 'r', color: 'b' })[0];
      assert.ok(position.attackers(blackRook, 'w').includes(to));
    }
  });
}

test('被擋住的車不能越過棋子，局面可以直接再試', () => {
  const puzzle = puzzles.find((item) => item.id === '1B');
  const position = startPuzzle(puzzle);
  const initial = position.fen();
  const blocked = tryMove(position, puzzle, 'e1', 'e4');
  assert.equal(blocked.state, 'illegal');
  assert.match(blocked.text, /黑兵/);
  assert.equal(position.fen(), initial);
  assert.equal(tryMove(position, puzzle, 'b1', 'e4').state, 'success');
});

test('合法移王和仍在受將的走法會得到不同回饋', () => {
  const puzzle = puzzles.find((item) => item.id === '3A');
  const position = startPuzzle(puzzle);
  const initial = position.fen();
  assert.equal(tryMove(position, puzzle, 'e2', 'd2').state, 'incomplete');
  assert.equal(tryMove(position, puzzle, 'e2', 'e1').state, 'illegal');
  assert.equal(position.fen(), initial);
  assert.equal(tryMove(position, puzzle, 'c1', 'e3').state, 'success');
  assert.equal(startPuzzle(puzzle).fen(), initial);
});

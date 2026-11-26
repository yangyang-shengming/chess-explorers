import { Chess } from './vendor/chess.js';

export function startPuzzle(puzzle) {
  return new Chess(puzzle.fen);
}

// Keep the starting position on mistakes, including legal moves that miss the task.
export function tryMove(position, puzzle, from, to) {
  const move = position.moves({ square: from, verbose: true }).find((candidate) =>
    candidate.to === to && (!candidate.promotion || candidate.promotion === 'q')
  );
  const feedback = puzzle.feedback?.[from + to];

  if (!move) {
    return {
      state: 'illegal',
      title: '這一步走不了',
      text: feedback ?? '看看棋子的走法、路上有沒有擋住，或自己的王會不會受攻擊。',
    };
  }

  if (from !== puzzle.solution.from || to !== puzzle.solution.to) {
    return { state: 'incomplete', title: '再想一個走法', text: feedback ?? puzzle.incomplete };
  }

  position.move(move);
  return { state: 'success', title: '通關成功', text: puzzle.success };
}

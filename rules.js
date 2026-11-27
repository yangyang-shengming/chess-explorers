import { Chess } from './vendor/chess.js';

export function startPuzzle(puzzle) {
  return new Chess(puzzle.fen);
}

export function movesTo(position, from, to) {
  return position.moves({ square: from, verbose: true }).filter((move) => move.to === to);
}

export function markTargets(position, puzzle) {
  return new Set(puzzle.mark.squares ?? position.moves({ square: puzzle.mark.from, verbose: true })
    .map((move) => move.to));
}

// Keep the starting position on mistakes, including legal moves that miss the task.
export function tryMove(position, puzzle, from, to, promotion) {
  const move = movesTo(position, from, to).find((candidate) => candidate.promotion === promotion);
  const feedback = puzzle.feedback?.[from + to];

  if (!move) {
    return {
      state: 'illegal',
      title: '這一步走不了',
      text: feedback ?? '看看棋子的走法、路上有沒有擋住，或自己的王會不會受攻擊。',
    };
  }

  const goal = puzzle.solution;
  if (!puzzle.anyLegal && (from !== goal.from || to !== goal.to || promotion !== goal.promotion)) {
    return { state: 'incomplete', title: '再想一個走法', text: feedback ?? puzzle.incomplete };
  }

  position.move(move);
  return { state: 'success', title: '通關成功', text: puzzle.success };
}

export function matchOutcome(position, records) {
  if (position.isCheckmate()) {
    const winner = position.turn() === 'w' ? '黑方' : '白方';
    return { title: winner + '將死獲勝', text: '可以打開復盤，回看這局的一步棋。' };
  }
  if (position.isStalemate()) {
    return { title: '逼和', text: '輪到的一方沒有合法走法，王也沒有受將。' };
  }
  if (position.isInsufficientMaterial()) {
    return { title: '和棋', text: '場上的棋子不足以將死對方。' };
  }
  const fenFields = position.fen().split(' ');
  const key = fenFields.slice(0, 4).join(' ');
  const repeats = records.filter(({ fen }) => fen.split(' ').slice(0, 4).join(' ') === key).length;
  if (repeats >= 5 || Number(fenFields[4]) >= 150) {
    return { title: '和棋', text: repeats >= 5 ? '同一局面已出現五次。' : '雙方各走 75 手，期間沒有吃子或移動兵。' };
  }
  return null;
}

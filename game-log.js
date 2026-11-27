import { Chess } from './vendor/chess.js';
import { matchOutcome } from './rules.js?v=class-elo-1';

const PGN_RESULTS = { '1-0': 'white', '1/2-1/2': 'draw', '0-1': 'black' };

export const MILESTONES = [
  { id: 'castle', title: '第一次王車易位', hint: '在對局中完成一次王車易位。' },
  { id: 'en-passant', title: '第一次吃過路兵', hint: '用兵吃掉剛走兩格、停在旁邊的對手兵。' },
  { id: 'promotion', title: '第一次升變', hint: '把兵走到底排，換成另一枚棋子。' },
  { id: 'stalemate', title: '第一次逼和', hint: '棋局以逼和結束，兩位選手都解鎖。' },
  { id: 'mate', title: '第一次將死', hint: '將軍且讓對手無法解除，解鎖這項成就。' },
];

export function specialMove(move) {
  if (move.isEnPassant()) return 'en-passant';
  if (move.isKingsideCastle() || move.isQueensideCastle()) return 'castle';
  if (move.isPromotion()) return 'promotion';
  return null;
}

export function readGameLog(pgn, result) {
  const position = new Chess();
  try {
    position.loadPgn(pgn);
  } catch {
    throw new Error('棋譜無法讀取。請貼上一局完整的 PGN，並檢查走法。');
  }

  const moves = position.history({ verbose: true });
  if (!moves.length) throw new Error('請貼上至少有一步走法的 PGN。');
  const records = [{ fen: moves[0].before }, ...moves.map((move) => ({ fen: move.after, move }))];
  const outcome = matchOutcome(position, records);
  const declared = PGN_RESULTS[position.getHeaders().Result];
  if ((declared && declared !== result) || (outcome && outcome.result !== result)) {
    throw new Error('棋譜的結果和表單選擇不同，請核對白勝、和棋或黑勝。');
  }

  const events = { white: {}, black: {} };
  for (const [index, move] of moves.entries()) {
    const id = specialMove(move);
    const side = move.color === 'w' ? 'white' : 'black';
    if (id) events[side][id] ??= index + 1;
  }
  if (position.isStalemate()) {
    events.white.stalemate = moves.length;
    events.black.stalemate = moves.length;
  }
  if (position.isCheckmate()) events[result].mate = moves.length;
  return { records, events, outcome };
}

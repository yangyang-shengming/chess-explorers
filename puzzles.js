export const categories = [
  { id: 'delivery', name: '送貨', icon: '♜' },
  { id: 'rescue', name: '救王', icon: '♚' },
  { id: 'fork', name: '馬叉', icon: '♞' },
];

// FEN records the starting position. The solution is the move that completes
// the stated task. Legal moves with a different result receive separate feedback.
export const puzzles = [
  {
    id: '1A',
    category: 'delivery',
    title: '車的送貨路線',
    objective: '把白車送到有金色標記的 d6 格。',
    fen: '7k/8/8/8/8/8/3R4/K7 w - - 0 1',
    target: 'd6',
    solution: { from: 'd2', to: 'd6' },
    hint: {
      text: '車走直線。看看 d2 和 d6 是不是在同一欄。',
      squares: ['d2', 'd3', 'd4', 'd5', 'd6'],
    },
    success: '送到了。白車沿著 d 欄走到 d6。',
    incomplete: '這一步可以走。送貨要讓白車停在 d6。',
  },
  {
    id: '1B',
    category: 'delivery',
    title: '主教的斜線捷徑',
    objective: '黑兵擋住車的路。從白車和白主教選一枚，把它送到金色標記 e4。',
    fen: '7k/8/8/8/8/8/4p3/KB2R3 w - - 0 1',
    target: 'e4',
    solution: { from: 'b1', to: 'e4' },
    hint: {
      text: '從 b1 的白主教出發，沿著 c2、d3 找到 e4。',
      squares: ['b1', 'c2', 'd3', 'e4'],
    },
    success: '送到了。白主教沿斜線走到 e4，避開擋路的黑兵。',
    incomplete: '這一步可以走。試著用一枚棋直接到 e4。',
    feedback: {
      e1e4: 'e2 的黑兵擋住了車。找一枚能沿斜線到 e4 的棋。',
    },
  },
  {
    id: '3A',
    category: 'rescue',
    title: '擋住將軍',
    objective: '白王被黑車將軍。走一步，把棋子放在黑車和白王中間。',
    fen: '4r2k/8/8/8/8/8/4K3/2B5 w - - 0 1',
    solution: { from: 'c1', to: 'e3' },
    hint: {
      text: '黑車沿 e 欄將軍。白主教能走到哪一格擋線？',
      squares: ['e8', 'e7', 'e6', 'e5', 'e4', 'e3', 'e2'],
    },
    success: '白主教擋住黑車，王解圍了。',
    incomplete: '王已經安全了。再試用棋子擋住黑車的路線。',
    feedback: {
      e2e1: 'e1 還在黑車的攻擊線上。試試用棋子擋線。',
      e2e3: 'e3 在黑車的攻擊線上。想想哪枚棋能代替王走到那裡。',
    },
  },
  {
    id: '3B',
    category: 'rescue',
    title: '吃掉黑車',
    objective: 'e2 的黑車正在將軍。用一枚白棋吃掉它。',
    fen: '7k/8/8/7b/8/8/1R2r3/4K3 w - - 0 1',
    solution: { from: 'b2', to: 'e2' },
    hint: {
      text: '白車和黑車都在第 2 排。看看兩枚車之間有沒有棋子。',
      squares: ['b2', 'c2', 'd2', 'e2'],
    },
    success: '白車吃掉了將軍的棋子，白王安全了。',
    incomplete: '王移到了安全格。這次試試直接吃掉黑車。',
    feedback: {
      e1e2: '黑主教守著 e2，白王走過去會受攻擊。換一枚白棋試試。',
    },
  },
  {
    id: '6A',
    category: 'fork',
    title: '第一個馬叉',
    objective: '白馬走一步，同時攻擊黑王和黑車。',
    fen: '5k2/2r5/8/8/3N4/8/8/K7 w - - 0 1',
    solution: { from: 'd4', to: 'e6' },
    hint: {
      text: '從黑王和黑車的位置往回找。哪個格子和兩枚棋都相隔一個 L 形？',
      squares: ['f8', 'c7', 'e6'],
    },
    success: '馬叉成功。e6 的白馬同時攻擊 f8 的王和 c7 的車。',
    incomplete: '這一步可以走。找一個白馬能同時攻擊黑王和黑車的位置。',
  },
  {
    id: '6B',
    category: 'fork',
    title: '吃子再馬叉',
    objective: '白馬吃掉一枚棋，落地後要同時攻擊黑王和黑車。',
    fen: '8/5r1k/8/6p1/8/5N2/8/K7 w - - 0 1',
    solution: { from: 'f3', to: 'g5' },
    hint: {
      text: '看看 g5 的黑兵。白馬若跳到那裡，接下來可以攻擊哪兩枚棋？',
      squares: ['g5', 'h7', 'f7'],
    },
    success: '馬吃掉 g5 的黑兵，同時攻擊 h7 的王和 f7 的車。',
    incomplete: '這一步可以走。找找馬能吃哪一枚棋，落地後再檢查黑王和黑車。',
    feedback: {
      f3e5: '這一步會攻擊黑車。再找一個也能將軍、而且能吃子的落點。',
    },
  },
];

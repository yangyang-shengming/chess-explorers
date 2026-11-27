import { createGame, playerKey, playerName } from './elo.js?v=class-elo-1';

export const DATABASE_NAME = 'chess-explorers:class-games';

export function createGameDatabase() {
  let connection;

  function connect() {
    connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('players', { keyPath: 'id' });
        request.result.createObjectStore('games', { keyPath: 'id' });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
    return connection;
  }

  function completed(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error ?? new Error('資料庫操作已中止。'));
    });
  }

  return {
    async read() {
      const db = await connect();
      const tx = db.transaction(['players', 'games'], 'readonly');
      const players = tx.objectStore('players').getAll();
      const games = tx.objectStore('games').getAll();
      await completed(tx);
      return { roster: players.result.map(({ name }) => name), games: games.result };
    },
    async addPlayer(input) {
      const name = playerName(input);
      const id = playerKey(name);
      const db = await connect();
      const tx = db.transaction('players', 'readwrite');
      const players = tx.objectStore('players');
      const previous = players.get(id);
      previous.onsuccess = () => {
        if (!previous.result) players.add({ id, name });
      };
      await completed(tx);
      return previous.result?.name ?? name;
    },
    async save(input, { edit = false } = {}) {
      const game = createGame(input);
      const db = await connect();
      const tx = db.transaction('games', 'readwrite');
      const games = tx.objectStore('games');
      const previous = games.get(game.id);
      previous.onsuccess = () => {
        if (edit ? previous.result : !previous.result) games.put(game);
      };
      await completed(tx);
      if (edit && !previous.result) throw new Error('找不到這筆對局，請重新開啟紀錄。');
    },
    async remove(id) {
      const db = await connect();
      const tx = db.transaction('games', 'readwrite');
      tx.objectStore('games').delete(id);
      await completed(tx);
    },
  };
}

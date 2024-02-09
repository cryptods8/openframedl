import { db } from "./../db/db";
import { v4 as uuidv4 } from "uuid";

export interface Game {
  id: string;
  fid: number;
  date: string;
  guesses: string[];
}

export interface GameSave extends Omit<Game, "id"> {
  id?: string;
}

export interface GameRepository {
  save(game: GameSave): Promise<string>;
  loadByFidAndDate(fid: number, date: string): Promise<Game | null>;
}

export class GameRepositoryImpl implements GameRepository {
  getKey({ fid, date }: { fid: number; date: string }): string {
    return `games/fid/${fid}/${date}`;
  }

  async save(game: GameSave): Promise<string> {
    const key = this.getKey(game);
    const newGame: Game = { ...game, id: game.id || uuidv4() };
    await db.set<Game>(key, newGame);
    return newGame.id;
  }

  async loadByFidAndDate(fid: number, date: string): Promise<Game | null> {
    const key = this.getKey({ fid, date });
    return await db.get<Game>(key);
  }
}

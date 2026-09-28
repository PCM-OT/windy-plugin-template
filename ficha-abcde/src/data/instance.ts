import { FichaDB } from './db';
import { createRepo } from './repo';

export const db = new FichaDB();
export const repo = createRepo(db);

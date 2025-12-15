import Dexie, { Table } from 'dexie';
import { User, RadioContent } from './types';

class GPTFMDatabase extends Dexie {
  users!: Table<User>;
  stations!: Table<RadioContent>;

  constructor() {
    super('GPTFMDB');
    (this as any).version(1).stores({
      users: 'id, username', // Primary key and indexed props
      stations: 'id, ownerId, isPublic'
    });
  }
}

export const db = new GPTFMDatabase();

export const saveUser = async (user: User) => {
  await db.users.put(user);
};

export const getUser = async (username: string) => {
  return await db.users.where('username').equals(username).first();
};

export const saveStation = async (station: RadioContent) => {
  await db.stations.put(station);
};

export const getPublicStations = async () => {
  return await db.stations.where('isPublic').equals(1).toArray(); // Dexie stores boolean as 0/1 sometimes, or just use filter
};

export const getUserStations = async (userId: string) => {
  return await db.stations.where('ownerId').equals(userId).toArray();
};
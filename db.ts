import Dexie, { Table } from 'dexie';
import { User, RadioContent } from './types';

// Simulação de conexão MongoDB usando IndexedDB (Client-side)
// Em um app real com backend, isso seria substituído por Mongoose/MongoDB Driver.
class GPTFMDatabase extends Dexie {
  users!: Table<User>;
  stations!: Table<RadioContent>;

  constructor() {
    super('GPTFMDB');
    (this as any).version(2).stores({
      users: 'id, &username', // & = Unique Index (Username único)
      stations: 'id, ownerId, isPublic'
    });
  }
}

export const db = new GPTFMDatabase();

// --- Auth Functions ---

export const registerUser = async (username: string, password: string): Promise<User> => {
  // Verifica se usuário já existe
  const existing = await db.users.where('username').equals(username).first();
  if (existing) {
    throw new Error('Nome de usuário já está em uso.');
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    password, // Em produção real, NUNCA salve senhas em texto puro. Use bcrypt no backend.
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };

  await db.users.add(newUser);
  return newUser;
};

export const loginUser = async (username: string, password: string): Promise<User> => {
  const user = await db.users.where('username').equals(username).first();
  
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  if (user.password !== password) {
    throw new Error('Senha incorreta.');
  }

  return user;
};

// --- User Functions ---

export const saveUser = async (user: User) => {
  await db.users.put(user);
};

export const getUser = async (username: string) => {
  return await db.users.where('username').equals(username).first();
};

// --- Station Functions ---

export const saveStation = async (station: RadioContent) => {
  await db.stations.put(station);
};

export const deleteStation = async (id: string) => {
  await db.stations.delete(id);
};

export const updateStationVisibility = async (id: string, isPublic: boolean) => {
  await db.stations.update(id, { isPublic });
};

export const getPublicStations = async () => {
  return await db.stations.where('isPublic').equals(1).toArray();
};

export const getUserStations = async (userId: string) => {
  return await db.stations.where('ownerId').equals(userId).toArray();
};
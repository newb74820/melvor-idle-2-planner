import Dexie, { type Table } from 'dexie';
import { characterProfileSchema, decodedSaveSchema, type CharacterProfile, type DecodedSave } from '../schemas/save';

export class CharacterDatabase extends Dexie {
  profiles!: Table<CharacterProfile, string>;

  constructor(name = 'melvor-idle-2-planner') {
    super(name);
    this.version(1).stores({
      profiles: '&id, name, mode, importedAt',
    });
  }
}

export const characterDatabase = new CharacterDatabase();

export async function saveCharacterProfile(
  decoded: DecodedSave,
  database: CharacterDatabase = characterDatabase,
  importedAt = new Date().toISOString(),
): Promise<CharacterProfile> {
  const data = decodedSaveSchema.parse(decoded);
  const profile = characterProfileSchema.parse({
    id: data.uuid,
    name: data.name || 'Unnamed character',
    mode: data.mode || 'Unknown mode',
    importedAt,
    data,
  });
  await database.profiles.put(profile);
  return profile;
}

export async function listCharacterProfiles(
  database: CharacterDatabase = characterDatabase,
): Promise<CharacterProfile[]> {
  const rows = await database.profiles.orderBy('name').toArray();
  return rows.map((row) => characterProfileSchema.parse(row));
}

export async function deleteCharacterProfile(
  id: string,
  database: CharacterDatabase = characterDatabase,
): Promise<void> {
  await database.profiles.delete(id);
}
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { decodedSaveSchema } from '../schemas/save';
import { CharacterDatabase, deleteCharacterProfile, listCharacterProfiles, saveCharacterProfile } from './profiles';

const fixture = {
  version: 32,
  uuid: '00112233-4455-6677-8899-aabbccddeeff',
  name: 'Test Character',
  mode: 'Normal',
  savedAt: '2026-11-26T10:00:00Z',
  demo: false,
  totalLevel: 42,
  gp: '18446744073709551615',
  slayerCoins: '123',
  activity: { kind: null, target: null },
  skills: [{ name: 'Woodcutting', level: null, xp: 5000.5 }],
  bank: { stacks: 1, tabs: 1, items: { NormalLog: 50 }, unknownTrailingBytes: 12 },
  wallet: { GoldPieces: '18446744073709551615' },
  unknownComponents: [],
};

const databases: CharacterDatabase[] = [];

function createDatabase(): CharacterDatabase {
  const database = new CharacterDatabase(`profiles-test-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (database) => {
    await database.delete();
    database.close();
  }));
});

describe('decoded save schema', () => {
  it('accepts version-32 fields and exact 64-bit currency strings', () => {
    expect(decodedSaveSchema.parse(fixture).gp).toBe('18446744073709551615');
  });

  it('rejects invalid UUIDs, non-finite XP, and malformed currency strings', () => {
    expect(decodedSaveSchema.safeParse({ ...fixture, uuid: 'bad-id' }).success).toBe(false);
    expect(decodedSaveSchema.safeParse({ ...fixture, skills: [{ name: 'Woodcutting', level: null, xp: Infinity }] }).success).toBe(false);
    expect(decodedSaveSchema.safeParse({ ...fixture, gp: '12gp' }).success).toBe(false);
  });
});

describe('character profile persistence', () => {
  it('saves, lists, updates by character UUID, and deletes profiles', async () => {
    const database = createDatabase();
    const first = await saveCharacterProfile(fixture, database, '2026-11-26T10:05:00Z');
    expect(first.id).toBe(fixture.uuid);
    expect((await listCharacterProfiles(database))).toHaveLength(1);

    const updated = await saveCharacterProfile({ ...fixture, skills: [{ name: 'Woodcutting', level: 20, xp: 5001 }] }, database, '2026-11-26T10:10:00Z');
    expect(updated.importedAt).toBe('2026-11-26T10:10:00Z');
    expect((await listCharacterProfiles(database))).toHaveLength(1);
    expect((await listCharacterProfiles(database))[0].data.skills[0].level).toBe(20);

    await deleteCharacterProfile(fixture.uuid, database);
    expect(await listCharacterProfiles(database)).toEqual([]);
  });

  it('does not store invalid decoded data', async () => {
    const database = createDatabase();
    await expect(saveCharacterProfile({ ...fixture, name: 7 } as never, database)).rejects.toThrow();
    expect(await database.profiles.count()).toBe(0);
  });
});
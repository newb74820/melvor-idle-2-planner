import { z } from 'zod';

const safeName = z.string().max(256);
const finiteXp = z.number().finite().nonnegative();
const integerCount = z.number().int().nonnegative().max(10_000_000);

export const decodedSkillSchema = z.object({
  name: z.string().min(1).max(128),
  level: z.number().int().min(1).max(200).nullable(),
  xp: finiteXp,
});

export const decodedSaveSchema = z.object({
  version: z.number().int().positive().max(10_000),
  uuid: z.uuid(),
  name: safeName,
  mode: safeName,
  savedAt: z.iso.datetime({ offset: true }),
  demo: z.boolean(),
  totalLevel: z.number().int().nonnegative().max(100_000),
  gp: z.string().regex(/^-?\d{1,20}$/),
  slayerCoins: z.string().regex(/^-?\d{1,20}$/),
  activity: z.object({
    kind: safeName.nullable(),
    target: safeName.nullable(),
  }),
  skills: z.array(decodedSkillSchema).max(512),
  bank: z.object({
    stacks: integerCount,
    tabs: integerCount,
    items: z.record(z.string().min(1).max(256), integerCount),
    unknownTrailingBytes: integerCount,
  }),
  wallet: z.record(z.string().min(1).max(256), z.string().regex(/^-?\d{1,20}$/)),
  woodcuttingToolbelt: z.record(z.string().min(1).max(256), z.string().min(1).max(256)).nullish(),
  deedreeNodes: z.array(z.string().min(1).max(256)).max(64).nullish(),
  shopPurchases: z.record(z.string().min(1).max(256), z.number().int().nonnegative().max(2_147_483_647)).nullish(),
  woodcuttingMasteryTasks: z.record(z.string().min(1).max(256), z.object({
    goalComplete: z.boolean().nullable(),
    triggerMet: z.boolean(),
  })).nullish(),
  woodyUnlocked: z.boolean().nullish(),
  unknownComponents: z.array(z.object({
    entity: z.string().min(1).max(256),
    component: z.string().min(1).max(256),
    sizeBytes: integerCount,
  })).max(100_000),
});

export const saveDirectoryPreferenceSchema = z.object({
  directory: z.string().min(1).max(32_768),
  fileName: z.string().max(256),
});

export const saveFileEntrySchema = z.object({
  name: z.string().min(1).max(256),
  sizeBytes: z.number().int().nonnegative().max(16 * 1024 * 1024),
});

export const loadedSaveSchema = z.object({
  fileName: z.string().min(1).max(256),
  save: decodedSaveSchema,
});

export const characterProfileSchema = z.object({
  id: z.uuid(),
  name: safeName,
  mode: safeName,
  importedAt: z.iso.datetime({ offset: true }),
  data: decodedSaveSchema,
});

export type DecodedSkill = z.infer<typeof decodedSkillSchema>;
export type DecodedSave = z.infer<typeof decodedSaveSchema>;
export type SaveDirectoryPreference = z.infer<typeof saveDirectoryPreferenceSchema>;
export type SaveFileEntry = z.infer<typeof saveFileEntrySchema>;
export type LoadedSave = z.infer<typeof loadedSaveSchema>;
export type CharacterProfile = z.infer<typeof characterProfileSchema>;

import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const WorkoutIdSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export type WorkoutId = z.infer<typeof WorkoutIdSchema>;

export const LIMITS = { kgMax: 500, repsMax: 200, restMaxSec: 600, setsMax: 20 } as const;

export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(LIMITS.setsMax),
  /** null = "a definir" (reps em branco na ficha original). */
  reps: z
    .object({
      min: z.number().int().min(1).max(LIMITS.repsMax),
      max: z.number().int().max(LIMITS.repsMax),
    })
    .refine((r) => r.max >= r.min, 'max < min')
    .nullable(),
  machine: z.string().trim().max(10).nullable(),
  restSec: z.number().int().min(0).max(LIMITS.restMaxSec),
  /** Mobilidade: só registra repetições. */
  noLoad: z.boolean(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const WorkoutSchema = z.object({
  id: WorkoutIdSchema,
  name: z.string().trim().min(1).max(80),
  muscles: z.string().max(120),
  exercises: z.array(ExerciseSchema).max(30),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const PlanSchema = z.object({
  id: z.literal('plan'),
  schemaVersion: z.number().int(),
  /** YYYY-MM-DD */
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalSessions: z.number().int().min(1).max(1000),
  workouts: z.array(WorkoutSchema).length(5),
  updatedAt: z.number(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const SetLogSchema = z.object({
  exerciseId: z.string(),
  idx: z.number().int().min(0),
  kg: z.number().min(0).max(LIMITS.kgMax).nullable(),
  reps: z.number().int().min(0).max(LIMITS.repsMax).nullable(),
  done: z.boolean(),
  doneAt: z.number().nullable(),
});
export type SetLog = z.infer<typeof SetLogSchema>;

/** Cópia do exercício no momento do treino (o histórico não muda se a ficha mudar). */
export const ExerciseSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  restSec: z.number().int().min(0),
  noLoad: z.boolean(),
});
export type ExerciseSnapshot = z.infer<typeof ExerciseSnapshotSchema>;

const sessionBase = {
  id: z.string().min(1),
  schemaVersion: z.number().int(),
  workoutId: WorkoutIdSchema,
  /** UTC ms. O dia da sessão é o de startedAt. */
  startedAt: z.number(),
  exercises: z.array(ExerciseSnapshotSchema),
  sets: z.array(SetLogSchema),
  note: z.string().max(2000),
};

export const SessionSchema = z.object({ ...sessionBase, endedAt: z.number() });
export type Session = z.infer<typeof SessionSchema>;

export const ActiveSessionSchema = z.object({
  ...sessionBase,
  rest: z
    .object({ endAt: z.number(), totalMs: z.number(), exerciseId: z.string() })
    .nullable(),
  updatedAt: z.number(),
});
export type ActiveSession = z.infer<typeof ActiveSessionSchema>;

export const SettingsSchema = z.object({
  id: z.literal('settings'),
  schemaVersion: z.number().int(),
  sound: z.boolean(),
  vibration: z.boolean(),
  persistGranted: z.boolean().nullable(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const BackupSchema = z.object({
  app: z.literal('ficha-abcde'),
  schemaVersion: z.number().int(),
  exportedAt: z.number(),
  plan: z.unknown().nullable(),
  settings: z.unknown().nullable(),
  /** Cada item é validado individualmente na importação. */
  sessions: z.array(z.unknown()),
});

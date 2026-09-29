import { z } from 'zod';

// CSP restritiva (sem 'unsafe-eval'): o zod não deve nem tentar compilar validadores com new Function.
z.config({ jitless: true });

export const SCHEMA_VERSION = 1;

/** Uma ficha tem de 1 a 7 treinos (A–G). */
export const WORKOUT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const WorkoutIdSchema = z.enum(WORKOUT_LETTERS);
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
  /** Liga ao catálogo de exercícios (dicas de execução). null = exercício criado à mão. */
  catalogId: z.string().nullable().default(null),
  /** Anotação/dica do próprio usuário (aparece no treino). */
  note: z.string().max(500).default(''),
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
  name: z.string().trim().min(1).max(80).default('Minha ficha'),
  /** Ficha pronta de origem (se veio de uma). */
  source: z
    .object({ templateId: z.string(), title: z.string() })
    .nullable()
    .default(null),
  /** YYYY-MM-DD. Opcional: nem toda ficha tem validade. */
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  /** Meta de sessões. Opcional. */
  totalSessions: z.number().int().min(1).max(1000).nullable().default(null),
  workouts: z
    .array(WorkoutSchema)
    .min(1)
    .max(7)
    .refine((w) => new Set(w.map((x) => x.id)).size === w.length, 'treinos repetidos'),
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
  /** Alvo de repetições e máquina no momento do treino (null = a definir / sem número). */
  reps: z
    .object({ min: z.number().int(), max: z.number().int() })
    .nullable()
    .default(null),
  machine: z.string().nullable().default(null),
  catalogId: z.string().nullable().default(null),
  note: z.string().default(''),
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
    .object({
      /** Instante absoluto (UTC ms) em que o descanso termina. */
      endAt: z.number(),
      totalMs: z.number(),
      exerciseId: z.string(),
      setIdx: z.number().int().nullable().default(null),
    })
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
  /** Última mudança de som/vibração (UTC ms). 0 = padrão nunca alterado (não sincroniza). */
  updatedAt: z.number().default(0),
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

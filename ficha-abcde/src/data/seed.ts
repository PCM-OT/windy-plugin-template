import { SCHEMA_VERSION } from '../domain/schemas';
import type { Exercise, Plan, Workout, WorkoutId } from '../domain/schemas';

type Reps = [number, number] | null;
// [nome, séries, reps, máquina, descanso (s), sem carga?]
type Row = [string, number, Reps, string | null, number, boolean?];

const R1012: Reps = [10, 12];
const R15: Reps = [15, 15];

function workout(id: WorkoutId, name: string, muscles: string, rows: Row[]): Workout {
  const exercises: Exercise[] = rows.map(
    ([n, sets, reps, machine, restSec, noLoad], i) => ({
      id: `${id}-${i + 1}`,
      name: n,
      sets,
      reps: reps ? { min: reps[0], max: reps[1] } : null,
      machine,
      restSec,
      noLoad: noLoad ?? false,
    }),
  );
  return { id, name, muscles, exercises };
}

export const SEED_VALID_UNTIL = '2026-11-16';
export const SEED_TOTAL_SESSIONS = 40;

/** Ficha transcrita da ficha real. Descansos são sugestões (a ficha original não informa). */
export function seedPlan(now: number): Plan {
  return {
    id: 'plan',
    schemaVersion: SCHEMA_VERSION,
    validUntil: SEED_VALID_UNTIL,
    totalSessions: SEED_TOTAL_SESSIONS,
    updatedAt: now,
    workouts: [
      workout('A', 'Quadríceps', 'Pernas, anterior', [
        ['Mobilidade de quadril e tornozelo', 3, R15, null, 30, true],
        ['Cadeira adutora', 4, R1012, '17', 60],
        ['Agachamento', 4, R1012, '33', 90],
        ['Cadeira extensora', 4, R1012, '07', 60],
        ['Leg press', 4, R1012, null, 90],
        ['Mesa flexora', 3, R1012, '09', 60],
        ['Panturrilha sentado', 3, R15, null, 45],
      ]),
      workout('B', 'Superiores', 'Costas, bíceps, abdômen', [
        ['Mobilidade de ombro', 3, R15, null, 30, true],
        ['Remada baixa aberta', 4, R1012, '13', 60],
        ['Remada curvada com barra, pegada pronada', 4, R1012, null, 75],
        ['Puxada neutra triângulo', 3, R1012, null, 60],
        ['Puxada articulada aberta', 4, R1012, '12', 60],
        ['Crucifixo máquina inverso', 4, R1012, '27', 60],
        ['Bíceps máquina alternado', 3, R15, '20', 45],
        ['Abdominal máquina', 4, R15, '20', 45],
      ]),
      workout('C', 'Bíceps femoral', 'Pernas, posterior e glúteos', [
        ['Panturrilha sentado', 3, R15, null, 45],
        ['Mesa flexora', 4, R15, '09', 60],
        ['Cadeira abdutora', 4, R15, '16', 60],
        ['Cadeira flexora', 3, null, '08', 60],
        ['Flexora unilateral máquina', 4, R15, '10', 60],
        ['Agachamento sumô com halter', 4, R15, null, 75],
      ]),
      workout('D', 'Superiores', 'Peito, tríceps, ombro', [
        ['Abdominal máquina', 4, R15, '20', 45],
        ['Peck deck', 4, R15, null, 60],
        ['Supino declinado máquina', 4, R15, '25', 60],
        ['Supino máquina', 4, R15, '26', 60],
        ['Tríceps mergulho máquina', 4, R15, '22', 60],
        ['Tríceps francês com corda na polia', 3, null, null, 60],
        ['Desenvolvimento máquina neutro', 4, R15, '23', 60],
      ]),
      workout('E', 'Superior', 'Ombro, braços, costas', [
        ['Remada baixa supinada', 4, R1012, '13', 60],
        ['Voador', 4, R1012, null, 60],
        ['Elevação lateral com halteres', 4, R1012, null, 45],
        ['Elevação frontal com corda na polia baixa', 4, R1012, null, 45],
        ['Bíceps máquina alternado', 4, R1012, '20', 60],
        ['Tríceps pulley barra reta', 4, R1012, null, 60],
        ['Encolhimento de ombros', 4, R1012, null, 45],
      ]),
    ],
  };
}

export const defaultSettings = () => ({
  id: 'settings' as const,
  schemaVersion: SCHEMA_VERSION,
  sound: true,
  vibration: true,
  persistGranted: null,
  updatedAt: 0,
});

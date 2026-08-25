export interface User {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  name: string;
  category?: string | null;
}

export interface SetEntry {
  id: number;
  exercise: Exercise;
  set_number: number;
  reps: number | null;
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "km" | "mi" | null;
  notes?: string | null;
}

export interface WorkoutSession {
  id: number;
  user: User;
  title?: string | null;
  date: string; // ISO datetime
  duration_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  sets: SetEntry[];
}

export interface WorkoutSessionSummary {
  id: number;
  user: User;
  title?: string | null;
  date: string;
  duration_minutes?: number | null;
  set_count: number;
  total_volume: number;
}

export type SetKind = "strength" | "cardio";

export interface DraftSet {
  kind: SetKind;
  exercise_name: string;
  set_number: number;
  // Strength
  reps: number;
  weight: number;
  weight_unit: "kg" | "lb";
  // Cardio
  duration_minutes: number;
  distance: number;
  distance_unit: "km" | "mi";
}

export interface PersonalBest {
  exercise: string;
  value: number;
  unit: "kg" | "reps";
}

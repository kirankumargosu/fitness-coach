export type UserRole = "member" | "admin";

export interface User {
  id: number;
  name: string;
  role: UserRole;
  has_password: boolean;
  first_name: string | null;
  last_name: string | null;
}

export interface Profile {
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null; // "YYYY-MM-DD"
  gender: string | null;
  height: number | null;
  height_unit: "cm" | "in" | null;
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
  goal: string | null;
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
  unit: "kg" | "reps" | "min" | "km";
  rank: number;
  total_lifters: number
  percentile: number
  is_best: boolean
  leader_name: string
  leader_value: number
  leader_units: "kg" | "reps" | "min" | "km";
}

export interface BodyMetric {
  id: number;
  date: string; // "YYYY-MM-DD"
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
  muscle_mass: number | null;
  body_fat_percentage: number | null;
  visceral_fat: number | null;
  water_percentage: number | null;
  protein_percentage: number | null;
}

export interface Badge {
  key: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
  detail: string;
}

export type ChallengeType = "volume" | "exercise" | "consistency";
export type ChallengeStatus = "upcoming" | "active" | "completed";

export interface Challenge {
  id: number;
  name: string;
  type: ChallengeType;
  exercise_name: string | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  created_by: number;
  participants: User[];
  status: ChallengeStatus;
}

export interface LeaderboardEntry {
  user: User;
  score: number;
  unit: string;
  rank: number;
  is_leader: boolean;
}

export interface Leaderboard {
  challenge: Challenge;
  entries: LeaderboardEntry[];
}

export interface NutritionEntry {
  id: number;
  description: string;
  timestamp: string; // ISO datetime
  calories: number;
  protein_g: number;
  carbs_g: number;
  saturated_fat_g: number;
  unsaturated_fat_g: number;
}

export interface NutritionSummary {
  date: string; // "YYYY-MM-DD"
  calories: number;
  protein_g: number;
  carbs_g: number;
  saturated_fat_g: number;
  unsaturated_fat_g: number;
  entry_count: number;
}

export interface WaterEntry {
  id: number;
  amount_ml: number;
  timestamp: string; // ISO datetime
}

export interface WaterSummary {
  date: string; // "YYYY-MM-DD"
  total_ml: number;
  entry_count: number;
}
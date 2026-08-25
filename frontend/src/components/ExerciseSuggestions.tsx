import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Exercise } from "../api/types";

export function ExerciseSuggestions() {
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    api.getExercises().then(setExercises).catch(() => setExercises([]));
  }, []);

  return (
    <datalist id="exercise-suggestions">
      {exercises.map((e) => (
        <option key={e.id} value={e.name} />
      ))}
    </datalist>
  );
}

import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Exercise } from "../api/types";

interface ExerciseComboboxProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

/** A searchable picker, not a plain free-text field. The goal: picking
 * an EXISTING exercise should be the obvious, easy path (you see it as
 * you type and just click it), while creating a brand-new one is a
 * deliberate, clearly-labeled last resort — not something that happens
 * silently because of a stray typo in casing or spelling. */
export function ExerciseCombobox({
  value,
  onChange,
  placeholder,
}: ExerciseComboboxProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getExercises()
      .then(setExercises)
      .catch(() => setExercises([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const exactMatch = exercises.some((e) => e.name.toLowerCase() === query);

  const matches = query
    ? exercises
        .filter((e) => e.name.toLowerCase().includes(query))
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
          return aStarts - bStarts || a.name.localeCompare(b.name);
        })
        .slice(0, 6)
    : exercises.slice(0, 6);

  const showCreateOption = query.length > 0 && !exactMatch;

  const selectExercise = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="exercise-combobox" ref={containerRef}>
      <input
        className="set-exercise"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (matches.length > 0 || showCreateOption) && (
        <div className="exercise-combobox-dropdown">
          {matches.map((ex) => (
            <button
              type="button"
              key={ex.id}
              className="exercise-combobox-option"
              onClick={() => selectExercise(ex.name)}
            >
              {ex.name}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              className="exercise-combobox-option exercise-combobox-create"
              onClick={() => selectExercise(value.trim())}
            >
              + Create new exercise: "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
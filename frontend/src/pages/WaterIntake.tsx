import { useEffect, useState } from "react";
import { api } from "../api/client";
import { NutritionSubNav } from "../components/NutritionSubNav";
import type { WaterEntry, WaterSummary } from "../api/types";
import { useAuth } from "../context/AuthContext";

function todayLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayBounds(dateStr: string): { start: string; end: string } {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
}

const QUICK_ADD_ML = [100, 250, 500, 750];

export function WaterIntake() {
    const { currentUser } = useAuth();
    const [date, setDate] = useState(todayLocal());
    const [entries, setEntries] = useState<WaterEntry[]>([]);
    const [summary, setSummary] = useState<WaterSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [customAmount, setCustomAmount] = useState("");

    const load = () => {
        setLoading(true);
        const { start, end } = dayBounds(date);
        Promise.all([api.listWaterEntries({ start, end }), api.getWaterSummary(date)])
            .then(([e, s]) => {
                setEntries(e);
                setSummary(s);
                // Set latest entry amount as default
                if (e.length > 0) {
                    setCustomAmount(String(e[0].amount_ml));
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(load, [date]);

    if (!currentUser) return null;

    const addAmount = async (ml: number) => {
        if (ml <= 0) return;
        setAdding(true);
        try {
            await api.createWaterEntry({ amount_ml: ml });
            load();
        } finally {
            setAdding(false);
        }
    };

    const handleCustomAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const ml = Number(customAmount);
        if (!ml || ml <= 0) return;
        await addAmount(ml);
        setCustomAmount("");
    };

    const handleDelete = async (id: number) => {
        await api.deleteWaterEntry(id);
        load();
    };

    const totalMl = summary?.total_ml ?? 0;

    return (
        <div>
            <NutritionSubNav />

            <div className="log-form-header">
                <h2>Water</h2>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="nutrition-date-picker"
                />
            </div>

            <div className="water-total">
                <span className="water-total-value">{(totalMl / 1000).toFixed(2)}</span>
                <span className="water-total-unit">L</span>
            </div>

            <div className="water-quick-add">
                {QUICK_ADD_ML.map((ml) => (
                    <button
                        key={ml}
                        type="button"
                        className="water-quick-btn"
                        onClick={() => addAmount(ml)}
                        disabled={adding}
                    >
                        +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                    </button>
                ))}
            </div>

            <form className="water-custom-form" onSubmit={handleCustomAdd}>
                <input
                    type="number"
                    min={1}
                    max={5000}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Custom amount (ml)"
                />
                <button type="submit" className="ghost-btn" disabled={adding}>
                    Add
                </button>
            </form>

            {!loading && entries.length > 0 && (
                <div className="water-log">
                    {entries.map((entry) => (
                        <div className="water-log-row" key={entry.id}>
                            <span>{entry.amount_ml} ml</span>
                            <span className="session-meta">{formatTime(entry.timestamp)}</span>
                            <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => handleDelete(entry.id)}
                                aria-label="Remove entry"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
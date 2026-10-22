export const CATEGORIES = ["science", "energy", "gold", "exploration", "generals", "financiers"];
export const FIELD_IDS = [
    "grossVictoryPointsInput",
    ...CATEGORIES.flatMap((category) => [`${category}VictoryPointsInput`, `${category}MultiplierInput`])
];

export function calculateScore(rawValues = {}) {
    const values = {};
    const errors = {};
    for (const id of FIELD_IDS) {
        const raw = rawValues[id] ?? "";
        const value = typeof raw === "string" && raw.trim() === "" ? 0 : Number(raw);
        if (typeof raw !== "string" || !Number.isFinite(value) || !Number.isInteger(value)) {
            errors[id] = "Enter a whole number.";
        } else if (!Number.isSafeInteger(value)) {
            errors[id] = "This number is too large.";
        } else if (id !== "grossVictoryPointsInput" && value < 0) {
            errors[id] = "Use zero or a positive number.";
        } else {
            values[id] = value;
        }
    }
    if (Object.keys(errors).length) return { valid: false, errors };

    const printed = values.grossVictoryPointsInput;
    let total = printed;
    let cardBonuses = 0;
    const subtotals = {};
    for (const category of CATEGORIES) {
        const characters = category === "generals" || category === "financiers";
        const multiplier = values[`${category}MultiplierInput`] + (characters ? 1 : 0);
        const subtotal = values[`${category}VictoryPointsInput`] * multiplier;
        total += subtotal;
        if (!characters) cardBonuses += subtotal;
        if (![multiplier, subtotal, total, cardBonuses].every(Number.isSafeInteger)) {
            return { valid: false, errors: { total: "These values exceed the safe calculation range. Use smaller numbers." } };
        }
        subtotals[category] = subtotal;
    }
    return { valid: true, errors: {}, total, printed, cardBonuses, subtotals };
}

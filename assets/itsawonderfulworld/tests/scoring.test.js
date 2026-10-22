import test from "node:test";
import assert from "node:assert/strict";
import { calculateScore, CATEGORIES, FIELD_IDS } from "../js/scoring.js";

test("blank fields produce a zero score and all six subtotals", () => {
    const result = calculateScore();
    assert.equal(result.valid, true);
    assert.equal(result.total, 0);
    assert.deepEqual(Object.keys(result.subtotals), CATEGORIES);
    assert.equal(FIELD_IDS.length, 13);
});

test("the complete scoring example totals 125 without double-counting character base points", () => {
    const result = calculateScore({
        grossVictoryPointsInput: "32",
        scienceVictoryPointsInput: "5", scienceMultiplierInput: "3",
        energyVictoryPointsInput: "8", energyMultiplierInput: "2",
        goldVictoryPointsInput: "4", goldMultiplierInput: "2",
        explorationVictoryPointsInput: "6", explorationMultiplierInput: "2",
        generalsVictoryPointsInput: "9", generalsMultiplierInput: "2",
        financiersVictoryPointsInput: "5", financiersMultiplierInput: "2"
    });
    assert.equal(result.valid, true);
    assert.equal(result.total, 125);
    assert.equal(result.printed, 32);
    assert.equal(result.cardBonuses, 51);
    assert.deepEqual(result.subtotals, { science: 15, energy: 16, gold: 8, exploration: 12, generals: 27, financiers: 15 });
});

for (const category of CATEGORIES) {
    test(`${category} uses its proper base and multiplier`, () => {
        const characters = ["generals", "financiers"].includes(category);
        const blankBonus = calculateScore({ [`${category}VictoryPointsInput`]: "3" });
        assert.equal(blankBonus.total, characters ? 3 : 0);
        const bonus = calculateScore({ [`${category}VictoryPointsInput`]: "3", [`${category}MultiplierInput`]: "2" });
        assert.equal(bonus.total, characters ? 9 : 6);
    });
}

test("signed printed VP adjustments and integer-valued exponent notation remain exact", () => {
    const result = calculateScore({
        grossVictoryPointsInput: "-4",
        scienceVictoryPointsInput: "2e2",
        scienceMultiplierInput: "3.0"
    });
    assert.equal(result.valid, true);
    assert.equal(result.total, 596);
});

for (const [value, message] of [
    ["1.5", "whole number"],
    ["-2", "positive number"],
    ["1e309", "whole number"],
    ["NaN", "whole number"],
    ["9007199254740992", "too large"]
]) {
    test(`invalid count ${value} never returns a success-shaped total`, () => {
        const result = calculateScore({ scienceVictoryPointsInput: value });
        assert.equal(result.valid, false);
        assert.match(result.errors.scienceVictoryPointsInput, new RegExp(message));
        assert.equal("total" in result, false);
    });
}

test("all input errors are returned together", () => {
    const result = calculateScore({ grossVictoryPointsInput: "2.5", energyMultiplierInput: "-1", financiersVictoryPointsInput: "bad" });
    assert.equal(result.valid, false);
    assert.equal(Object.keys(result.errors).length, 3);
});

for (const values of [
    { scienceVictoryPointsInput: "9007199254740991", scienceMultiplierInput: "2" },
    { grossVictoryPointsInput: "9007199254740991", generalsVictoryPointsInput: "1" },
    { generalsVictoryPointsInput: "1", generalsMultiplierInput: "9007199254740991" }
]) {
    test(`unsafe arithmetic is rejected: ${JSON.stringify(values)}`, () => {
        const result = calculateScore(values);
        assert.equal(result.valid, false);
        assert.match(result.errors.total, /safe calculation range/);
        assert.equal("total" in result, false);
    });
}

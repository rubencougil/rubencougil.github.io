import { calculateScore, CATEGORIES, FIELD_IDS } from "./scoring.js";

const byId = (id) => document.getElementById(id);
const form = byId("score-form");
const fields = FIELD_IDS.map(byId);
const totalCard = document.querySelector(".total-card");
const result = byId("resultInput");
const scoreStatus = byId("score_status");
const storageNotice = byId("storage_notice");
const resetButton = byId("reset_button");
const resetDialog = byId("reset_dialog");
const storageKey = "wonderful-world:scorecard:v1";
let storageAvailable = true;
let calculationTracked = false;

function warnStorage(error) {
    if (!storageAvailable) return;
    storageAvailable = false;
    console.warn("Scorecard storage is unavailable:", error);
    storageNotice.textContent = "Storage is unavailable. Your entries last only until you leave or reload this page.";
}

function readValues() {
    return Object.fromEntries(fields.map((input) => [input.id, input.validity.badInput ? "invalid" : input.value]));
}

function save() {
    if (!storageAvailable) return;
    // Number inputs with an unfinished edit cannot serialize their raw keystrokes.
    const values = Object.fromEntries(fields.map((input) => [input.id, input.value]));
    try {
        localStorage.setItem(storageKey, JSON.stringify({ version: 1, values }));
    } catch (error) {
        warnStorage(error);
    }
}

function restore() {
    let saved;
    try {
        saved = localStorage.getItem(storageKey);
    } catch (error) {
        warnStorage(error);
        return;
    }
    if (saved === null) return;
    try {
        const data = JSON.parse(saved);
        if (data?.version !== 1 || !data.values || typeof data.values !== "object" ||
            Array.isArray(data.values) || Object.keys(data.values).length !== FIELD_IDS.length) {
            throw new Error("Invalid saved scorecard format");
        }
        const probe = document.createElement("input");
        probe.type = "number";
        for (const id of FIELD_IDS) {
            const value = data.values[id];
            if (typeof value !== "string" || value.length > 100) throw new Error(`Invalid saved field: ${id}`);
            probe.value = value;
            if (probe.value !== value) throw new Error(`Invalid saved number: ${id}`);
        }
        for (const input of fields) input.value = data.values[input.id];
        storageNotice.textContent = "Your saved scorecard is restored. Changes save automatically in this browser.";
    } catch (error) {
        console.warn("Could not restore the saved scorecard:", error);
        storageNotice.textContent = "Saved data could not be restored. A fresh scorecard is ready.";
    }
}

function update() {
    const calculation = calculateScore(readValues());
    for (const input of fields) {
        const error = calculation.errors[input.id];
        input.setAttribute("aria-invalid", String(Boolean(error)));
        const message = byId(`${input.id}Error`);
        message.textContent = error || "";
        message.hidden = !error;
    }
    resetButton.disabled = !fields.some((input) => input.value !== "" || input.validity.badInput);
    totalCard.dataset.state = calculation.valid ? "valid" : "invalid";
    if (!calculation.valid) {
        result.value = "—";
        for (const category of CATEGORIES) byId(`${category}Subtotal`).value = "—";
        for (const part of ["printed", "cards", "generals", "financiers"]) byId(`${part}-breakdown`).textContent = "—";
        scoreStatus.textContent = calculation.errors.total || "Check the highlighted fields before using this total.";
        return false;
    }
    result.value = calculation.total;
    byId("printed-breakdown").textContent = calculation.printed;
    byId("cards-breakdown").textContent = calculation.cardBonuses;
    byId("generals-breakdown").textContent = calculation.subtotals.generals;
    byId("financiers-breakdown").textContent = calculation.subtotals.financiers;
    for (const category of CATEGORIES) byId(`${category}Subtotal`).value = calculation.subtotals[category];
    scoreStatus.textContent = "Score updated. Blank fields count as zero.";
    return true;
}

form.addEventListener("input", () => {
    const valid = update();
    save();
    if (valid && !calculationTracked && fields.some((input) => input.value !== "")) {
        calculationTracked = true;
        window.trackProjectEvent?.("score_calculate");
    }
});
form.addEventListener("submit", (event) => event.preventDefault());
resetButton.addEventListener("click", () => resetDialog.showModal());
byId("confirm_reset").addEventListener("click", () => {
    form.reset();
    calculationTracked = false;
    update();
    save();
    resetDialog.close();
    fields[0].focus({ preventScroll: true });
});

const copyButton = byId("copy_link_button");
const shareStatus = byId("share_status");
const shareLink = byId("share_link");
const shareUrl = byId("share_url");
const canonicalUrl = document.querySelector('link[rel="canonical"]').href;
shareUrl.value = canonicalUrl;
copyButton.disabled = false;
copyButton.addEventListener("click", async () => {
    copyButton.disabled = true;
    shareLink.hidden = true;
    shareStatus.textContent = "";
    try {
        if (typeof navigator.clipboard?.writeText === "function") {
            try {
                await navigator.clipboard.writeText(canonicalUrl);
                shareStatus.textContent = "Link copied. Paste it into your favorite app.";
                window.trackProjectEvent?.("share", "copy_link");
                return;
            } catch (error) {
                console.warn("Could not copy the sharing link:", error);
            }
        }
        shareLink.hidden = false;
        shareStatus.textContent = "Automatic copying is unavailable. Select and copy the link above.";
        shareUrl.focus();
        shareUrl.select();
    } finally {
        copyButton.disabled = false;
    }
});

restore();
byId("score-fields").disabled = false;
update();

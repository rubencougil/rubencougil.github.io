(() => {
    "use strict";

    const levels = ["easy", "medium", "hard", "expert", "impossible"];
    const byId = (id) => document.getElementById(id);
    const input = byId("input_answer");
    const submit = byId("input_submit");
    const select = byId("select_level");
    const result = byId("output_result");
    const nextButton = byId("next_button");
    const restartButton = byId("restart_button");
    const dialog = byId("game_over_dialog");
    const totalLives = 5;
    const memory = new Map();
    let storageAvailable = true;
    let params;
    let pools;
    let level = "easy";
    let currentEmoji;
    let score = 0;
    let lives = totalLives;
    let phase = "loading";
    let nextTimeout;
    let gameStarted = false;

    function storageWarning(error) {
        if (!storageAvailable) return;
        storageAvailable = false;
        console.warn("Emoji Trainer cannot save progress in this browser:", error);
        byId("storage_notice").textContent = "Browser storage is unavailable. New scores last only for this page session.";
    }

    function readSaved(key) {
        if (memory.has(key)) return memory.get(key);
        try {
            const saved = localStorage.getItem(`emoji-trainer:${key}`);
            if (saved !== null) return saved;
            // Keep scores and difficulty from the original cookie-based game.
            const prefix = `${key}=`;
            const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
            return cookie ? cookie.slice(prefix.length) : null;
        } catch (error) {
            storageWarning(error);
            return null;
        }
    }

    function save(key, value) {
        memory.set(key, String(value));
        try {
            localStorage.setItem(`emoji-trainer:${key}`, String(value));
        } catch (error) {
            storageWarning(error);
        }
    }

    function savedNumber(key) {
        const value = Number(readSaved(key));
        return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    }

    function displayStats() {
        for (const name of levels) {
            byId(`${name}_display_best_score`).textContent = savedNumber(`${name}_best_score`);
            byId(`${name}_display_total_plays`).textContent = savedNumber(`${name}_total_plays`);
            document.querySelector(`[data-level="${name}"]`).dataset.active = String(name === level);
        }
    }

    function showLives() {
        const display = byId("lives");
        display.textContent = "❤️".repeat(lives) + "🤍".repeat(totalLives - lives);
        display.setAttribute("aria-label", `${lives} of ${totalLives} lives remaining`);
    }

    function showResult(message, state = "") {
        result.textContent = message;
        result.dataset.state = state;
    }

    function setAnswerEnabled(enabled) {
        input.disabled = !enabled;
        submit.disabled = !enabled;
    }

    function finish() {
        phase = "finished";
        setAnswerEnabled(false);
        save(`${level}_total_plays`, savedNumber(`${level}_total_plays`) + 1);
        save(`${level}_best_score`, Math.max(score, savedNumber(`${level}_best_score`)));
        displayStats();
        byId("final_score").textContent = score;
        byId("game_over_message").textContent = `${select.selectedOptions[0].textContent.replace(/^\S+\s/, "")} level complete. Your final score:`;
        showResult("Workout complete. Restart or play again to begin a new game.");
        dialog.showModal();
        window.trackProjectEvent?.("level_end");
    }

    function next(focusInput = false) {
        clearTimeout(nextTimeout);
        nextButton.hidden = true;
        if (lives === 0) {
            finish();
            return;
        }
        const pool = pools[level];
        // Select from a finite eligible pool and avoid consecutive repeats.
        const choices = pool.length > 1 ? pool.filter((entry) => entry !== currentEmoji) : pool;
        currentEmoji = choices[Math.floor(Math.random() * choices.length)];
        byId("display_emoji").textContent = currentEmoji.emoji;
        const ratio = params[level].hint_ratio;
        byId("block_hint").hidden = ratio === 0;
        byId("no_hint").hidden = ratio !== 0;
        byId("display_hint").textContent = ratio === 0 ? "" : currentEmoji.aliases.map((alias) =>
            Array.from(alias, (letter) => letter === "_" || Math.random() < ratio ? letter : "·").join(" ")
        ).join(" / ");
        input.value = "";
        showResult("");
        phase = "answering";
        setAnswerEnabled(true);
        if (focusInput) input.focus({ preventScroll: true });
    }

    function start(focusInput = false) {
        clearTimeout(nextTimeout);
        if (dialog.open) dialog.close();
        score = 0;
        lives = totalLives;
        currentEmoji = null;
        gameStarted = false;
        byId("display_score").textContent = score;
        showLives();
        displayStats();
        next(focusInput);
    }

    byId("answer_form").addEventListener("submit", (event) => {
        event.preventDefault();
        if (phase !== "answering") return;
        const answer = input.value.trim().toLowerCase().replace(/^:(.*):$/, "$1").trim();
        if (!answer) {
            showResult("Type an emoji shortcode before checking your answer.", "error");
            input.focus();
            return;
        }
        if (!gameStarted) {
            gameStarted = true;
            window.trackProjectEvent?.("level_start");
        }
        phase = "feedback";
        setAnswerEnabled(false);
        const correct = currentEmoji.aliases.includes(answer);
        if (correct) {
            score += 1;
            byId("display_score").textContent = score;
            showResult(`Correct! :${answer}: — nice work.`, "success");
        } else {
            lives -= 1;
            showLives();
            showResult(`Not quite. Accepted: ${currentEmoji.aliases.map((alias) => `:${alias}:`).join(", ")}`, "error");
        }
        nextButton.textContent = lives === 0 ? "See results →" : "Next emoji →";
        nextButton.hidden = false;
        nextButton.focus({ preventScroll: true });
        nextTimeout = setTimeout(() => next(true), correct ? 1400 : 2800);
    });

    nextButton.addEventListener("click", () => {
        if (phase === "feedback") next(true);
    });
    restartButton.addEventListener("click", () => start(true));
    select.addEventListener("change", () => {
        level = select.value;
        save("level", level);
        start();
    });
    byId("try_again_button").addEventListener("click", (event) => {
        event.preventDefault();
        start(true);
    });
    dialog.addEventListener("cancel", () => {
        // Escape dismisses the summary; the visible Restart control stays usable.
        restartButton.focus({ preventScroll: true });
    });
    byId("reload_button").addEventListener("click", () => location.reload());

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

    async function loadJson(url) {
        const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
        return response.json();
    }

    async function initialize() {
        byId("game").setAttribute("aria-busy", "true");
        showResult("Getting your workout ready…");
        try {
            const [emojis, settings] = await Promise.all([loadJson("./emoji.json"), loadJson("./params.json")]);
            if (!Array.isArray(emojis) || !emojis.length || !emojis.every((entry) =>
                typeof entry.emoji === "string" && entry.emoji.length > 0 &&
                typeof entry.category === "string" &&
                Array.isArray(entry.aliases) && entry.aliases.length > 0 &&
                entry.aliases.every((alias) => typeof alias === "string" && alias.length > 0)
            )) throw new Error("Invalid emoji data");
            params = settings;
            pools = {};
            for (const name of levels) {
                const config = params?.[name];
                if (!config || !Number.isFinite(config.hint_ratio) || config.hint_ratio < 0 ||
                    config.hint_ratio > 1 || !Array.isArray(config.categories) ||
                    !config.categories.every((category) => typeof category === "string")) {
                    throw new Error(`Invalid settings for ${name}`);
                }
                pools[name] = emojis.filter((entry) => config.categories.includes(entry.category));
                if (!pools[name].length) throw new Error(`No eligible emoji for ${name}`);
            }
            const savedLevel = readSaved("level");
            level = levels.includes(savedLevel) ? savedLevel : "easy";
            select.value = level;
            select.disabled = false;
            restartButton.disabled = false;
            start();
        } catch (error) {
            phase = "error";
            console.error("Could not initialize Emoji Trainer:", error);
            showResult("Unable to load game data. Check your connection and retry.", "error");
            byId("reload_button").hidden = false;
        } finally {
            byId("game").setAttribute("aria-busy", "false");
        }
    }

    initialize();
})();

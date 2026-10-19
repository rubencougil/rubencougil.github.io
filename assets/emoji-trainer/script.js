var emojis = [];
var params = [];
var level = "";

async function loadJson(url) {
    var response = await fetch(url);
    if (!response.ok) {
        throw new Error("Could not load " + url + ": " + response.status);
    }
    return response.json();
}

function displayLives(total, remaining) {
    document.getElementById('lives').innerHTML = "❤️ ".repeat(remaining) + "🤍 ".repeat(total - remaining);
}

function displayStats() {
    Object.keys(params).forEach(level => {
        var totalPlays = getCookie(level + '_total_plays');
        document.getElementById(level + '_display_total_plays').innerHTML = totalPlays ? totalPlays : 0;
        var bestScore = getCookie(level + '_best_score');
        document.getElementById(level + '_display_best_score').innerHTML = bestScore ? bestScore : 0;
    });
}

function getRandomEmoji(emojis) {
    var emoji;
    do {
        emoji = emojis[Math.random() * emojis.length | 0];
    } while (params[level]['categories'].includes(emoji['category']) == false)
    return emoji;
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setLevel(level) {
    var select = document.getElementById('select_level');
    var option;

    for (var i = 0; i < select.options.length; i++) {
        option = select.options[i];

        if (option.value == level) {
            option.selected = true;
        }
    }
}

(async () => {

    var emoji = {};
    var score = 0;
    var livesTotal = 5;
    var livesRemaining = 5;
    var nextTimeout;
    var answerInput = document.getElementById("input_answer");
    var submitButton = document.getElementById("input_submit");
    var levelSelect = document.getElementById("select_level");
    var outputResult = document.getElementById("output_result");
    var spinner = document.getElementById("spinner");
    var displayScore = document.getElementById("display_score");
    var displayHint = document.getElementById("display_hint");
    var blockHint = document.getElementById("block_hint");

    answerInput.disabled = true;
    submitButton.disabled = true;
    levelSelect.disabled = true;

    try {
        [emojis, params] = await Promise.all([
            loadJson('https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json'),
            loadJson('./params.json')
        ]);
    } catch (error) {
        console.error("Could not initialize Emoji Trainer:", error);
        outputResult.classList.add("alert-danger");
        outputResult.textContent = "Unable to load game data. Please reload to try again.";
        return;
    }
    levelSelect.disabled = false;

    submitButton.addEventListener("click", function (event) {
        event.preventDefault();
        submitAnswer(answerInput.value);
    });

    answerInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            submitAnswer(event.target.value)
        }
    });

    function setStats(level, score) {
        var totalPlays = getCookie(level + '_total_plays');
        setCookie(level + '_total_plays', totalPlays ? ++totalPlays : 1);

        var bestScore = getCookie(level + '_best_score');
        if ((!bestScore) || (score > bestScore)) {
            setCookie(level + '_best_score', score);
        }
    }

    function resetAnswer() {
        answerInput.value = "";
        outputResult.classList.remove("alert-danger", "alert-success");
        outputResult.innerHTML = "";
        spinner.innerHTML = "";
    }

    function submitAnswer(answer) {
        if (answerInput.disabled) {
            return;
        }
        answerInput.disabled = true;
        submitButton.disabled = true;
        if (emoji['aliases'].includes(answer.toLowerCase())) {
            displayScore.innerHTML = ++score;
            outputResult.classList.add("alert-success");
            outputResult.innerHTML = '👍'
        } else {
            outputResult.classList.add("alert-danger");
            outputResult.innerHTML = "❌ " + emoji['aliases'].join(" ,")
            if (livesRemaining > 0) {
                livesRemaining--;
            }
        }

        spinner.innerHTML = '<div class="spinner-border text-secondary text-center" role="status"></div>';
        nextTimeout = setTimeout(() => {
            resetAnswer();
            next()
        }, 2000)
    }

    document.getElementById("try_again_button").addEventListener('click', function (event) {
        location.reload();
    })

    levelSelect.addEventListener('change', function (event) {
        setCookie('level', event.target.value);
        start();
    });

    function next() {
        displayLives(livesTotal, livesRemaining);

        if (livesRemaining == 0) {
            var myModal = new bootstrap.Modal(document.getElementById('staticBackdrop'))
            document.getElementById('game_over_message').innerHTML = "🕹️ Your final Score is <h2>" + score + "</h2>"
            setStats(level, score);
            myModal.show();
            return;
        }

        emoji = getRandomEmoji(emojis)
        displayHint.innerHTML = "";
        document.getElementById("display_emoji").innerHTML = emoji["emoji"];
        answerInput.disabled = false;
        submitButton.disabled = false;
        answerInput.focus();

        if (params[level]['hint_ratio'] > 0) {
            blockHint.hidden = false;
            var hints = [];
            emoji['aliases'].forEach(element => {
                var hint = "";
                for (var i = 0; i < element.length; i++) {
                    if (Math.random() < params[level]['hint_ratio']) {
                        hint += element[i] + " ";
                    } else {
                        hint += "_ "
                    }
                }
                hints.push("\"" + hint + "\"");
            });
            displayHint.innerHTML = hints.join(" </p><p> ");
        } else {
            blockHint.hidden = true;
        }
    }

    function start() {
        clearTimeout(nextTimeout);
        resetAnswer();
        score = 0;
        displayScore.innerHTML = score;
        livesRemaining = livesTotal;
        level = getCookie('level') || levelSelect.value;
        setLevel(level);
        displayStats();
        next()
    }

    start();

})();
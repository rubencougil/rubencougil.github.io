var emojis = [];
var params = [];
var level = "";
var bestScore = [];

async function getEmojis() {
    return await fetch('https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json')
        .then((response) => response.json());
}

async function displayLives(total, remaining) {
    livesEmojis = "";
    for (var i = 0; i < remaining; i++) {
        livesEmojis += "❤️ ";
    }
    for (var i = 0; i < total - remaining; i++) {
        livesEmojis += "🤍 ";
    }
    document.getElementById('lives').innerHTML = livesEmojis;
}

async function getParams() {
    return await fetch('./params.json')
        .then((response) => response.json());
}

async function displayStats() {
    var params = await getParams();
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

function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
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

    document.getElementById('input_submit').addEventListener("click", function (event) {
        event.preventDefault();
        var answer = document.getElementById('input_answer').value;
        submitAnswer(answer);
    });

    document.getElementById('input_answer').addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            submitAnswer(event.target.value)
        }
    });

    function setStats(level, score) {
        var totalPlays = getCookie(level + '_total_plays');
        eraseCookie(level + '_total_plays');
        setCookie(level + '_total_plays', totalPlays ? ++totalPlays : 1);

        var bestScore = getCookie(level + '_best_score');
        if ((!bestScore) || (score > bestScore)) {
            eraseCookie(level + '_best_score');
            setCookie(level + '_best_score', score);
        }
    }

    function submitAnswer(answer) {
        document.getElementById("input_answer").disabled = true;
        document.getElementById("input_submit").disabled = true;
        if (emoji['aliases'].includes(answer.toLowerCase())) {
            document.getElementById("display_score").innerHTML = ++score;
            document.getElementById("output_result").classList.add("alert-success");
            document.getElementById("output_result").innerHTML = '👍'
        } else {
            document.getElementById("output_result").classList.add("alert-danger");
            document.getElementById("output_result").innerHTML = "❌ " + emoji['aliases'].join(" ,")
            if (livesRemaining > 0) {
                livesRemaining--;
            }
        }

        document.getElementById("spinner").innerHTML = '<div class="spinner-border text-secondary text-center" role="status"></div>';
        setTimeout(() => {
            document.getElementById("input_answer").value = "";
            document.getElementById("output_result").classList.remove("alert-danger");
            document.getElementById("output_result").classList.remove("alert-success");
            document.getElementById("output_result").innerHTML = "";
            document.getElementById("spinner").innerHTML = "";
            next()
        }, 2000)
    }

    document.getElementById("try_again_button").addEventListener('click', function (event) {
        location.reload();
    })

    document.getElementById("select_level").addEventListener('change', function (event) {
        level = event.target.value;
        next()
    })

    document.getElementById("select_level").addEventListener('change', function (event) {
        setCookie('level', event.target.value);
        start();
    });

    async function next() {

        if (livesRemaining == 0) {
            var myModal = new bootstrap.Modal(document.getElementById('staticBackdrop'))
            document.getElementById('game_over_message').innerHTML = "🕹️ Your final Score is <h2>" + score + "</h2>"
            setStats(level, score);
            myModal.show();
        }

        params = await getParams();
        emoji = getRandomEmoji(emojis)
        displayLives(livesTotal, livesRemaining)
        document.getElementById("display_hint").innerHTML = "";
        document.getElementById("display_emoji").innerHTML = emoji["emoji"];
        document.getElementById("input_answer").disabled = false;
        document.getElementById("input_submit").disabled = false;
        document.getElementById("input_answer").focus();

        if (params[level]['hint_ratio'] > 0) {
            document.getElementById('block_hint').hidden = false;
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
            document.getElementById("display_hint").innerHTML = hints.join(" </p><p> ");
        } else {
            document.getElementById('block_hint').hidden = true;
        }
    }

    async function start() {
        emojis = await getEmojis();
        document.getElementById('display_score').innerHTML = 0;
        livesRemaining = livesTotal;
        await displayLives(livesTotal, livesRemaining);
        level = getCookie('level') ? getCookie('level') : document.getElementById("select_level").value;
        setLevel(level);
        await displayStats();
        next()
    }

    start();

})();
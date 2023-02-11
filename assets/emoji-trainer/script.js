var emojis = [];
var params = [];

var emoji = "";
var level = "";

async function getEmojis() {
    return await fetch('https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json')
        .then((response) => response.json());
}

async function displayLives(total, remaining) {
    livesEmojis = "";
    for (var i = 0; i < remaining; i++) {
        livesEmojis += "❤️";
    }
    for (var i = 0; i < total - remaining; i++) {
        livesEmojis += "🤍";
    }
    document.getElementById('lives').innerHTML = livesEmojis;
}

async function getParams() {
    return await fetch('./params.json')
        .then((response) => response.json());
}

function getRandomEmoji(emojis) {
    var emoji;
    do {
        emoji = emojis[Math.random() * emojis.length | 0];
    } while (params[level]['categories'].includes(emoji['category']) == false)
    return emoji;
}

(async () => {

    var emoji;
    //var score_wrong = 0;
    var score_right = 0;
    //var attempt = 0;
    var livesTotal = 5;
    var livesRemaining = 5;

    document.getElementById('input_submit').addEventListener("click", function (event) {
        event.preventDefault();
        //console.log("value")
        var answer = document.getElementById('input_answer').value;
        submitAnswer(answer);
    });

    document.getElementById('input_answer').addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            submitAnswer(event.target.value)
        }
    });

    function submitAnswer(answer) {
        //console.log(emoji['aliases'])
        //console.log(answer)
        document.getElementById("input_answer").disabled = true;
        document.getElementById("input_submit").disabled = true;
        if (emoji['aliases'].includes(answer.toLowerCase())) {
            document.getElementById("output_score_right").innerHTML = ++score_right;
            document.getElementById("output_result").classList.add("alert-success");
            document.getElementById("output_result").innerHTML = 'OK!'
        } else {
            //document.getElementById("output_score_wrong").innerHTML = ++score_wrong;
            document.getElementById("output_result").classList.add("alert-danger");
            document.getElementById("output_result").innerHTML = emoji['aliases'].join(" ,")
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

    async function next() {

        if (livesRemaining == 0) {
            var myModal = new bootstrap.Modal(document.getElementById('staticBackdrop'))
            document.getElementById('game_over_message').innerHTML = "🕹️ Your final Score is <h2>" + score_right + "</h2>"
            myModal.show();
        }

        params = await getParams();
        level = document.getElementById("select_level").value;
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

    async function main() {
        emojis = await getEmojis();
        await displayLives(livesTotal, livesRemaining);
        next()
    }

    main();

})();
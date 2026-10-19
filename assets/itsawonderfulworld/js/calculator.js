document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener('input', calculateScore);
});

function getScoreInputValue(id) {
    return parseInt(document.getElementById(id).value || 0);
}

function calculateScore() {
    var resultInput = document.getElementById("resultInput");
    resultInput.value = 0;

    var result = getScoreInputValue("grossVictoryPointsInput");
    ["science", "energy", "gold", "exploration", "generals", "financiers"].forEach(function (category) {
        var points = getScoreInputValue(category + "VictoryPointsInput");
        var multiplier = getScoreInputValue(category + "MultiplierInput");
        var categoryScore = points * multiplier;
        if (category === "generals" || category === "financiers") {
            categoryScore = points + categoryScore;
        }
        result += categoryScore;
    });

    resultInput.value = result;
}

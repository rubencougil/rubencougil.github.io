document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener('input', function (evt) {
        calculateScore();
    });
});

function calculateScore() {

    var resultInput = document.getElementById("resultInput")
    resultInput.value = 0;

    var gross = parseInt(document.getElementById("grossVictoryPointsInput").value || 0);
    var science = parseInt(document.getElementById("scienceVictoryPointsInput").value || 0);
    var scienceMult = parseInt(document.getElementById("scienceMultiplierInput").value || 0);
    var energy = parseInt(document.getElementById("energyVictoryPointsInput").value || 0);
    var energyMult = parseInt(document.getElementById("energyMultiplierInput").value || 0);
    var gold = parseInt(document.getElementById("goldVictoryPointsInput").value || 0);
    var goldMult = parseInt(document.getElementById("goldMultiplierInput").value || 0);
    var exploration = parseInt(document.getElementById("explorationVictoryPointsInput").value || 0);
    var explorationMult = parseInt(document.getElementById("explorationMultiplierInput").value || 0);
    var generals = parseInt(document.getElementById("generalsVictoryPointsInput").value || 0);
    var generalsMult = parseInt(document.getElementById("generalsMultiplierInput").value || 0);
    var financiers = parseInt(document.getElementById("financiersVictoryPointsInput").value || 0);
    var financiersMult = parseInt(document.getElementById("financiersMultiplierInput").value || 0);

    var result = (gross 
        + (science * scienceMult)
        + (energy * energyMult) 
        + (gold * goldMult) 
        + (exploration * explorationMult)
        + (generals + (generals * generalsMult))
        + (financiers + (financiers * financiersMult))
    );

    resultInput.value = result;
}

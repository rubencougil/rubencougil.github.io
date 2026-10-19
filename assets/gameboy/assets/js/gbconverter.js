function hex2rgb(colour) {
    if (colour.charAt(0) == "#") {
        colour = colour.substr(1);
    }

    return [
        parseInt(colour.substr(0, 2), 16),
        parseInt(colour.substr(2, 2), 16),
        parseInt(colour.substr(4, 2), 16)
    ];
}

$(document).ready(function () {
    $("#download-image").on("click", function (event) {
        event.preventDefault();
        var canvas = document.getElementById("canvas");
        window.location = canvas.toDataURL("image/png");
    });

    var imageLoader = document.getElementById("picture");
    imageLoader.addEventListener("change", handleImage, false);

    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var gb_palette_rgb = ["1f1f1f", "4e533d", "8b9570", "c3cfa1"].map(hex2rgb);

    function handleImage(e) {
        var reader = new FileReader();
        var imageObj = new Image();

        reader.onload = function (event) {
            imageObj.src = event.target.result;
        };

        reader.readAsDataURL(e.target.files[0]);


        imageObj.onload = function () {
            canvas.width = 308;
            canvas.height = 282;

            context.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
            var imageData = context.getImageData(0, 0, imageObj.width, imageObj.height);

            var pixels = imageData.data;
            var numPixels = pixels.length;

            for (var i = 0; i < numPixels; i += 4) {
                var closestIndex = 0;
                var closestDistance = Infinity;

                for (var j = 0; j < gb_palette_rgb.length; j++) {
                    var red = pixels[i] - gb_palette_rgb[j][0];
                    var green = pixels[i + 1] - gb_palette_rgb[j][1];
                    var blue = pixels[i + 2] - gb_palette_rgb[j][2];
                    var distance = red * red + green * green + blue * blue;
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = j;
                    }
                }

                var color = gb_palette_rgb[closestIndex];
                for (var channel = 0; channel < 3; channel++) {
                    pixels[i + channel] = color[channel] - (color[channel] % 64);
                }
                pixels[i + 3] = 255;
            }

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.putImageData(imageData, 0, 0);
        };
    }
});
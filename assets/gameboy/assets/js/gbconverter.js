function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function hex2rgb( colour ) {
        var r,g,b;
        if ( colour.charAt(0) == '#' ) {
                colour = colour.substr(1);
        }

        r = colour.charAt(0) + colour.charAt(1);
        g = colour.charAt(2) + colour.charAt(3);
        b = colour.charAt(4) + colour.charAt(5);
        
        r = parseInt( r,16 );
        g = parseInt( g,16 );
        b = parseInt( b ,16);
        return r+','+g+','+b;
}

function closestTo(number, set) {
    var closest = set[0];
    var prev = Math.abs(set[0] - number);

    for (var i = 1; i < set.length; i++) {
        var diff = Math.abs(set[i] - number);

        if (diff < prev) {
            prev = diff;
            closest = set[i];
        }
    }

    return closest;
}

Array.min = function( array ){
       return Math.min.apply( Math, array );
};

$(document).ready( function()
{
    $('#download-image').on('click', function(event){
        event.preventDefault();
        var canvas = document.getElementById('canvas');
        window.location = canvas.toDataURL("image/png");
    });

    var imageLoader = document.getElementById('picture');
    imageLoader.addEventListener('change', handleImage, false);

    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');

    function handleImage(e)
    {
        var reader = new FileReader();
        var imageObj = new Image();

        reader.onload = function(event){                
            imageObj.src = event.target.result;
        }

        reader.readAsDataURL(e.target.files[0]);

        if ( e.target.files[0].size  > 600000 )
        {
            alert( 'Sorry, but file size must be under 600KB');
        } 
        else
        {
            imageObj.onload = function() 
            {
            	canvas.width = 308;
            	canvas.height = 282;

                var maxWidth = canvas.width,
                    maxHeight = canvas.height,
                    imageWidth = 308,
                    imageHeight = 282;

                if (imageWidth > imageHeight) {
                  if (imageWidth > maxWidth) {
                    imageHeight *= maxWidth / imageWidth;
                    imageWidth = maxWidth;
                  }
                }
                else {
                  if (imageHeight > maxHeight) {
                    imageWidth *= maxHeight / imageHeight;
                    imageHeight = maxHeight;
                  }
                }	

            	context.drawImage(imageObj, ( canvas.width - imageWidth ) / 2, ( canvas.height - imageHeight ) / 2 , imageWidth, imageHeight);
            	imageData = context.getImageData(0, 0, imageObj.width, imageObj.height);

                var pixels = imageData.data;
                var numPixels = pixels.length;

                var pixels_w_alpha = new Array();

                for (var i = 0; i < numPixels; i++) 
                {
                	pixels_w_alpha.push( pixels[i] );
                	pixels_w_alpha.push( pixels[i+1] );
                	pixels_w_alpha.push( pixels[i+2] );
                	i = i+3;

                }

                var gb_palette_hex = new Array('1f1f1f', '4e533d', '8b9570', 'c3cfa1');
                //var gb_palette_hex = new Array('9bbc0f', '8bac0f', '306230', '0f380f');

                var gb_palette_rgb = new Array();
                var pixels_converted = new Array();   

                for (var j = 0; j < numPixels; j++) 
                {
            		var color_r = pixels_w_alpha[j]
            		var color_g = pixels_w_alpha[j+1]
            		var color_b = pixels_w_alpha[j+2]

            		var differenceArray=[];

            	    for (var i = 0; i < gb_palette_hex.length; i++) 
            	    {
            	    	gb_palette_rgb[i] = hex2rgb( gb_palette_hex[i] );
            	  		var base_colors_r = gb_palette_rgb[i].split(',')[0];
            	        var base_colors_g = gb_palette_rgb[i].split(',')[1];
            	        var base_colors_b = gb_palette_rgb[i].split(',')[2];

            	        differenceArray.push(Math.sqrt((color_r-base_colors_r)*(color_r-base_colors_r)+(color_g-base_colors_g)*(color_g-base_colors_g)+(color_b-base_colors_b)*(color_b-base_colors_b)));    	
            	    }

            		var lowest = Array.min(differenceArray);
            		var index = differenceArray.indexOf(lowest);
            		if ( index == -1 ) { index = 0; }
            		pixels_converted.push( parseInt( gb_palette_rgb[index].split(',')[0] ) );
            		pixels_converted.push( parseInt( gb_palette_rgb[index].split(',')[1] ) );
            		pixels_converted.push( parseInt( gb_palette_rgb[index].split(',')[2] ) );
            		pixels_converted.push( 255 );

            		j = j+2;

            	}

            	for (var i = 0; i < pixels_converted.length; i++) 
            	{
            		pixels[i] = pixels_converted[i];
            	}
                
                context.clearRect(0, 0, canvas.width, canvas.height);	
                
                for (var i = 0; i < numPixels; i++) 
                {
                    pixels[i*4] = pixels[i*4] - (pixels[i*4] % 64);
                    pixels[i*4+1] = pixels[i*4+1] - (pixels[i*4+1] % 64);
                    pixels[i*4+2] = pixels[i*4+2] - (pixels[i*4+2] % 64);
                }

                context.putImageData(imageData, 0, 0);	
            };
        }
    }
});
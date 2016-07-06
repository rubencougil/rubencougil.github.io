$(document).ready( function() {

    var IMAGE_X             = 0;
    var IMAGE_Y             = 0;
    var IMAGE_WIDTH         = 432;
    var IMAGE_HEIGH         = 814;
    var IMAGE_PATH          = './img/speeddating.jpg';

    var QUESTION_X          = 20;
    var QUESTION_Y          = 277;
    var ANSWER_X            = 410;
    var ANSWER_Y            = 540;
    var CONCLUSION_X        = 20;
    var CONCLUSION_Y        = 800;

    var CLEAR_QUESTION_X    = 0;
    var CLEAR_QUESTION_Y    = 255;
    var CLEAR_ANSWER_X      = 0;
    var CLEAR_ANSWER_Y      = 520;
    var CLEAR_CONCLUSION_X  = 0;
    var CLEAR_CONCLUSION_Y  = 780;

    var CLEAR_WIDTH         = 420;
    var CLEAR_HEIGH         = 35;

    var examples = {
        count: 9,
        0: {
            question:   "Star Wars or Star Trek?",
            answer:     "Firefly", 
            conclusion: "We are done! She is the One", 
        },
        1: {
            question:   "I die, what do you do?", 
            answer:     "Gather the Dragonballs",
            conclusion: "We are done! She is the One"
        },
        2: {
            question:   "Who's Zelda?",
            answer:     "The guy who wears green and sword",
            conclusion: "Next!"
        },
        3:{
            question:   "Where's my sandwich?",
            answer:     "Excuse me?",
            conclusion: "Next!"
        },
        4:{
            question:   "What's your favorite anime?",
            answer:     "What's anime?",
            conclusion: "Next!"
        },
        5:{
            question:   "What's your idea of a perfect date?",
            answer:     "Getting a new tattoo",
            conclusion: "We are done! She is the One"
        },
        6:{
            question:   "What's your favorite Avenger?",
            answer:     "Batman?",
            conclusion: "Next!"
        },
        7:{
            question:   "I die, what do you do?", 
            answer:     "Delete your browser history",
            conclusion: "We are done! She is the One"
        },
        8:{
            question:   "Batman or Superman?",
            answer:     "Goku",
            conclusion: "We are done! She is the one"
        }
    }


	var canvas = document.getElementById('sd-canvas'),
	context = canvas.getContext('2d');
 	base_image = new Image();
 	base_image.src = IMAGE_PATH;

    var textColor = '#777';

 	base_image.onload = function()
 	{
    	context.drawImage(base_image, IMAGE_X, IMAGE_Y, IMAGE_WIDTH, IMAGE_HEIGH);
    	
    	context.font = '13pt Calibri';
        setRandomExample( examples );        
		
    }

    $('#sd-form-question').keyup( function(){
    	context.textAlign = 'start';
        context.fillStyle = 'rgba(255,255,255,1)';
    	context.fillRect( CLEAR_QUESTION_X, CLEAR_QUESTION_Y, CLEAR_WIDTH, CLEAR_HEIGH );
        context.fillStyle = textColor;
    	context.fillText( $(this).val(), QUESTION_X, QUESTION_Y );
        $('#btn-download').attr( "href" , canvas.toDataURL("image/png") );
    });

    $('#sd-form-answer').keyup( function(){
    	context.textAlign = 'end';
        context.fillStyle = 'rgba(255,255,255,1)';
    	context.fillRect( CLEAR_ANSWER_X, CLEAR_ANSWER_Y, CLEAR_WIDTH, CLEAR_HEIGH );
        context.fillStyle = textColor;
    	context.fillText( $(this).val(), ANSWER_X, ANSWER_Y );
        $('#btn-download').attr( "href" , canvas.toDataURL("image/png") );
    });

    $('#sd-form-conclusion').change( function(){
    	context.textAlign = 'start';
        context.fillStyle = 'rgba(255,255,255,1)';
    	context.fillRect( CLEAR_CONCLUSION_X, CLEAR_CONCLUSION_Y, CLEAR_WIDTH, CLEAR_HEIGH );
        context.fillStyle = textColor;
    	context.fillText( $(this).find('option:selected').text(), CONCLUSION_X, CONCLUSION_Y );
        $('#btn-download').attr( "href" , canvas.toDataURL("image/png") );
    });

    $('#btn-download').click( function( event ) {
        event.preventDefault();
    });

    $('#btn-random-example').click( function( event ) {
        event.preventDefault();
        clearAll();
        setRandomExample();
    });   

    function clearAll()
    {
        context.fillStyle = 'rgba(255,255,255,1)';
        context.fillRect( CLEAR_QUESTION_X, CLEAR_QUESTION_Y, CLEAR_WIDTH, CLEAR_HEIGH );
        context.fillRect( CLEAR_ANSWER_X, CLEAR_ANSWER_Y, CLEAR_WIDTH, CLEAR_HEIGH );
        context.fillRect( CLEAR_CONCLUSION_X, CLEAR_CONCLUSION_Y, CLEAR_WIDTH, CLEAR_HEIGH );

    } 

    function setRandomExample()
    {

        var i = Math.floor( ( Math.random() * examples['count'] ) );
        context.fillStyle = textColor;
        context.textAlign = 'start';
        context.fillText( examples[i]['question'], QUESTION_X, QUESTION_Y );
        context.textAlign = 'end';
        context.fillText( examples[i]['answer'], ANSWER_X, ANSWER_Y );
        context.textAlign = 'start';
        context.fillText( examples[i]['conclusion'], CONCLUSION_X, CONCLUSION_Y );
        $('#btn-download').attr( "href" , canvas.toDataURL("image/png") );
    }

});
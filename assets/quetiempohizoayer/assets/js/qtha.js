var endpoint  = "http://api.worldweatheronline.com/free/v2/past-weather.ashx";
var api_key   = "6727cec2acbd1aa8095fa01b5f02a"

function geoLocation() {
  navigator.geolocation.getCurrentPosition(getWeather);
}

function initialize() {
  var input = document.getElementById('search');
  var autocomplete = new google.maps.places.Autocomplete(input);
}

function getWeather(position) {

  if (typeof position !== "string"){
   var position = (position.coords.latitude.toFixed(3) + ',' + position.coords.longitude.toFixed(3)); 
  }
   
   date = new Date();
   date.setDate(date.getDate() - 1);
   var yesterday_date = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate();

   $.ajax({
      url: endpoint,
      data: {
        "q": position,
        "tp": 24,
        "key": api_key,
        "format": "json",
        "date": yesterday_date
      },
      cache: false,
      type: "GET",
      success: function(response){
        var weather = response['data']['weather'][0];
        $('#weather_icon').attr("src", weather['hourly'][0]['weatherIconUrl'][0]['value']);

        console.log(weather);
          $('#weather').html(
            'GEOPOSITION: ' + position + "<br/>" +
            'DATE: ' + weather['date']  + "<br/>" +
            'MAXTEMP: ' + weather['maxtempC'] + "<br/>" +
            'MINTEMP: ' + weather['mintempC'] + "<br/>" +
            'DESC: ' + weather['hourly'][0]['weatherDesc'][0]['value'] + "<br />" +
            'HUMIDITY: ' + weather['hourly'][0]['humidity'] + "<br/>" +
            'PRECIP: ' + weather['hourly'][0]['precipMM'] + " mm <br/>"
          );
      },
      error: function(response) {
        console.log("error!");
      }
    });
}

$('document').ready(function(){

    geoLocation();
  google.maps.event.addDomListener(window, 'load', initialize);

  $('#search').keypress(function(event){
    if (event.which == 13) {
      getWeather($(this).val()); 
    }    
  });

    $('#search_go').on('click', function(){
        getWeather($('#search').val());
    });

});
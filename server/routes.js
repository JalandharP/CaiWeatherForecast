/*
* routes.js
*/

'use strict';

//===================================
// Module Scope Variant >>> Start
const
    currentURL = "http://api.openweathermap.org/data/2.5/weather",
    forecastURL = "http://api.openweathermap.org/data/2.5/forecast",
    //weatherIconURL = "http://openweathermap.org/img/w/",
    weatherIconURL = "https://www.metaweather.com/static/img/weather/",
    weatherIconPngURL = "https://www.metaweather.com/static/img/weather/png/",
    weatherMapURL = "https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&zoom=10",
    appID = "<Replace to your APP ID>",
    axios = require('axios'),
    moment = require("moment");

var
    configRoutes,
    recastMemory,
    getWeatherData,
    getWeatherIconID,
    isReplyList = false;

// Module Scope Variant <<< End
//===================================

//===================================
// Utility Method >>> Start

getWeatherData = function ( url ){
    return new Promise( function ( resolve, reject ){
        axios.get( url ).then( function( response ){
            resolve( response.data );
            console.log( response );
        })
        .catch( function ( error ) {
            reject( error );
            console.error( "Error was happened while accessing to weather API." );
        });
    });
};

getWeatherIconID = function( wIdNum ){
    switch ( wIdNum ){
        case "01":
            return "c";
            break;
        case "02":
            return "lc";
            break;
        case "03":
        case "04":
            return "hc";
            break;
        case "09":
        case "50": 
            return "lr";
            break;
        case "10":
            return "s";
            break;
        case "11":
            return "t";
            break;
        case "13":
            return "sn";
            break;
        default:
            return "Not Found";
    }
};

// Utility Method <<< End
//===================================


//===================================
// Public Method >>> Start

configRoutes = function( app, server )
{
	app.all( '/*', function ( request, response, next ){
        recastMemory = request.body.conversation.memory;
		next();
    });
	app.post( '/get_weather', async function( request, response ){
        var 
            isCurrentData = false,
            isReplyList = false,
            shouldProc = false,
            weatherWhen,
            weatherURL,
            weatherData,
            weatherIconID,
            weatherText,
            replyObj = {},
            weatherArray,
            replyMsgArray = [],
            tomorrow = moment().add( 1, "d" ).format( "YYYY-MM-DD" );
        
        // Check the data contents handed by Recast.
        weatherWhen = recastMemory.date.raw.toUpperCase();

        switch ( weatherWhen ){
            case "CURRENT":
                isCurrentData = true;
                shouldProc = true;
                break;
            case "TOMORROW":
                shouldProc = true;
                break;
            default:
                replyObj = {
                    type: "text",
                    content: "Current or Tommorow's weather can be processed.\nTry Again!"
                };
                replyMsgArray.push( replyObj );
        }

        if ( shouldProc ){
            weatherURL = ( isCurrentData ) ? currentURL : forecastURL;
            weatherURL += "?q=" + recastMemory.city.raw + ',' + recastMemory.city.country + "&units=metric&APPID=" + appID;
            
            // Get weather data from API synchronously.
            try{
                weatherData = await getWeatherData( weatherURL );
            }
            catch( err ){
                console.error( err );
            }
        }
        
        // If it could get the weather data, process the data.
        if ( weatherData && shouldProc ){
            if ( isCurrentData ){
                
                weatherIconID = getWeatherIconID( weatherData.weather[0].icon.slice(0, 2) );
                weatherText = weatherData.weather[0].description.charAt(0).toUpperCase() + weatherData.weather[0].description.slice(1);
                weatherText += ", Temperature is " + weatherData.main.temp + "℃ and humidity is " + weatherData.main.humidity + "%.";

                // Type = CARD
                replyObj = {
                   type: "card",
                   content: {
                       title: "Current weather of " + weatherData.name,
                       subtitle: weatherText,
                       //imageUrl: weatherIconURL + weatherData.weather[0].icon + ".png",
                       imageUrl: weatherIconURL + weatherIconID + ".svg",
                       buttons: [{
                           title: "Weather Map",
                           type: "web_url",
                           value: weatherMapURL + "&lat=" + weatherData.coord.lat + "&lon=" + weatherData.coord.lon
                       }]
                   }
                };
                
                replyMsgArray.push( replyObj );
            }
            else {
                isReplyList = true;
                weatherArray = weatherData.list;
                weatherArray.forEach( function( value ){
                    if ( value.dt_txt.slice(0, 10) === tomorrow ){
                        replyObj ={};

                        // Type = LIST
                        weatherIconID = getWeatherIconID( value.weather[0].icon.slice(0, 2) );
                        weatherText = value.weather[0].description.charAt(0).toUpperCase() + value.weather[0].description.slice(1);
                        weatherText += ", Temperature is " + value.main.temp + "℃ and humidity is " + value.main.humidity + "%.";

                        replyObj = {
                            title: value.dt_txt.slice(5) + " in " + weatherData.city.name,
                            subtitle: weatherText,
                            imageUrl:  weatherIconURL + weatherIconID + ".svg",
                            buttons : []
                        };

                        replyMsgArray.push( replyObj );
                    }
                });
            }
        }

        // Return message to Recat.
        if ( isReplyList ) {
            response.send({
                replies: [{
                    type: "list",
                    content: {
                        elements: replyMsgArray,
                        buttons: []
                    }
                }],
                conversation: {
                    memory: {}
                }
            });
        }
        else {
            response.send({
                replies: replyMsgArray,
                conversation: {
                    memory: {}
                }
            });
        }
    });

};


// Public Method <<< End
//===================================


//===================================
// Module Initialization >>> Start

module.exports = { configRoutes : configRoutes };

// Module Initialization <<< End
//===================================
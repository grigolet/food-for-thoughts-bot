const axios = require('axios');
const util = require('util');

axios.defaults.baseURL = "https://fft.aito.app";
axios.defaults.headers.common['x-api-key'] = 'jQYVvchC526H9iAFHL5f76VDpbf5yCEXSVEIcqra';
axios.defaults.headers.common['content-type'] = 'application/json';


async function submit_query(endpoint , query){
    return axios.post('/api/v1/_'+endpoint, query)
        .then( response => { return response.data })
        .catch( error => console.trace(error));
}

// query = {
//     "from":"restaurants",
//     "where": {
//         "Longitude":{ "$lt": max_lng ,  "$gte": min_lng },
//         "Latitude":{ "$lt": max_lat ,  "$gte": min_lat },
//    },
//    "limit": 100
// };

// axios.post(
//   .then(response => {
//     console.log(response.data);
//   })
//   .catch(error => {
//     console.log(error);
//   });


async function get_cuisine_list(limit=10){
    // Return list of most requested cuisine type
    query = {
        "from":"interaction",
        "predict" : 'Restaurant_ID.Cuisine',
        "limit": limit
    }   
    result = await submit_query('predict', query);

    cuisines = [ ]
    for (c of result['hits']){
        cuisines.push(c.feature);
    }
    //console.log(cuisines);
    return cuisines;
};


async function get_restaurants_suggestions( preferences_and_loc, limit=5){
    //   preferences_and_loc = [
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    // ]
    let sum_lat =0.;
    let sum_long = 0.;
    let users = [];
    for (user of preferences_and_loc){
        for (pref of user.preferences){
            users.push( {
                "User_ID": user.user_id,
               "Restaurant_ID.Cuisine": pref.preference
            });
        }
    
        sum_long+= user.location[1];
        sum_lat+= user.location[0];
    }
    let mean_lat = sum_lat / preferences_and_loc.length;
    let mean_long = sum_long / preferences_and_loc.length;

    const deltaL = 0.05

    let max_lat = mean_lat + deltaL;
    let min_lat = mean_lat - deltaL;
    let max_lng = mean_long + deltaL;
    let min_lng = mean_long - deltaL;

    query = {
        "from":  "interaction",
        "where": {
            "$on": [
                {
                    // Condizioni loose
                    "$atomic":{
                        "$or": users,
                        //"$or" : preferences
                    }
                    
                },
                { 
                    //Condizioni tight
                    "Restaurant_ID.Longitude":{ "$lt": max_lng ,  "$gte": min_lng },
                    "Restaurant_ID.Latitude":{ "$lt": max_lat ,  "$gte": min_lat },
                    "Like": 1,
                }
            ]
        }, 
        "match" : "Restaurant_ID",
        "limit": limit
    }
    console.log(util.inspect(query, false, null, true /* enable colors */))

    results = await submit_query('match', query);
    console.log(util.inspect(results, false, null, true /* enable colors */))

    return results;

}



async function send_feedback( feedback ){
    // feedback = {
        // chatId = {
        //     venue_id:
        //     {
        //         user: vote
        //     }
        // }
    // }
  //  /api/v1/data/{table}/batch
    data = [] 
    for (chat in  feedback){
        for (venue in chat){
            for (user in venue){
                f = {
                    "User_ID" : user,
                    "Like": venue[user],
                    "Restaurant_ID": venue
                };
                data.push(f);
            }
        }        
    }

    response = await axios.post("/api/v1/data/interaction/batch", data);
    return response

}



module.exports = {
    get_cuisine_list, get_restaurants_suggestions, send_feedback
}



// //"preference": "Asian" ,
// get_cuisine_list(30);
// get_restaurants_suggestions( [
//         {"userId" : "u3", "preference": "Swiss", "location":[6.114837, 46.217126]},//
//         {"userId" : "u4", "preference": "Fast Food", "location":[6.168395, 46.20]},
        // {"userId" : "u5", "location":[6.136118, 46.188817]},
        // {"userId" : "u3", "location":[6.136118, 46.188817]},
      //  {"userId" : "u5", "preference": "Japanese" , "location":[6.134118, 46.186817]}
//     ] 
// )


//


// feedback = [
//     {userId: Int, feedback : Int},
//     {userId: Int, feedback : Int}
//     {userId: Int, feedback : Int}

// ]

// Out = {
//     foursquare_id,
//     name,
//     url,
//     address,
//     city 
// }

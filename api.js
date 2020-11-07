require('dotenv').config()
const axios = require('axios');
const util = require('util');


axios.defaults.baseURL = process.env.AITO_API_INSTANCE;
axios.defaults.headers.common['x-api-key'] = process.env.AITO_API_KEY;
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
    let cuisines = [];
    for (user of preferences_and_loc){
        for (pref of user.preferences){
            cuisines.push( {
                "Restaurant_ID.Cuisine": pref
            });
        }
    
        sum_long+= user.location[1];
        sum_lat+= user.location[0];
    }
    let mean_lat = sum_lat / preferences_and_loc.length;
    let mean_long = sum_long / preferences_and_loc.length;

    const deltaL = 0.1

    let max_lat = mean_lat + deltaL;
    let min_lat = mean_lat - deltaL;
    let max_lng = mean_long + deltaL;
    let min_lng = mean_long - deltaL;

    query = {
        "from":  "interaction",
        "where": 
                { 
                    //Condizioni tight
                    // "Restaurant_ID.Longitude":{ "$lt": max_lng ,  "$gte": min_lng },
                    // "Restaurant_ID.Latitude":{ "$lt": max_lat ,  "$gte": min_lat },
                    "$atomic": { 
                        "$or": cuisines
                        }
                    
                },
            
        "goal":{"Like":1},
        "recommend" : "Restaurant_ID",
        "limit": limit
    }
    console.log(util.inspect(query, false, null, true /* enable colors */))

    results = await submit_query('recommend', query);
    console.log(util.inspect(results, false, null, true /* enable colors */))

    return results;

}



async function send_feedback( feedback ){
    // feedback = {
        // chatId = {
        //     venue_id:
        //     {
        //         user: "l"
        //     }
        // }
    // }
  //  /api/v1/data/{table}/batch
    let data;
    for (venue in feedback){
        for (user in venue){
            let like = false;
            if (venue[user] == "l") like=true;
            data = {
                "User_ID" : user,
                "Like": like,
                "Restaurant_ID": venue
            };
        }
    }        

    return axios.post("/api/v1/data/interaction", data)
        .then(response => response.data)
        .catch(err => console.error(err));

}



module.exports = {
    get_cuisine_list, get_restaurants_suggestions, send_feedback
}



// //"preference": "Asian" ,
// // get_cuisine_list(30);
// get_restaurants_suggestions( [
//         {"userId" : "u3", "preferences": ["Swiss"], "location":[6.114837, 46.217126]},//
//         {"userId" : "u4", "preferences": ["Fast Food"], "location":[6.168395, 46.20]},
      
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

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
    return cuisines;
};


async function get_restaurants_suggestions( preferences_and_loc ){
    //   preferences_and_loc = [
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    //     {userId : Int16Array, preference: Str[], location: [Float,Float]},
    // ]
    let sum_lat =0.;
    let sum_long = 0.;
    let users = [];
    let preferences = [];
    for (user of preferences_and_loc){
        users.push( {
            "User_ID":user.userId
        });
        if (! preferences.includes(user.preference)){
            preferences.push({ "Restaurant_ID.Cuisine" : user.preference});
        }
        sum_long+= user.location[0];
        sum_lat+= user.location[1];
    }
    let mean_lat = sum_lat / preferences_and_loc.length;
    let mean_long = sum_long / preferences_and_loc.length;

    const deltaL = 0.05

    let max_lat = mean_lat + deltaL;
    let min_lat = mean_lat - deltaL;
    let max_lng = mean_long + deltaL;
    let min_lng = mean_long - deltaL;

    while(true){
        query = {
            "from":  "interaction",
            "where": {
                "$on": [
                    {
                        // Condizioni loose
                        "Like": 1,
                        "$or": users,
                    },
                    { 
                        //Condizioni tight
                        "Restaurant_ID.Longitude":{ "$lt": max_lng ,  "$gte": min_lng },
                        "Restaurant_ID.Latitude":{ "$lt": max_lat ,  "$gte": min_lat },
                        "$or" : preferences
                    }
                ]
            }, 
            "match" : "Restaurant_ID",
            "limit":3
        }
        console.log(util.inspect(query, false, null, true /* enable colors */))

        results = await submit_query('match', query);
        console.log(util.inspect(results, false, null, true /* enable colors */))

        return results;
    }
}



async function send_feedback( venue_id, feedback ){
    // feedback = [
    //     {userId: Int, feedback : Int},
    //     {userId: Int, feedback : Int}
    //     {userId: Int, feedback : Int}
  //  /api/v1/data/{table}/batch
    data = [] 
    for (obj of feedback){
        f = {
            "User_ID" : obj.userId ,
            "Like": obj.feedback,
            "Restaurant_ID": venue_id
        };
        data.push(f);
    }

    response = await axios.post("/api/v1/data/interaction/batch", data);
    return response

}



module.exports = {
    get_cuisine_list, get_restaurants_suggestions, send_feedback
}



//get_cuisine_list(30);
get_restaurants_suggestions( [
        {"userId" : "u1", "preference": "Italian" , "location":[6.136118, 46.188817]},
        {"userId" : "u2", "preference": "Japanese" , "location":[6.134118, 46.186817]}
    ] 
)


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

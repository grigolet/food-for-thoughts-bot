const axios = require('axios');


axios.defaults.baseURL = "https://fft.aito.app";
axios.defaults.headers.common['x-api-key'] = 'jQYVvchC526H9iAFHL5f76VDpbf5yCEXSVEIcqra';
axios.defaults.headers.common['content-type'] = 'application/json';


query = {
    "from":"restaurants",
    "where": {
        "Longitude":{ "$lt": max_lng ,  "$gte": min_lng },
        "Latitude":{ "$lt": max_lat ,  "$gte": min_lat },
   },
   "limit": 100
};


axios.post('/api/v1/_search', query)
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.log(error);
  });



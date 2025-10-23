var Promise = require("Promise");

/**
  * FetchModel - Fetch a model from the web server.
  *     url - string - The URL to issue the GET request.
  * Returns: a Promise that should be filled
  * with the response of the GET request parsed
  * as a JSON object and returned in the property
  * named "data" of an object.
  * If the requests has an error the promise should be
  * rejected with an object contain the properties:
  *    status:  The HTTP response status
  *    statusText:  The statusText from the xhr request
  *
*/


function fetchModel(url) {
  return new Promise(function(resolve, reject) {
      const xhr = new XMLHttpRequest();
      
      //Initialize the request
      xhr.open("GET", url);

      //Set up what happens after the request loads
      xhr.onload = function() 
      {
        if(xhr.status == 200)
        {
            try{
              const responseJson = JSON.parse(xhr.responseText);
              resolve({data: responseJSON});
            }
            catch(error)
            {
              reject({status: xhr.status, statusText: "Invalid JSON Response"});
            }
        } 
        else
          {
            reject({status: xhr.status, statusText: xhr.statusText});
          }
      };

      // If theres no response, ie a network error
      xhr.onerror = function() 
      {
        reject({status: xhr.status, statusText: "Network Error"});
      };

      xhr.send;
  });
}

export default fetchModel;

var OPTIMIZELY_TOKEN_NAME = "optimizely_api_token";
var OPTIMIZELY_MESSAGES = "optimizely_messages";

/**
 * This function is executed when all project have been retreived from the API
 */
var projectSuccess = function (data) {
  for(var i = 0; i < data.length; i++){
    var project = data[i];
    var project_id = project.id;
    getExperimentList(project_id);
  }


};

/**
 * This function is executed when all experiment have been retreived from the API
 */
var experimentSuccess = function (d) {
  console.log(d);
};

/**
 * Get token value from input field, store it and return it.
 */
var getTokenInput = function(){
  var token = $("#tokeninput").val();
  Storage.set(OPTIMIZELY_TOKEN_NAME,token)
  return token;
}
var getTokenFromStorage = function(){
  return Storage.get(OPTIMIZELY_TOKEN_NAME);
}

/**
 * Add click event to submit token button and if token is saved, use that to start load.
 */
var initProjectList = function(){
  $("#tokeninput").val(getTokenFromStorage());
  var token = getTokenInput();
  if(token != ""){
    getProject(token);
  }

  $("#tokenbutton").click(function(){
    getProject(getTokenInput());
  });

}

/**
 * Do api call to retreive all project data
 */
var getProject = function(token){
  doAPICAll('https://www.optimizelyapis.com/experiment/v1/projects/', projectSuccess);
};

/**
 * Do api call to retreive all experiment data
 */
var getExperimentList = function(project_id){
    doAPICAll('https://www.optimizelyapis.com/experiment/v1/projects/' + project_id + '/experiments/', experimentSuccess);
}

/**
 * Set proper headers and do ajax call.
 */
var doAPICAll = function(url, func){
    jQuery.ajax({
        dataType: "json",
        url: url,
        headers: { 'Token': getTokenFromStorage() },
        success: func
    });  
}

/**
 * Store all messages
 */
var setMessages = function(messages){
  Storage.set(OPTIMIZELY_MESSAGES, JSON.stringify(messages));
}

/**
 * Save all messages
 */
var getMessages = function(){
  return JSON.parse(Storage.get(OPTIMIZELY_MESSAGES));
}

var initMessages = function(){
  $("#savemessages").click(function(){
    var messages = [];
    $(".message > textarea").each(function(i,e){
      messages.push($(e).val());
    });
    setMessages(messages);
  });

  var messages = getMessages();
}


$(function(){
  initProjectList();
  initMessages();
});

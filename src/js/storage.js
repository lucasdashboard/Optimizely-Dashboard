var OPTIMIZELY_TOKEN_NAME = "optimizely_api_token";
var OPTIMIZELY_MESSAGES = "optimizely_messages";
var OPTIMIZELY_EXPERIMENTS = "optimizely_experiments";
var OPTIMIZELY_PROJECTS = "optimizely_projects";

var Storage = {};
Storage.set = function(name, value){
  localStorage.setItem(name, value);
}


Storage.get = function(name){
  var val = localStorage.getItem(name);
  return typeof(val) == "undefined" || val === null ? "" : val;
}



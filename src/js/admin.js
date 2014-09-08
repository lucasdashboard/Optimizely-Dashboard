var OPTIMIZELY_TOKEN_NAME = "optimizely_api_token";
var OPTIMIZELY_MESSAGES = "optimizely_messages";
var OPTIMIZELY_EXPERIMENTS = "optimizely_experiments";
var OPTIMIZELY_PROJECTS = "optimizely_projects";

window.projects = {}
window.experiments = {}



var Project = function(id, name, experiments) {
    this.name = name;
    this.id = id;
    this.experiments = ko.observableArray(experiments);
    this.automaticSelect = ko.observable(getProjectMode(id));
    this.automaticSelect.subscribe(function(newValue) {

          addProject(id, newValue)
        }, this);
}
 
// The view model is an abstract description of the state of the UI, but without any knowledge of the UI technology (HTML)
var viewModel = {
    filterArchived: ko.observable(true),
    projects: ko.observableArray(),
    numexps: ko.observable(0),
    loaded: ko.observable(0),
    showRenderTimes: ko.observable(false),
    getProject : function(project_id){
      var project = {}
      for(var proj in this.projects()){
        if(this.projects()[proj].id == project_id){
          project = this.projects()[proj];
          break;
        }
      }
      return project;
    }
};
 
ko.applyBindings(viewModel);

/**
 * This function is executed when all project have been retreived from the API
 */
var projectSuccess = function (data) {
    
    
    for (var i = 0; i < data.length; i++) {
        var project = data[i];
        var project_id = project.id;
        window.projects[data[i].id] = data[i];
        getExperimentList(project_id);
    }


};

/**
 * This function is executed when all experiment have been retreived from the API
 */
var experimentSuccess = function (exps, textStats, jqXHR) {
    var experimentSorting = function(l, r) { 
        l = l.description.toLowerCase();
        r = r.description.toLowerCase();
        return l === r ? l > r ? 1 : -1 : l > r ? 1 : -1
      }
    var projectSorting = function(l, r) { 
        l = l.name.toLowerCase();
        r = r.name.toLowerCase();
        return l === r ? l > r ? 1 : -1 : l > r ? 1 : -1
      }
    var complete_projects = {}
    viewModel.loaded(2);
    for(var exp in exps){
      if((exps[exp].status != "Archived" || !viewModel.filterArchived())

       ){
        var name = window.projects[exps[exp].project_id].project_name;
        var id = exps[exp].project_id;


        
        exps[exp].check = ko.observable(getSavedExperiment(exps[exp].id))
        exps[exp].check.subscribe(function(newValue) {

          if(newValue){
            addExperiment(this.id);
          }else {
            removeExperiment(this.id);
          }
        }, exps[exp]);

        complete_projects[id] = complete_projects[id] || {};
        complete_projects[id]["exps"] = complete_projects[id]["exps"] || []; 
        complete_projects[id]["exps"].push(exps[exp]);
        complete_projects[id]["name"] = name;


        if(exps[exp].status == "Running"){
          viewModel.numexps(viewModel.numexps() + 1) 
        }
      }
      
    }
    //console.log(complete_projects)
    for(var id in complete_projects){
      

      project = new Project(id, complete_projects[id].name, complete_projects[id].exps.sort(experimentSorting))
      //console.log(project);
      viewModel.projects.push(project)
      viewModel.projects.sort(projectSorting);
    }
    
};



/**
 * Get token value from input field, store it and return it.
 */
var getTokenInput = function () {
    var token = $("#tokeninput").val();
    Storage.set(OPTIMIZELY_TOKEN_NAME, token)
    return token;
}
var getTokenFromStorage = function () {
    return Storage.get(OPTIMIZELY_TOKEN_NAME);
}

/**
 * Add click event to submit token button and if token is saved, use that to start load.
 */
var initProjectList = function () {
    $("#tokeninput").val(getTokenFromStorage());
    var token = getTokenInput();
    if (token != "") {
        getProject(token);
    }

    $("#tokenform").submit(function () {
      viewModel.projects([])
      viewModel.numexps(0);
      getProject(getTokenInput());
    });



}

var addExperiment = function(experiment_id){
  var experiments = Storage.get(OPTIMIZELY_EXPERIMENTS);
  if(experiments != ""){
    experiments = JSON.parse(experiments);
    if(experiments[experiment_id] == -1){
      experiments.push(experiment_id);
    }
    Storage.set(OPTIMIZELY_EXPERIMENTS, JSON.stringify(experiments));
  }else{
    Storage.set(OPTIMIZELY_EXPERIMENTS, JSON.stringify([experiment_id]))
  }
}

var getProjectMode  = function(project_id, mode){
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
     if(typeof(projects[project_id]) != "undefined"){
      return projects[project_id]["mode"];
    } else{
      addProject(project_id, "0");
      return "0";
    }
  } else {
      addProject(project_id, "0");
      return "0";    
  }
}

var addProject = function(project_id, mode){

  console.log(project_id);
  console.log(mode);
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);

    projects[project_id] = {"mode" : mode.toString()};
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects));
  }else{
    id = project_id.toString();
    projects = { id : {"mode": "0"}};
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects))
  }
}

var removeProject = function(project_id){
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
    delete projects[project_id];
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects));
    
  }
}



var removeExperiment = function(experiment_id){
  var experiments = Storage.get(OPTIMIZELY_EXPERIMENTS);
  if(experiments != ""){
    experiments = JSON.parse(experiments);
    var index = experiments.indexOf(experiment_id);
    if(index != -1){
      experiments.splice(index, 1);
      Storage.set(OPTIMIZELY_EXPERIMENTS, JSON.stringify(experiments));
    }
  }
}

var getSavedExperiment = function(experiment_id){
  var experiments = Storage.get(OPTIMIZELY_EXPERIMENTS);
  
  if(experiments != ""){

    experiments = JSON.parse(experiments);
    var result = experiments.indexOf(experiment_id.toString()) > -1;
    
    return result;
  } else {
    return false;
  }
}
/**
 * Do api call to retreive all project data
 */
var getProject = function (token) {
    viewModel.loaded(1);
    doAPICAll('https://www.optimizelyapis.com/experiment/v1/projects/', projectSuccess);
};

/**
 * Do api call to retreive all experiment data
 */
var getExperimentList = function (project_id) {
    doAPICAll('https://www.optimizelyapis.com/experiment/v1/projects/' + project_id + '/experiments/', experimentSuccess);
}

/**
 * Set proper headers and do ajax call.
 */
var doAPICAll = function (url, func) {
    return $.ajax({
        dataType: "json",
        url: url,
        headers: {
            'Token': getTokenFromStorage()
        },
        success: func
    });
}

/**
 * Store all messages
 */
var setMessages = function (messages) {
    Storage.set(OPTIMIZELY_MESSAGES, JSON.stringify(messages));
}

/**
 * Save all messages
 */
var getMessages = function () {
    return JSON.parse(Storage.get(OPTIMIZELY_MESSAGES));
}

var initMessages = function () {
    $("#savemessages").click(function () {
        var messages = [];
        $(".message textarea").each(function (i, e) {
            var message = $(e).val();
            if (message != "") {
                messages.push($(e).val());
            }
        });
        setMessages(messages);

    });

    var messages = getMessages();
    createMessageFields(messages);
    $(document).on("mousedown", ".add_field_button", function () {

        var newelem = $('<div/>', {
            html: $("#message-template").html(),
            class: "message"
        });
        $(newelem).find(".messagenum").html($("#messages > .message").length + 1);
        $("#messages").append($(newelem));

    });
}

var createMessageFields = function (messages) {
    if (messages.length == 0) {
        var newelem = $('<div/>', {
            html: $("#message-template").html(),
            class: "message"
        });
        $("#messages").append($(newelem));
    } else {
        for (var message in messages) {
            var newelem = $('<div/>', {
                html: $("#message-template").html(),
                class: "message"
            });
            $(newelem).find(".messagenum").html($("#messages > .message").length + 1);

            $(newelem).find(".text > textarea").val(messages[message]);

            $("#messages").append($(newelem));
        }


    }

}

var setupSelectBoxes = function(){
  $(document).on("mousedown", ".select", function(){
    checkBoxesWithStatus($(this));
  });
}

var checkBoxesWithStatus = function(elem){
    var status = getSelectAllStatus($(elem));
    var project_id = $(elem).attr("project-id");
    console.log(project_id);
    var project = viewModel.getProject(project_id)
    $(elem).toggleClass("checked")
    var checked = $(elem).hasClass("checked");

    console.log(project);
    for(var exp in project.experiments()){

      console.log(project.experiments()[exp]);
      console.log(status);
      if(shouldSelect(project.experiments()[exp], status)){
        project.experiments()[exp].check(checked);
      }
    }

}

var getSelectAllStatus = function(elem){
  return $(elem).attr("exp-status");
}

var shouldSelect = function(exp, status){
  if(status == "All"){
    return true;
  } else if (status == exp.status){
    return true;
  }else {
    return false
  }
}

$(function () {
    setupSelectBoxes();
    initProjectList();
    initMessages();
});



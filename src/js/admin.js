var OPTIMIZELY_TOKEN_NAME = "optimizely_api_token";
var OPTIMIZELY_MESSAGES = "optimizely_messages";
//var OPTIMIZELY_EXPERIMENTS = "optimizely_experiments";
var OPTIMIZELY_PROJECTS = "optimizely_projects";
var DEFAULT_PROJECT_MODE = "0";

var STATUS_RUNNING = 0;
var STATUS_PAUSED = 1;
var STATUS_DRAFT = 2;
var STATUS_ARCHIVED = 3;


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
    this.autmaticRunning = ko.observable(getProjectModeSetting(id, STATUS_RUNNING))
    this.autmaticRunning.subscribe(function(newValue) {
          setAutomaticMode(id, STATUS_RUNNING, newValue)
        }, viewModel);


    this.autmaticPaused = ko.observable(getProjectModeSetting(id, STATUS_PAUSED));
    this.autmaticPaused.subscribe(function(newValue) {
          setAutomaticMode(id, STATUS_PAUSED, newValue);
        }, viewModel);

    this.autmaticDraft = ko.observable(getProjectModeSetting(id, STATUS_DRAFT));
    this.autmaticDraft.subscribe(function(newValue) {
          setAutomaticMode(id, STATUS_DRAFT, newValue);
        }, viewModel);

    this.autmaticArchived = ko.observable(getProjectModeSetting(id, STATUS_ARCHIVED));
    this.autmaticArchived.subscribe(function(newValue) {
          setAutomaticMode(id, STATUS_ARCHIVED, newValue);
        }, viewModel);    
}

var getProjectModeSetting = function(id, status){
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
    projects[id]["automatic_modes"] = projects[id]["automatic_modes"] || {};    
    return typeof(projects[id]["automatic_modes"][status]) != "undefined" ?  projects[id]["automatic_modes"][status] : false;
  }
  console.log(false);
  return false;
}

var setAutomaticMode = function(project_id, status, value){
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
    if(typeof(projects[project_id]) != "undefined"){
      projects[project_id]["automatic_modes"] = projects[project_id]["automatic_modes"] || {};
      projects[project_id]["automatic_modes"][status] = value;
      Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects));
    }
  }
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


        
        exps[exp].check = ko.observable(getSavedExperiment(exps[exp].id, exps[exp].project_id));
        exps[exp].check.subscribe(function(newValue) {
          console.log(newValue);
          console.log(this.id);
          if(newValue){
            addExperiment(this);
          }else {
            removeExperiment(this);
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
    for(var id in complete_projects){
      

      project = new Project(id, complete_projects[id].name, complete_projects[id].exps.sort(experimentSorting))
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

var addExperiment = function(experiment){
  var experiment_id = experiment.id;
  var project_mode = viewModel.getProject(experiment.project_id).automaticSelect();
  var projects = addProject(experiment.project_id, project_mode);
  if(projects[experiment.project_id].hasOwnProperty("experiments")){
    if(projects[experiment.project_id]["experiments"].indexOf(experiment_id) == -1){
      projects[experiment.project_id]["experiments"].push(experiment_id);
    }
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects))
  }else{
    projects[experiment.project_id]["experiments"] = [experiment_id];
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects))
  }
}

var getProjectMode  = function(project_id){
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
     if(typeof(projects[project_id]) != "undefined"){
      return projects[project_id]["mode"];
    } else{
      return setDefaultProjectMode();
    }
  } else {
      return setDefaultProjectMode();    
  }
}

var setDefaultProjectMode = function(project_id){
  addProject(project_id, DEFAULT_PROJECT_MODE);
  return DEFAULT_PROJECT_MODE;
}

var getSavedProjects = function(project_id){
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
    return projects;
  } else {
      return {}; 
  }  
}

var addProject = function(project_id, mode){


  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  if(projects != ""){
    projects = JSON.parse(projects);
    if(projects.hasOwnProperty(project_id)){
      projects[project_id]["mode"] = mode.toString();
    } else {
      projects[project_id] = {"mode" : mode.toString()};
    }
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects));
  }else{
    id = project_id.toString();
    projects = { id : {"mode": mode}};
    Storage.set(OPTIMIZELY_PROJECTS, JSON.stringify(projects))
  }
  return projects;
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

var getSavedExperiment = function(experiment_id, project_id){
  var projects = getSavedProjects();
  
  if(projects.hasOwnProperty(project_id)){
    projects[project_id]["experiments"] = projects[project_id]["experiments"] || [];
    return projects[project_id]["experiments"].indexOf(experiment_id) > -1;
  } else {
    return false;
  }
}
/**
 * Do api call to retreive all project data
 */
var getProject = function (token) {
    viewModel.loaded(1);
    doAPICall('https://www.optimizelyapis.com/experiment/v1/projects/', projectSuccess);
};

/**
 * Do api call to retreive all experiment data
 */
var getExperimentList = function (project_id) {
    doAPICall('https://www.optimizelyapis.com/experiment/v1/projects/' + project_id + '/experiments/', experimentSuccess);
}

/**
 * Set proper headers and do ajax call.
 */
var doAPICall = function (url, func) {
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
  var messages = Storage.get(OPTIMIZELY_MESSAGES);
  messages = messages == "" ? [] : JSON.parse(messages);
  return messages;
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
    var project = viewModel.getProject(project_id)
    $(elem).toggleClass("checked")
    var checked = $(elem).hasClass("checked");

    for(var exp in project.experiments()){

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



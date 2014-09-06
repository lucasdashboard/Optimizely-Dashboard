var OPTIMIZELY_TOKEN_NAME = "optimizely_api_token";
var OPTIMIZELY_MESSAGES = "optimizely_messages";
var OPTIMIZELY_EXPERIMENTS = "optimizely_experiments";

window.projects = {}
window.experiments = {}



var Project = function(id, name, experiments) {
    this.name = name;
    this.id = id;
    this.experiments = ko.observableArray(experiments);
 
    this.addChild = function() {
        this.children.push("New child");
    }.bind(this);
}
 
// The view model is an abstract description of the state of the UI, but without any knowledge of the UI technology (HTML)
var viewModel = {
    filterArchived: ko.observable(true),
    projects: ko.observableArray(),
    numexps: ko.observable(0),
    loaded: ko.observable(0),
    showRenderTimes: ko.observable(false)
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


        exps[exp].saved = getSavedExperiment(exps[exp].id);

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
    $(document).on("change", ".experiment-id-checkbox", function(){
      var expid = $(this).attr("experiment_id");
      if($(this).prop('checked')){
        addExperiment(expid);
      } else {
        removeExperiment(expid);
      }
    });

}

var addExperiment = function(experiment_id){
  var experiments = Storage.get(OPTIMIZELY_EXPERIMENTS);
  if(experiments != ""){
    experiments = JSON.parse(experiments);
    if(experiments.indexOf(experiment_id) == -1){
      experiments.push(experiment_id);
    }
    Storage.set(OPTIMIZELY_EXPERIMENTS, JSON.stringify(experiments));
  }else{
    Storage.set(OPTIMIZELY_EXPERIMENTS, JSON.stringify([experiment_id]))
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


$(function () {
    initProjectList();
    initMessages();
});



var resultdata = {};
var var_to_exp_map = {};
var exp_to_proj_map = {};

var project_list = {};

var STATUS_RUNNING = 0;
var STATUS_PAUSED = 1;
var STATUS_DRAFT = 2;
var STATUS_ARCHIVED = 3;

var viewModel = {
    initLoading: ko.observable(true),
    loadingError: ko.observable(false),
    showRenderTimes: ko.observable(false)
};

ko.applyBindings(viewModel);

window.loaded_manual_experiments = false;
window.loaded_project_info = false;
window.loaded_auto_experiments = false;

var MANUAL_EXPERIMENTS = 0;
var AUTO_EXPERIMENTS = 1;
var PROJECT_INFO = 2;

var loadedData = function (data_segment) {
    if (data_segment == MANUAL_EXPERIMENTS) {
        window.loaded_manual_experiments = true;
    } else if (data_segment == AUTO_EXPERIMENTS) {
        window.loaded_auto_experiments = true;
    } else if (data_segment == PROJECT_INFO) {
        window.loaded_project_info = true;
    }
    if (loaded_manual_experiments && loaded_project_info && loaded_auto_experiments) {
        doneLoadingAllData();
        window.loaded_manual_experiments = false;
        window.loaded_project_info = false;
        window.loaded_auto_experiments = false;
    }
}

var loadData = function () {
    var projects = getSavedProjects();
    if (projects != {}) {
        downloadAllData(projects);

    } else {
        viewModel.loadingError(true);
        setTimeout(function () {
            var dir = location.href.match(/.*\//)[0];
            window.location.replace(location.href.match(/.*\//)[0] + "admin.html");
        }, 3000)
    }

}

var downloadAllData = function (projects) {
    for (var proj in projects) {
      if(projects[proj]["mode"] != "0"){
        project_list[proj] = {
            "mode": projects[proj]["mode"],
                "experiments": {},
                "saved_experiments": projects[proj]["experiments"],
                "automatic_modes": projects[proj]["automatic_modes"] || {}
        };

        downloadProjectInfo(proj);
        downloadExperiments(proj, projects[proj]);
      }
    }
}

var downloadExperiments = function (project_id, saved_project) {
    var automatic = 0 ;
    var manual = 0;
    if (saved_project["mode"] == "1" && saved_project["mode"]["experiments"].length > 0) {
        downloadExperimentList(project_id, saved_project["experiments"]);
        manual++;
    } else if (saved_project["mode"] == "2") {
        downloadAllProjectExperiments(project_id)
        automatic++;
    }


    if(automatic + manual == 0){
        viewModel.loadingError(true);
        setTimeout(function () {
            var dir = location.href.match(/.*\//)[0];
            window.location.replace(location.href.match(/.*\//)[0] + "admin.html");
        }, 3000)      
    } else {
        if (manual == 0){
          loadedData(MANUAL_EXPERIMENTS);
        }
        if (automatic == 0){
          loadedData(AUTO_EXPERIMENTS);
        }            
    }

}


var downloadExperimentList = function (project_id, experiment_ids) {
    var download_list = [];
    for (var exp_id in experiment_ids) {
        project_list[project_id]["experiments"][experiment_ids[exp_id]] = {
            "info": {},
            "goal_results": {}
        };
        exp_to_proj_map[experiment_ids[exp_id]] = project_id;
        download_list.push(downloadExperimentInfo(experiment_ids[exp_id]));

    }
    $.when.apply(null, download_list).done(function () {
        arguments = arguments.length >= 2 && arguments[1] == "success" ? [arguments] : arguments;

        for (var exp in arguments) {
            var experiment = arguments[exp][0];
            for (var variation in experiment.variation_ids) {
                var variation_id = experiment.variation_ids[variation];
                var_to_exp_map[variation_id] = experiment.id;
            }
            downloadExperimentResultsList(project_id, experiment_ids);

        }


    });
}
var downloadExperimentResultsList = function (project_id, experiment_ids) {
    var download_list = [];
    for (var exp_id in experiment_ids) {
        download_list.push(downloadExperimentResults(experiment_ids[exp_id]));
    }
    if(download_list.length == 0){
      loadedData(MANUAL_EXPERIMENTS);
    } else {}
      $.when.apply(null, download_list).done(function () {
          loadedData(MANUAL_EXPERIMENTS);
      });
    }
};


var doneLoadingAllData = function () {
    showPage();
}

var getSavedProjects = function (project_id) {
    var projects = Storage.get(OPTIMIZELY_PROJECTS);
    if (projects != "") {
        projects = JSON.parse(projects);
        return projects;
    } else {
        return {};
    }
}

var callBackForProject = function (data) {
    project_list[data.id]["info"] = data;
}
var callBackForExperimentInfo = function (data) {
  addExperimentInfoToProject(data);
}

var addExperimentInfoToProject = function (data){
  var project_id = data.project_id;
    project_list[project_id]["experiments"][data.id]["info"] = data
}

var callBackForExperimentResult = function (data) {
    for (var item in data) {
        var variation_result = data[item];
        var variation_id = variation_result.variation_id
        var exp_id = var_to_exp_map[variation_id];
        var proj_id = exp_to_proj_map[exp_id];
        var results = project_list[proj_id]["experiments"][exp_id]["goal_results"];
        results[variation_result["goal_id"]] = results[variation_result["goal_id"]] || {
            "variations": {}
        };
        results[variation_result["goal_id"]]["variations"][variation_id] = variation_result;


    }

}

var callBackForExperimentList = function (data) {
  var download_list = [];
    
    for(var i = 0; i < data.length; i++){
      var experiment = data[i];
      var project_id = data[i]["project_id"];
      var mode_running = project_list[data[i]["project_id"]]["automatic_modes"][STATUS_RUNNING];
      var mode_paused = project_list[data[i]["project_id"]]["automatic_modes"][STATUS_PAUSED];
      var mode_draft = project_list[data[i]["project_id"]]["automatic_modes"][STATUS_DRAFT];
      var mode_archived = project_list[data[i]["project_id"]]["automatic_modes"][STATUS_ARCHIVED];

      if(
        ((experiment.status == "Running" && mode_running) ||
        (experiment.status == "Paused" && mode_paused) ||
        (experiment.status == "Archived" && mode_archived) ||
        (experiment.status == "Not started" && mode_draft)) && project_list[project_id].saved_experiments.indexOf(parseInt(experiment.id)) == -1
        ){

        for (var variation in experiment.variation_ids) {
            var variation_id = experiment.variation_ids[variation];
            var_to_exp_map[variation_id] = experiment.id;
        }

        project_list[project_id]["experiments"][experiment.id] = {
            "info": {},
            "goal_results": {}
        };         
        exp_to_proj_map[experiment.id] = project_id;
        download_list.push(downloadExperimentResults(experiment.id));
     
        addExperimentInfoToProject(experiment);

      }
      if(download_list.length > 0){
        loadedData(AUTO_EXPERIMENTS);
      }else {}
        $.when.apply(null, download_list).done(function () {
          loadedData(AUTO_EXPERIMENTS);
        });
      }


    }
}



function downloadProjectInfo(project_id) {
  var download_list = [];
  download_list.push( )

    return 
}

function downloadExperimentInfo(exp_id) {

    return doAPICall('https://www.optimizelyapis.com/experiment/v1/experiments/' + exp_id, callBackForExperimentInfo);
}

function downloadExperimentResults(exp_id) {
    return doAPICall('https://www.optimizelyapis.com/experiment/v1/experiments/' + exp_id + '/results', callBackForExperimentResult);
}
/**
 * Do api call to retreive all experiment data
 */
var downloadAllProjectExperiments = function (project_id) {
    return doAPICall('https://www.optimizelyapis.com/experiment/v1/projects/' + project_id + '/experiments/', callBackForExperimentList);
}


var getTokenFromStorage = function () {
    return Storage.get(OPTIMIZELY_TOKEN_NAME);
}



var doAPICall = function (url, func) {

    if (func) {
        return $.ajax({
            dataType: "json",
            url: url,
            headers: {
                'Token': getTokenFromStorage()
            },
            success: func
        });
    } else {
        return $.ajax({
            dataType: "json",
            url: url,
            headers: {
                'Token': getTokenFromStorage()
            }
        });
    }


}

loadData();


function showPage() {
    viewModel.initLoading(false);
    $('.marquee > .text').marquee({
        //speed in milliseconds of the marquee
        duration: 15000,
        //gap in pixels between the tickers
        gap: 50,
        //time in milliseconds before the marquee will start animating
        delayBeforeStart: 0,
        //'left' or 'right'
        direction: 'left',
        //true or false - should the marquee be duplicated to show an effect of continues flow
        duplicated: true

    });
    l = new Chart(10);
}

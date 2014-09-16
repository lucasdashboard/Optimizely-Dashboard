var resultdata = {};
var var_to_exp_map = {};
var exp_to_proj_map = {};


var viewModel = {
    initLoading: ko.observable(true),
    loadingError: ko.observable(false),
    showRenderTimes: ko.observable(false)
};
 
ko.applyBindings(viewModel);



function loadData() {

    var experiments = Storage.get(OPTIMIZELY_EXPERIMENTS);
    var projects = Storage.get(OPTIMIZELY_PROJECTS);
    if (experiments != "" && projects != "") {
        experiments = JSON.parse(experiments);
        downloadAllExperimentInfo(experiments);
        
    } else {
        viewModel.loadingError(true);
        setTimeout(function () {
            var dir = location.href.match(/.*\//)[0];
            window.location.replace(location.href.match(/.*\//)[0] + "admin.html");
        }, 3000)
    }

}


var downloadAllExperimentInfo = function (experiments){
  var downloads = [];
  var result_project_downloads = [];
  var project_downloading = []

  for (var exp in experiments){
    downloads.push(downloadExperimentInfo(experiments[exp]))
    
  }
  var projects = Storage.get(OPTIMIZELY_PROJECTS);
  projects = JSON.parse(projects);

  $.when.apply(null, downloads).done(function(){
    console.log(arguments);
    arguments = arguments.length > 2 && arguments[1] == "success" ? [arguments[0]] : arguments;
    for(var argument in arguments){
      arg = arguments[argument];
      data = arg[0];
      
      console.log(data)
      project_id = data.project_id;
      exp_to_proj_map[data.id] = project_id;
      if(projects.hasOwnProperty(project_id) ){

        data["results_by_variation"] = {}
        for(var var_id in data.variation_ids){
          data["results_by_variation"][data.variation_ids[var_id]] = []
        }


        var exp_id = data.id;
        if(!resultdata.hasOwnProperty(data.project_id) ){
          
          resultdata[project_id] = {}
          resultdata[project_id]["mode"] =  projects[project_id]["mode"];
          resultdata[project_id]["experiments"] = {};
          resultdata[project_id]["experiments"][exp_id] = data;
        } else {
          resultdata[project_id]["experiments"][exp_id] = data;
        }
        for(var variation_id in data.variation_ids){
          var_to_exp_map[data.variation_ids[variation_id]] = data.id;
        }

        if(project_downloading.indexOf(project_id) == -1){
          result_project_downloads.push(downloadProjectInfo(project_id));
          project_downloading.push(project_id);
        }
        result_project_downloads.push(downloadExperimentResults(data.id));

      }

    }  
    $.when.apply(null, result_project_downloads).done(function(){
      doneLoadingAllData();
    });
    
  });


}

var doneLoadingAllData = function(){
  showPage();
}

var callBackForProject = function(data){
  for(var key in data){
    resultdata[data.id][key] = data[key];
  }
}

var callBackForExperimentResult = function(data){
  var result = -2;
  var primary_goal_id = 0;
  var winning_variation;
  var exp_id;
  var proj_id;
  for(var i = 0; i < data.length; i++){
    var goal_var = data[i];
    if(i == 0){
      exp_id = var_to_exp_map[goal_var.variation_id];
      proj_id = exp_to_proj_map[exp_id];
      primary_goal_id = resultdata[proj_id].experiments[exp_id]["primary_goal_id"]
    }
    resultdata[proj_id].experiments[exp_id]["results_by_variation"][goal_var.variation_id].push(goal_var);
    resultdata[proj_id].experiments[exp_id]["baseline_variation_id"] = goal_var["baseline_id"];




    if(goal_var["baseline_id"] != goal_var["variation_id"] && 
      goal_var["improvement"] > result &&
      (primary_goal_id == goal_var["goal_id"] || primary_goal_id == null)){
      result = goal_var["improvement"];
      winning_variation = goal_var["variation_id"];
    }

  }


  resultdata[proj_id].experiments[exp_id]["winning_variation_id"] = winning_variation || 0;
  

}


function downloadProjectInfo(project_id){
  return doAPICall('https://www.optimizelyapis.com/experiment/v1/projects/' + project_id, callBackForProject);
}

function downloadExperimentInfo(exp_id){
  return doAPICall('https://www.optimizelyapis.com/experiment/v1/experiments/' + exp_id);
}

function downloadExperimentResults(exp_id){
  return doAPICall('https://www.optimizelyapis.com/experiment/v1/experiments/'+ exp_id+'/results', callBackForExperimentResult);
}



var getTokenFromStorage = function () {
    return Storage.get(OPTIMIZELY_TOKEN_NAME);
}


var doAPICall = function (url) {
  
    return $.ajax({
        dataType: "json",
        url: url,
        headers: {
            'Token': getTokenFromStorage()
        }
    });
}

var doAPICall = function (url, func) {

    return $.ajax({
        dataType: "json",
        url: url,
        headers: {
            'Token': getTokenFromStorage()
        },
        success : func
    });
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

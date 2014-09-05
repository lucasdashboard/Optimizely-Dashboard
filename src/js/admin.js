var projectSuccessFunction = function (data) {
  for(var i = 0; i < data.length; i++){
    var project = data[i];
    var project_id = project.id;
    getExperimentList(project_id);
  }


};

var experimentSuccessFunction = function (d) {
  console.log(d);
};


var getTokenInput = function(){
  return $("#tokeninput").val();
}

var getProjectList = function(){
  $("#tokenbutton").click(function(){
    jQuery.ajax({
        dataType: "json",
        url: 'https://www.optimizelyapis.com/experiment/v1/projects/',
        headers: { 'Token': getTokenInput() },
        success: projectSuccessFunction
    });
  });
}

var getExperimentList = function(project_id){

    jQuery.ajax({
        dataType: "json",
        url: 'https://www.optimizelyapis.com/experiment/v1/projects/' + project_id + '/experiments/',
        headers: { 'Token': getTokenInput() },
        success: experimentSuccessFunction
    });
}

$(function(){
  getProjectList();

});

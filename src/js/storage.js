var Storage = {};
Storage.set = function(name, value){
  localStorage.setItem(name, value);
}
Storage.get = function(name){
  var val = localStorage.getItem(name);
  return typeof(val) == "undefined" || val === null ? "" : val;
}

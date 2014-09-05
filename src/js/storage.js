var Storage = {};
Storage.set = function(name, value){
  localStorage.setItem(name, value);
}
Storage.get = function(name){
  return localStorage.getItem(name);
}

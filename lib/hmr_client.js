var socketIOClient = require('socket.io-client');
var stripAnsi = require('strip-ansi');

var socketData = JSON.parse(__resourceQuery.slice(1));
console.log(socketData);

var socket = socketIOClient(socketData.root + socketData.namespace, {
  path: socketData.path
});

socket.on('connect', function() {
  console.log('connect');
});
socket.on('event', function(data) {
  console.log('event', data);
});
socket.on('disconnect', function() {
  console.log('disconnect');
});

var hot = false;
var currentHash = "";

socket.on("hot", function() {
  hot = true;
  console.log("[WDS] Hot Module Replacement enabled.");
});

socket.on("invalid", function() {
  console.log("[WDS] App updated. Recompiling...");
});

socket.on("hash", function(hash) {
  currentHash = hash;
  console.log('[WDS] hash ' + hash);
});

socket.on("still-ok", function() {
  console.log("[WDS] Nothing changed.")
});

socket.on("ok", function() {
  console.log('[WDS] ok');
  reloadApp();
});

socket.on("warnings", function(warnings) {
  console.log("[WDS] Warnings while compiling.");
  for(var i = 0; i < warnings.length; i++)
    console.warn(stripAnsi(warnings[i]));
  reloadApp();
});

socket.on("errors", function(errors) {
  console.log("[WDS] Errors while compiling.");
  for(var i = 0; i < errors.length; i++)
    console.error(stripAnsi(errors[i]));
  reloadApp();
});

socket.on("disconnect", function() {
  console.error("[WDS] Disconnected!");
});

function reloadApp() {
  if (hot) {
    console.log("[WDS] App hot update...");
    window.postMessage("webpackHotUpdate" + currentHash, "*");
  } else {
    console.log("[WDS] App updated. Reloading...");
    window.location.reload();
  }
}
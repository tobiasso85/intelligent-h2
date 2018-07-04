console.log("load randomNumber.js asynchronously with a 200ms delay");

setTimeout(function() {

	jQuery.ajax({url: "randomNumber.js"});
}, 200);

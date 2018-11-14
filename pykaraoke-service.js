exports.Hermes = function () {
    this.actions = {};
    this.subscribe = function (act,fn) {
	this.actions[act] = (this.actions[act] || []).push(fn);
    };
    this.publish = function (act,arg) {
	this.actions[act] && this.actions[act].map(function (fn) {
	    fn(arg);
	});
    };
};
    
exports.Host = function () {
    this.songList = [];
    this.signUp = function (arr) {this.songList.push(arr);};
};



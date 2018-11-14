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

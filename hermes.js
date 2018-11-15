exports.Hermes = function () {
    this.actions = {};
    this.subscribe = function (act,fn) {
	this.actions[act] = (this.actions[act] !== undefined) ? this.actions[act].concat([fn]) : [].concat([fn]);
    };
    this.publish = function (act,arg) {
	this.actions[act] !== undefined && this.actions[act].map(function (fn) {
	    fn(arg);
	});
    };
};

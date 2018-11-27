const http = require('http');
const R = require('ramda');
const fs = require('fs');
const {exec} = require('child_process');
const {parse} = require('url');
const os = require('os');
const hermes = require('./hermes');

const first = (arr) => arr[0];
const pluck = R.curry((key,arr) => arr.map((obj) => obj[key]));
const values = (obj) => Object.values(obj);
const filter4vPI = (arr) => arr.filter((val) => val.family == 'IPv4' && val.internal == false); 
const flatten = (arr) => arr.reduce((acc,cur) => acc.concat(cur));
const getIP = R.compose(first,pluck('address'),filter4vPI,flatten,values);

const readFile = ({url}) => new Promise((resolve,reject) => {fs.readFile(`.${url}`,(err,data) => {(err) ? reject(err) : resolve(data)})});
const sh = (cmd) => new Promise((resolve,reject) => {exec(cmd,(err,stdout,stderr) => (err) ? reject(stderr) : resolve(stdout))});

const writeResponse = R.curry((responseType,res,page) => {
    res.statusCode = 200;
    res.setHeader('Content-Type',`text/${responseType}`);
    res.write(page);
    res.end();
});

const echo = (val) => {console.log(`${val}`);return val;}; //echos value state for composition checking

const un_snake = (str) => str.replace(/_/g,' ');

const escapeBrackets = (str) => (str == '[' || str == ']') ? `\\${str}` : str;

const doubleEsc = (...chars) => (str) => chars.reduce((acc,val) => acc = acc.replace(new RegExp(escapeBrackets(val),'g'),`\\${val}`),str);

const parseQuery = ({url}) => parse(url,true);

const pullFields = ({query}) => [un_snake(query.term),query.field];

const pullSong = ({query}) => query.song;

const pullSinger = ({query}) => query.singer;

const singerString = R.compose(pullSinger,parseQuery);

const parseResponseType = ({url}) => 
    /(.html)$/.test(url) && 'html' ||
    /(.css)$/.test(url) && 'css' ||
    /(.js)$/.test(url) && 'javascript' ||
      'plain';

const songString = R.compose(doubleEsc(' ','[',']',"'",'&'),un_snake,pullSong,parseQuery);

const respond = R.compose(writeResponse,parseResponseType);

const searchFiles = ([term,field]) => (field === 'artist') ?
      sh(`ls ./HardDrive/Songs | grep -i -m 15 -e '${term}.*-.*\.cdg'`) :
      sh(`ls ./HardDrive/Songs | grep -i -m 15 -e '-.*${term}.*\.cdg'`);

const searchArtist = R.compose(searchFiles,pullFields,parseQuery);

function playSong ([singer,...rest]) {
    sh(`pykaraoke -f ./HardDrive/Songs/${singer.song}`)
	.then(function () {
	    host.hermes.publish('update',rest || []);
	    host.hermes.clear('update');
	    !rest.length && (host.activeRound = false);
	    rest.length && setTimeout(function() {host.hermes.publish('next',rest);},30000);
	})
	.catch((err) => {console.log(err);
			 !rest.length && (host.activeRound = false);			 
			 rest.length && host.hermes.publish('next',rest);
			});
}

function singer (req,res) {
    let singer = {
	name: singerString(req),
	song: songString(req),
    };
    return singer;
}

const updateList = R.curry(function (singer,list) {list.push(singer);}); 

const ip = getIP(os.networkInterfaces());
const port = 3000;

const host = {};
host.hermes = new hermes.Hermes();
host.signUp = function (singer) {host.hermes.subscribe('update',updateList(singer));};
host.hermes.subscribe('next',playSong);
host.activeRound = false;

const server = http.createServer((req,res) => {

    if (req.method === 'GET') {
	if (/\/search.*/.test(req.url)) {
	    searchArtist(req)
		.then(respond(req)(res))
		.catch((err) => writeResponse('plain',res,'No Results'));	
	}
	else if (/\/signup.*/.test(req.url)) {
	    if (host.activeRound == true) {
		host.signUp(singer(req,res));
	    }
	    else {
		host.activeRound = true;
		host.hermes.publish('next',[singer(req,res)]);
	    }
	}
	else {
	    if (req.url == '/') {req.url = '/index.html'}
	    readFile(req)
		.then(respond(req)(res))
		.catch(({message}) => writeResponse('html',res,
						`<main style='display:flex;
                                                              height:100vh;
                                                              width=100vw;
                                                              justify-content:center;
                                                              align-items:center;'>
                                                   <span style='color:red;
                                                                font-size:2em;'>
                                                     ${message}
                                                   </span>
                                                 </main`));

	}
    }
});
server.listen(port, () => {console.log(`server running at ${ip}:${port}`);});

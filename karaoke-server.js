const http = require('http');
const R = require('ramda');
const fs = require('fs');
const {exec} = require('child_process');
const {parse} = require('url');
const os = require('os');
const hermes = require('./hermes');

// helper functions and their composition to dynamically resolve server IP at runtime
const first = (arr) => arr[0]; // [a] -> a
const pluck = R.curry((key,arr) => arr.map((obj) => obj[key])); // str -> [{a:b}] -> [b]
const values = (obj) => Object.values(obj); // {a:b} -> [b] 
const filter4vPI = (arr) => arr.filter((val) => val.family == 'IPv4' && val.internal == false); 
const flatten = (arr) => arr.reduce((acc,cur) => acc.concat(cur)); // [[a]] -> [a]
const getIP = R.compose(first,pluck('address'),filter4vPI,flatten,values);

// async functions for file system interactions
const readFile = ({url}) => new Promise((resolve,reject) => { fs.readFile(`.${url}`,(err,data) => { (err) ? reject(err) : resolve(data) }) });
const sh = (cmd) => new Promise((resolve,reject) => { exec(cmd,(err,stdout,stderr) => (err) ? reject(stderr) : resolve(stdout)) });

// helper functions for strings
const echo = (val) => { console.log(`${val}`);return val; }; //echos value state for composition checking
const un_snake = (str) => str.replace(/_/g,' '); 
const escapeBrackets = (str) => (str == '[' || str == ']') ? `\\${str}` : str; 
const doubleEsc = (...chars) => (str) => chars.reduce((acc,val) => acc = acc.replace(new RegExp(escapeBrackets(val),'g'),`\\${val}`),str);

// helper functions for response handling and some compositions
const parseQuery = ({url}) => parse(url,true);
const pullFields = ({query}) => [un_snake(query.term),query.field];
const pullSong = ({query}) => query.song;
const pullSinger = ({query}) => query.singer;
const singerString = R.compose(pullSinger,parseQuery);
const songString = R.compose(doubleEsc(' ','[',']',"'",'&'),un_snake,pullSong,parseQuery);

// returns Content-Type for response headers for available resources
const parseResponseType = ({url}) => 
    /(.html)$/.test(url) && 'html' ||
    /(.css)$/.test(url) && 'css' ||
    /(.js)$/.test(url) && 'javascript' ||
      'plain';

// write and send response
const writeResponse = R.curry((responseType,res,page) => {
    res.statusCode = 200;
    res.setHeader('Content-Type',`text/${responseType}`);
    res.write(page);
    res.end();
});

// composition to respond to request for core resources. called respond(req)(res), will return function awaiting response body
const respond = R.compose(writeResponse,parseResponseType);

// async function to search song library dynamically with grep
const searchFiles = ([term,field]) => (field === 'artist') ?
      sh(`ls ./HardDrive/Songs | grep -i -m 15 -e '${term}.*-.*\.cdg'`) :
      sh(`ls ./HardDrive/Songs | grep -i -m 15 -e '-.*${term}.*\.cdg'`);

// composition from /search request to search results string
const searchArtist = R.compose(searchFiles,pullFields,parseQuery);

// main song loop. list-comprehension style, with side-effects. includes publish() event which results in recursive call
function playSong ([singer,...rest]) {
    sh(`pykaraoke -f ./HardDrive/Songs/${singer.song}`)
	.then(function () {
	    host.hermes.publish('update',rest || []);
	    host.hermes.clear('update');
	    console.log(`rest: ${rest}\nrounds: ${host.rounds}`);
	    !rest.length && !host.rounds.length && (host.activeRound = false);
	    !rest.length && host.rounds.length && setTimeout(function() {host.hermes.publish('next',host.rounds.pop());},3000);
	    rest.length && setTimeout(function() {host.hermes.publish('next',rest);},3000);
	})
	.catch((err) => {console.log(err);
			 !rest.length && (host.activeRound = false);			 
			 rest.length && host.hermes.publish('next',rest);
			});
}

function newLiner (list) {
    return list.reduce((acc,val) => acc + val.name + '\n','');
}

function getList (list) {
	host.list = newLiner(list);
    }

function singer (req) {
    let singer = {
	name: singerString(req),
	song: songString(req),
    };
    return singer;
}

const checkList = (str,arr) => arr.includes(str);
const flatPluck = (str) => R.compose(pluck(str),flatten);
const calcIndex = (str,arr) => arr.filter((e) => e == str).length;
const updateList = R.curry(function (singer,list) {
    (!checkList(singer.name,pluck('name',list))) ?
	list.push(singer) :
<<<<<<< HEAD
	(checkList(singer.name,flatPluck('name')(host.rounds)) && calcIndex(singer.name,flatPluck('name')(host.rounds)) < host.rounds.length ) ?
=======
	(host.rounds.length && checkList(singer.name,flatPluck('name')(host.rounds))) ?
>>>>>>> 025385add70b7b84f155f428d21e11bcf035b921
	    host.rounds[calcIndex(singer.name,flatPluck('name')(host.rounds))].push(singer) :
	    host.rounds.push([singer]);
});

function signUp (singer) {
    host.hermes.subscribe('update',updateList(singer));
}

const host = {};
host.hermes = new hermes();
host.activeRound = false;
host.list = null;
host.rounds = [];
host.hermes.subscribe('next',getList);
host.hermes.subscribe('next',playSong);

const server = http.createServer((req,res) => {

    if (req.method === 'GET') {
	if (/\/search.*/.test(req.url)) {
	    searchArtist(req)
		.then(respond(req)(res))
		.catch((err) => writeResponse('plain',res,'No Results'));	
	}
	else if (/\/list/.test(req.url)) {
	    (host.list) ? writeResponse('plain',res,host.list) : writeResponse('plain',res,'sign up now!');	    
	}
	else if (/\/signup.*/.test(req.url)) {
	    if (host.activeRound == true) {
		signUp(singer(req));
	    }
	    else {
		host.activeRound = true;
		host.hermes.publish('next',[singer(req)]);
	    }
	    (host.list) ?  writeResponse('plain',res,host.list) : writeResponse('plain',res,'sign up now!');	    

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

const ip = getIP(os.networkInterfaces());
const port = 3000;

server.listen(port, () => { console.log(`server running at ${ip}:${port}`); });

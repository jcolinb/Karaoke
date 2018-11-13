const http = require('http');
const R = require('ramda');
const fs = require('fs');
const {exec} = require('child_process');
const {parse} = require('url');

const readFile = ({url}) => new Promise((resolve,reject) => {fs.readFile(`.${url}`,(err,data) => {(err) ? reject(err) : resolve(data)})});

const sh = (cmd) => new Promise((resolve,reject) => {exec(cmd,(err,stdout,stderr) => (err) ? reject(stderr) : resolve(stdout))});

const writeResponse = R.curry((responseType,res,page) => {
    res.statusCode = 200;
    res.setHeader('Content-Type',`text/${responseType}`);
    res.write(page);
    res.end();
});

const unHump = (str) => str.replace('_',' ');

const parseQuery = ({url}) => parse(url,true);

const pullFields = ({query}) => [unHump(query.term),query.field];

const parseResponseType = ({url}) => 
    /(.html)$/.test(url) && 'html' ||
    /(.css)$/.test(url) && 'css' ||
    /(.js)$/.test(url) && 'javascript' ||
      'plain';

const searchFiles = ([term,field]) => (field === 'artist') ? sh(`ls ./HardDrive/Songs | grep -i -e '${term}.*-'`) : sh(`ls ./HardDrive/Songs | grep -i -e '-.*${term}'`) ;

const searchArtist = R.compose(searchFiles,pullFields,parseQuery);

const respond = R.compose(writeResponse,parseResponseType);

const delayResponse = () => new Promise((resolve,reject) => {setTimeout(resolve,10000);});

const server = http.createServer((req,res) => {

    if (req.method === 'GET') {
	if (/\/search.*/.test(req.url)) {
	    searchArtist(req)
		.then(respond(req)(res))
		.catch((err) => writeResponse('plain',res,'No Results'));	
	}
	else if (/\/signup.*/.test(req.url)) {
	    delayResponse().then(() => writeResponse('plain',res,'your turn!'));
	}
	else {
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
server.listen(3000, () => {console.log('server running...');});

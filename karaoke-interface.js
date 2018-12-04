const state = {
    name: '',
    waiting: false,
    songs: 0,
    freezeList: false
};

const snake_case = (str) => str.replace(/\s/g,'_');
const escapeAmpersand = (str) => str.replace(/&/g,'%26');
//const parseSongString = (song) => song && song.replace(/_/ig,' ');

const seperateArtist = (song) => song && song.split('-');

function buildListItem (song) {
    let [artist,version] = seperateArtist(song);
    let cleanSong = snake_case(escapeAmpersand(song));
    if (artist) {
	let entry = document.createElement('li');
	entry.innerHTML = (!version) ? `${artist}` : `${version} <span>by</span> ${artist}`;
	entry.addEventListener('click',() => signUp(cleanSong));
	results.append(entry);    
    }
}

function singerItem (singer,i) {
    if (singer) {
	let entry = document.createElement('li');
	i == 0 && (singer = `<span id='green'>${singer}</span>`);
	i == 1 && (singer = `<span id='red'>${singer}</span>`);
	entry.innerHTML = singer;
	results.append(entry);
    }
}

//const makeSongEntry = R.compose(buildListItem,seperateArtist);

function headsUp (list) {
    let arr = list.split('\n');
    if (state.name == arr[0] && state.waiting) {
	alert('time to sing!');
	state.waiting = false;
	state.songs--;
    }
    else {
	state.songs && (state.waiting = true)
    }
    return list;
}

function responseCheck (res) {
    if (res.ok) {
	return res;
    }
    else {
	throw Error('400 series error!');
    }
}

function listLoop () {
    if (!state.freezeList) { 
	fetch('/list',{method:'GET'})
	    .then(responseCheck)
	    .then((body) => body.text())
	    .then(headsUp)
	    .then(buildList(singerItem))	
	    .then(() => setTimeout(listLoop,3000));
    }
}

const buildList = (fn) => (str) => {
    let results = document.getElementById('results');
    results.innerHTML = '';
    str.split('\n').map(fn);
};

const updateSearch = (term,field) => {
    fetch(`/search?term=${snake_case(term.value)}&field=${field.value}`,{method:'GET'})
	.then(responseCheck)
	.then((body) => body.text())
	.then(buildList(buildListItem))
	.then(function () {state.freezeList = true;})
	.catch((err) => alert(err.message));
};

function signUp (song) {
    state.freezeList = false;
    let singer = prompt("Your Name: ",'');
    state.name = singer;
    state.waiting = true;
    state.songs++;
    fetch(`/signup?song=${song}&singer=${singer}`,{method:'GET',connection:'keep-alive'})
	.then(responseCheck)
	.then((body) => body.text())
	.then(headsUp)
	.then(buildList(singerItem))
	.then(listLoop);
};

let term = document.getElementById('search-term');
let field = document.getElementById('search-field');
document.getElementById('submit').addEventListener('click',() => updateSearch(term,field));

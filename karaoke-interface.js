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

//const makeSongEntry = R.compose(buildListItem,seperateArtist);

function responseCheck (res) {
    if (res.ok) {
	return res;
    }
    else {
	throw Error('400 series error!');
    }
};

function buildList (str) {
    let results = document.getElementById('results');
    results.innerHTML = '';
    str.split('\n').map(buildListItem);
}

const updateSearch = (term,field) => {
    fetch(`/search?term=${snake_case(term.value)}&field=${field.value}`,{method:'GET'})
	.then(responseCheck)
	.then((body) => body.text())
	.then(buildList)
	.catch((err) => alert(err.message));
};

function signUp (song) {
    let singer = prompt("Your Name: ","enter your name here");
    fetch(`/signup?song=${song}&singer=${singer}`,{method:'GET',connection:'keep-alive'})
	.then(responseCheck)
	.then((body) => body.text())
	.then((headsup) => alert(headsup));
};

let term = document.getElementById('search-term');
let field = document.getElementById('search-field');
document.getElementById('submit').addEventListener('click',() => updateSearch(term,field));

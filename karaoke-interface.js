const snake_case = (str) => str.replace(/\s/,'_');

//const parseSongString = (song) => song && song.replace(/_/ig,' ');

const seperateArtist = (song) => song && song.split('-');

function buildListItem ([artist,song]) {

    if (artist) {
	let entry = document.createElement('li');
	entry.innerHTML = (!song) ? `${artist}` : `${song} <span>by</span> ${artist}`;
	entry.addEventListener('click',() => signUp(song));
	results.append(entry);    
    }
}

const makeSongEntry = R.compose(buildListItem,seperateArtist);

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
    str.split('\n').map(makeSongEntry);
}

const updateSearch = (term,field) => {
    fetch(`/search?term=${snake_case(term.value)}&field=${field.value}`,{method:'GET'})
	.then(responseCheck)
	.then((body) => body.text())
	.then(buildList)
	.catch((err) => alert(err.message));
};

function signUp (song) {
    fetch(`/signup?song=${song}`,{method:'GET'})
	.then(responseCheck)
	.then((body) => body.text())
	.then((headsup) => alert(headsup));
};

let term = document.getElementById('search-term');
let field = document.getElementById('search-field');
document.getElementById('submit').addEventListener('click',() => updateSearch(term,field));

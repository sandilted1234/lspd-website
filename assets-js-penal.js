fetch('assets/data/penal_codes.json')
.then(res => res.json())
.then(data => {
const container = document.getElementById('penalContainer');
const search = document.getElementById('search');


function render(list) {
container.innerHTML = '';
list.forEach(c => {
container.innerHTML += `
<div class="card">
<h3>${c.code} - ${c.title}</h3>
<p>${c.description}</p>
<p><strong>Fine:</strong> $${c.fine}</p>
<p><strong>Jail:</strong> ${c.jail} months</p>
</div>`;
});
}


render(data);


search.addEventListener('input', e => {
const q = e.target.value.toLowerCase();
render(data.filter(c => c.title.toLowerCase().includes(q) || c.code.includes(q)));
});
});
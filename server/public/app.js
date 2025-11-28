/* app.js — Integrado: API (Mongo/Express) + localStorage + privacidad por alumno */

/* ================== CONFIG LOCALSTORAGE / KEYS ================== */

const DB = {
    booksKey: 'biblio_books_v1',
    newsKey: 'biblio_news_v1',
    attKey: 'biblio_att_v1',
    reqKey: 'biblio_reqs_v1'
};

const STUDENT_ID_KEY = 'biblio_student_id';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const generateNIP = () => Math.floor(1000 + Math.random() * 9000).toString();

function getStudentId() {
    let id = localStorage.getItem(STUDENT_ID_KEY);
    if (!id) {
        id = uid();
        localStorage.setItem(STUDENT_ID_KEY, id);
    }
    return id;
}

const load = k => JSON.parse(localStorage.getItem(k) || '[]');
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ================== CONFIG API (MODO B) ================== */

const USE_API = false; // pon true si ya tienes tu backend corriendo
const API_BASE = 'http://localhost:4000';

// token JWT sólo para admin
function getToken() { return localStorage.getItem('adminToken'); }
function setToken(t) { if (t) localStorage.setItem('adminToken', t); else localStorage.removeItem('adminToken'); }

async function apiFetch(path, opts = {}) {
    const headers = opts.headers || {};
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    opts.headers = headers;

    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`API ${opts.method || 'GET'} ${path} failed: ${res.status} ${text}`);
        err.status = res.status;
        throw err;
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
}
async function apiGet(path) { return apiFetch(path, { method: 'GET' }); }
async function apiPost(path, d) { return apiFetch(path, { method: 'POST', body: JSON.stringify(d) }); }
async function apiPut(path, d) { return apiFetch(path, { method: 'PUT', body: JSON.stringify(d) }); }
async function apiDelete(path) { return apiFetch(path, { method: 'DELETE' }); }

/* Estado en memoria (opcional, para API) */
let booksApi = [];
let newsApi = [];
let attendancesApi = [];
let requestsApi = [];

/* Cargar TODO desde API y guardar copia en localStorage */
async function loadAllFromApi() {
    try {
        const [b, n, a, r] = await Promise.all([
            apiGet('/api/books').catch(() => []),
            apiGet('/api/news').catch(() => []),
            apiGet('/api/attendance').catch(() => []),
            apiGet('/api/requests').catch(() => [])
        ]);

        booksApi = (b || []).map(x => ({
            id: x.id || x._id || x._id?.toString(),
            title: x.title || x.titulo,
            author: x.author || x.autor,
            carrera: x.carrera,
            semestre: x.semestre,
            genero: x.genero,
            desc: x.desc || x.descripcion,
            available: (typeof x.available !== 'undefined') ? x.available : x.disponible,
            fileName: x.fileName,
            fileData: x.fileData
        }));

        newsApi = (n || []).map(x => ({
            id: x.id || x._id || x._id?.toString(),
            title: x.title || x.titulo,
            body: x.body || x.cuerpo,
            ts: x.ts || x.fecha || x.createdAt
        }));

        attendancesApi = (a || []).map(x => ({
            id: x.id || x._id || x._id?.toString(),
            nombres: x.nombres,
            apellidos: x.apellidos,
            mat: x.mat || x.matricula || x.matricula,
            carrera: x.carrera,
            semestre: x.semestre,
            genero: x.genero,
            actividad: x.actividad,
            ts: x.ts || x.fecha || x.createdAt
        }));

        requestsApi = (r || []).map(x => ({
            id: x.id || x._id || x._id?.toString(),
            bookId: x.bookId?.id || x.bookId?._id || x.bookId,
            bookTitle: x.bookTitle || (x.bookId ? (x.bookId.titulo || x.bookId.title) : undefined),
            requesterName: x.requesterName,
            ts: x.ts || x.createdAt,
            returned: x.returned
        }));

        // Guardamos copia en localStorage para que el resto del código siga funcionando igual
        save(DB.booksKey, booksApi);
        save(DB.newsKey, newsApi);
        save(DB.attKey, attendancesApi);
        save(DB.reqKey, requestsApi);

    } catch (err) {
        console.error('Error cargando datos desde API, usando sólo localStorage', err);
        // si falla, dejamos que seedDemo() / datos locales se encarguen
    }
}

/* ================== DEMO LOCAL (si no hay API) ================== */

function seedDemo() {
    if (!load(DB.booksKey).length) {
        save(DB.booksKey, [
            { id: uid(), title: 'Biología del Desarrollo', author: 'A. Morales', carrera: 'Medicina', semestre: '6', genero: 'Ciencias', desc: 'Texto base', available: true },
            { id: uid(), title: 'Anatomía Humana', author: 'J. Pérez', carrera: 'Enfermería', semestre: '4', genero: 'Medicina', desc: 'Atlas básico', available: true },
            { id: uid(), title: 'Histología Básica', author: 'R. López', carrera: 'Medicina', semestre: '5', genero: 'Ciencias', desc: 'Figuras y tablas', available: true }
        ]);
    }
    if (!load(DB.newsKey).length) {
        save(DB.newsKey, [
            { id: uid(), title: 'Inicio de semestre', body: 'Bienvenido al semestre', ts: new Date().toISOString() },
            { id: uid(), title: 'Nuevos libros', body: 'Se añadieron 3 libros nuevos', ts: new Date().toISOString() }
        ]);
    }
    if (!load(DB.attKey).length) {
        save(DB.attKey, [
            { id: uid(), nombres: 'Ana', apellidos: 'Gómez', mat: 'A001', carrera: 'Medicina', semestre: '6', genero: 'F', actividad: 'Pregunta', ts: new Date().toISOString() },
            { id: uid(), nombres: 'Luis', apellidos: 'Ruiz', mat: 'A002', carrera: 'Enfermería', semestre: '4', genero: 'M', actividad: 'Práctica', ts: new Date().toISOString() }
        ]);
    }
    if (!load(DB.reqKey).length) save(DB.reqKey, []);
}

/* ================== HELPERS UI ================== */

const byId = id => document.getElementById(id);
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ================== NAV PRINCIPAL (dropdown, sin tab Admin) ================== */

function initNav() {
    const tabs = ['home', 'alumno'];

    const navToggle = byId('nav-toggle');
    const navMenu = byId('nav-menu');
    const navCurrent = byId('nav-current');

    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navMenu.classList.toggle('hidden');
        navToggle.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        navMenu.classList.add('hidden');
        navToggle.classList.remove('open');
    });

    navMenu.addEventListener('click', (e) => e.stopPropagation());

    tabs.forEach(t => {
        const btn = byId('tab-' + t);
        if (btn) {
            btn.addEventListener('click', () => {
                showTab(t);
                navMenu.classList.add('hidden');
                navToggle.classList.remove('open');
                const tabNames = { home: 'Inicio', alumno: 'Alumno' };
                navCurrent.textContent = tabNames[t];
            });
        }
    });

    byId('open-admin').addEventListener('click', () => showTab('admin'));
    byId('open-alumno').addEventListener('click', () => showTab('alumno'));
}

function showTab(name) {
    const sections = ['home', 'admin', 'alumno'];
    sections.forEach(n => {
        byId(n + '-section').classList.add('hidden');
        const tabBtn = byId('tab-' + n);
        if (tabBtn) tabBtn.classList.remove('active');
    });
    byId(name + '-section').classList.remove('hidden');
    const activeBtn = byId('tab-' + name);
    if (activeBtn) activeBtn.classList.add('active');
}

/* ================== ADMIN LOGIN (simple, con opción a API más adelante) ================== */

function initAdmin() {
    const loginForm = byId('admin-login');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = byId('admin-user').value.trim();
        const pass = byId('admin-pass').value;

        if (USE_API) {
            // login contra API
            try {
                const res = await apiPost('/api/login', { username: user, password: pass });
                if (!res || !res.ok || !res.token) {
                    alert(res && res.msg ? res.msg : 'Credenciales incorrectas');
                    return;
                }
                setToken(res.token);
                await loadAllFromApi();
                show(byId('admin-panel'));
                hide(byId('admin-login-card'));
                byId('show-library').click();
                renderAll();
                refreshStats();
            } catch (err) {
                console.error(err);
                alert('Error en login: ' + (err.message || err));
            }
        } else {
            // login local
            if (user === 'admin' && pass === '12345678') {
                show(byId('admin-panel'));
                hide(byId('admin-login-card'));
                byId('show-library').click();
                renderAll();
                refreshStats();
            } else alert('Credenciales incorrectas');
        }
    });

    byId('back-home').addEventListener('click', () => {
        showTab('home');
        hide(byId('admin-panel'));
        show(byId('admin-login-card'));
    });

    byId('show-library').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-library'));
        renderBooksTable();
        renderBooksTableAdmin();
    });

    byId('show-news').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-news'));
        renderNewsTable();
    });

    byId('show-attendance').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-attendance'));
        renderAttendanceTableAdmin();
    });

    byId('show-search').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-search'));
        renderStudentsTable();
        renderBooksTableAdmin();
    });

    byId('show-stats').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-stats'));
    });
}

function hideAdminSections() {
    ['admin-library', 'admin-news', 'admin-attendance', 'admin-search', 'admin-stats',
        'chart-carrera', 'chart-semestre', 'chart-genero'
    ].forEach(id => hide(byId(id)));
}

/* ================== BOOKS CRUD (localStorage) ================== */

function initBooks() {
    byId('save-book').addEventListener('click', async () => {
        const id = byId('b-id').value || uid();
        const title = byId('b-title').value.trim();
        if (!title) { alert('Título obligatorio'); return; }
        const book = {
            id,
            title,
            author: byId('b-author').value.trim(),
            carrera: byId('b-carrera').value.trim(),
            semestre: byId('b-semestre').value.trim(),
            genero: byId('b-genero').value.trim(),
            desc: byId('b-desc').value.trim(),
            available: true
        };
        const fileInput = byId('b-file');
        if (fileInput.files && fileInput.files[0]) {
            book.fileName = fileInput.files[0].name;
            book.fileData = await readFileAsBase64(fileInput.files[0]);
        }
        let books = load(DB.booksKey);
        const idx = books.findIndex(b => b.id === id);
        if (idx >= 0)
            books[idx] = Object.assign(books[idx], book);
        else
            books.unshift(book);

        save(DB.booksKey, books);

        alert('Libro guardado');
        byId('book-form').reset();
        byId('b-id').value = '';
        renderBooksTable();
        renderBooksTableAdmin();
        renderBooksResults();
        refreshStats();
    });

    byId('new-book').addEventListener('click', () => {
        byId('book-form').reset();
        byId('b-id').value = '';
    });

    byId('admin-search-book').addEventListener('input', (e) =>
        filterTableRows('#books-table', e.target.value)
    );
}

function readFileAsBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

function renderBooksTable() {
    const tbody = byId('books-table').querySelector('tbody');
    tbody.innerHTML = '';
    const books = load(DB.booksKey);

    books.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(b.title)}</td>
            <td>${escapeHtml(b.author || '')}</td>
            <td>${escapeHtml(b.carrera || '')}</td>
            <td>${escapeHtml(b.semestre || '')}</td>
            <td>${escapeHtml(b.genero || '')}</td>
            <td class="actions">
                <button class="small" onclick="editBook('${b.id}')">Editar</button>
                <button class="small ghost" onclick="deleteBook('${b.id}')">Eliminar</button>
            </td>`;
        tbody.appendChild(tr);
    });

    byId('stat-books').textContent = books.length;
}

function renderBooksTableAdmin() {
    const tbody = byId('books-table-admin').querySelector('tbody');
    tbody.innerHTML = '';
    load(DB.booksKey).forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author || '')}</td><td>${b.available ? 'Sí' : 'No'}</td>`;
        tbody.appendChild(tr);
    });
}

window.editBook = function (id) {
    const b = load(DB.booksKey).find(x => x.id === id);
    if (!b) return;

    byId('b-id').value = b.id;
    byId('b-title').value = b.title;
    byId('b-author').value = b.author || '';
    byId('b-carrera').value = b.carrera || '';
    byId('b-semestre').value = b.semestre || '';
    byId('b-genero').value = b.genero || '';
    byId('b-desc').value = b.desc || '';

    show(byId('admin-library'));
    byId('admin-library').scrollIntoView();
};

window.deleteBook = function (id) {
    if (!confirm('Eliminar libro?')) return;
    save(DB.booksKey, load(DB.booksKey).filter(x => x.id !== id));
    renderBooksTable();
    renderBooksTableAdmin();
    renderBooksResults();
    refreshStats();
};

/* ================== NEWS CRUD ================== */

function initNews() {
    byId('save-news').addEventListener('click', async () => {
        const id = byId('n-id').value || uid();
        const title = byId('n-title').value.trim();
        if (!title) { alert('Título requerido'); return; }
        const news = {
            id,
            title,
            body: byId('n-body').value.trim(),
            ts: new Date().toISOString()
        };
        const imgInput = byId('n-img');
        if (imgInput.files && imgInput.files[0])
            news.img = await readFileAsBase64(imgInput.files[0]);

        let arr = load(DB.newsKey);
        const idx = arr.findIndex(n => n.id === id);
        if (idx >= 0)
            arr[idx] = Object.assign(arr[idx], news);
        else
            arr.unshift(news);

        save(DB.newsKey, arr);

        alert('Noticia guardada');
        byId('news-form').reset();
        renderNewsTable();
        renderNewsHome();
        refreshStats();
    });

    byId('new-news').addEventListener('click', () => {
        byId('news-form').reset();
        byId('n-id').value = '';
    });
}

function renderNewsTable() {
    const tbody = byId('news-table').querySelector('tbody');
    tbody.innerHTML = '';
    load(DB.newsKey).forEach(n => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(n.title)}</td>
            <td>${new Date(n.ts).toLocaleString()}</td>
            <td>
                <button class="small" onclick="editNews('${n.id}')">Editar</button>
                <button class="small ghost" onclick="deleteNews('${n.id}')">Eliminar</button>
            </td>`;
        tbody.appendChild(tr);
    });

    byId('stat-news').textContent = load(DB.newsKey).length;
}

window.editNews = function (id) {
    const a = load(DB.newsKey).find(x => x.id === id);
    if (!a) return;

    byId('n-id').value = a.id;
    byId('n-title').value = a.title;
    byId('n-body').value = a.body || '';
    show(byId('admin-news'));
    byId('admin-news').scrollIntoView();
};

window.deleteNews = function (id) {
    if (!confirm('Eliminar noticia?')) return;
    save(DB.newsKey, load(DB.newsKey).filter(x => x.id !== id));
    renderNewsTable();
    renderNewsHome();
    refreshStats();
};

function renderNewsHome() {
    const dest = byId('news-list-home');
    dest.innerHTML = '';
    load(DB.newsKey).slice(0, 5).forEach(n => {
        const d = document.createElement('div');
        d.style.padding = '6px 0';
        d.innerHTML = `<strong>${escapeHtml(n.title)}</strong><div class="muted">${escapeHtml(n.body || '')}</div>`;
        dest.appendChild(d);
    });
}

/* ================== ATTENDANCE (Alumno) ================== */

function initAttendance() {
    byId('save-att').addEventListener('click', (e) => {
        e.preventDefault();

        const nombres = byId('a-nombres').value.trim();
        const apellidos = byId('a-apellidos').value.trim();
        if (!nombres || !apellidos) {
            alert('Nombres y apellidos obligatorios');
            return;
        }

        const rec = {
            id: uid(),
            nombres,
            apellidos,
            mat: byId('a-id').value.trim(),
            carrera: byId('a-carrera').value.trim(),
            semestre: byId('a-semestre').value.trim(),
            genero: byId('a-genero').value,
            actividad: byId('a-actividad').value.trim(),
            ts: new Date().toISOString()
        };

        let arr = load(DB.attKey);
        arr.unshift(rec);
        save(DB.attKey, arr);

        alert('Asistencia registrada');
        byId('asistencia-form').reset();
        renderAttendanceTable();
        renderRanking();
        renderStudentsTable();
        refreshStats();
    });

    byId('clear-att').addEventListener('click', () => byId('asistencia-form').reset());

    byId('filter-att').addEventListener('input', (e) =>
        filterTableRows('#att-table', e.target.value)
    );

    byId('export-csv').addEventListener('click', exportCSV);
}

function renderAttendanceTable() {
    const tbody = byId('att-table').querySelector('tbody');
    tbody.innerHTML = '';

    load(DB.attKey).forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(a.nombres + ' ' + a.apellidos)}</td>
            <td>${escapeHtml(a.carrera)}</td>
            <td>${escapeHtml(a.semestre)}</td>
            <td>${escapeHtml(a.genero)}</td>
            <td>${escapeHtml(a.actividad)}</td>
            <td>${new Date(a.ts).toLocaleString()}</td>`;
        tbody.appendChild(tr);
    });

    byId('stat-att').textContent = load(DB.attKey).length;
}

window.delAtt = function (id) {
    if (!confirm('Eliminar registro?')) return;
    save(DB.attKey, load(DB.attKey).filter(x => x.id !== id));
    renderAttendanceTable();
    renderAttendanceTableAdmin();
    renderRanking();
    refreshStats();
};

function renderRanking() {
    const map = {};
    load(DB.attKey).forEach(a => {
        const name = (a.nombres + ' ' + a.apellidos).trim();
        map[name] = (map[name] || 0) + 1;
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const dest = byId('ranking-list');
    dest.innerHTML = '';

    if (!entries.length) {
        dest.textContent = 'Sin registros';
    } else {
        const ol = document.createElement('ol');
        entries.forEach(([name, count]) => {
            const li = document.createElement('li');
            li.textContent = `${name} — ${count} participación(es)`;
            ol.appendChild(li);
        });
        dest.appendChild(ol);
    }
}

// tabla asistencias para admin
function renderAttendanceTableAdmin() {
    const tbody = byId('att-table-admin').querySelector('tbody');
    tbody.innerHTML = '';

    load(DB.attKey).forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(a.nombres + ' ' + a.apellidos)}</td>
            <td>${escapeHtml(a.carrera)}</td>
            <td>${escapeHtml(a.semestre)}</td>
            <td>${escapeHtml(a.genero)}</td>
            <td>${escapeHtml(a.actividad)}</td>
            <td>${new Date(a.ts).toLocaleString()}</td>
            <td><button class="small" onclick="delAtt('${a.id}')">Eliminar</button></td>`;
        tbody.appendChild(tr);
    });

    byId('filter-att-admin').addEventListener('input', (e) =>
        filterTableRows('#att-table-admin', e.target.value)
    );
}

/* ================== TABLA ALUMNOS (admin search) ================== */

function renderStudentsTable() {
    const tbody = byId('students-table').querySelector('tbody');
    tbody.innerHTML = '';

    const arr = load(DB.attKey);
    const seen = {};

    arr.forEach(s => {
        const key = (s.nombres + ' ' + s.apellidos + '|' + (s.mat || ''));
        if (seen[key]) return;
        seen[key] = true;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(s.nombres + ' ' + s.apellidos)}</td>
            <td>${escapeHtml(s.carrera)}</td>
            <td>${escapeHtml(s.semestre)}</td>
            <td>${escapeHtml(s.genero)}</td>`;
        tbody.appendChild(tr);
    });

    byId('search-students').addEventListener('input', (e) =>
        filterTableRows('#students-table', e.target.value)
    );
}

/* ================== BUSCAR / SOLICITAR LIBROS (Alumno) ================== */

function initStudentBookFeatures() {
    byId('search-books').addEventListener('input', (e) =>
        renderBooksResults(e.target.value.trim().toLowerCase())
    );
    renderBooksResults();
    renderStudentRequests();
}

function renderBooksResults(q = '') {
    const dest = byId('books-results');
    dest.innerHTML = '';

    const books = load(DB.booksKey);
    const filtered = books.filter(b => {
        const t = (b.title + ' ' + (b.author || '') + ' ' + (b.carrera || '') + ' ' + (b.genero || '')).toLowerCase();
        return !q || t.includes(q);
    });

    if (!filtered.length) {
        dest.textContent = 'Sin resultados';
    } else {
        filtered.forEach(b => {
            const div = document.createElement('div');
            div.style.padding = '6px 0';
            div.innerHTML = `
                <strong>${escapeHtml(b.title)}</strong>
                <div class="muted">${escapeHtml(b.author || '')} — ${escapeHtml(b.carrera || '')}</div>
                <div class="row" style="margin-top:6px">
                    <button class="small" ${b.available ? `onclick="requestBook('${b.id}')"` : 'disabled'}>${b.available ? 'Solicitar' : 'No disponible'}</button>
                    <button class="small ghost" ${b.fileData ? `onclick="downloadBook('${b.id}')"` : 'disabled'}>Descargar</button>
                </div>`;
            dest.appendChild(div);
        });
    }
}

function renderStudentRequests() {
    const dest = byId('student-requests');
    dest.innerHTML = '';

    const studentId = getStudentId();
    const allReqs = load(DB.reqKey);
    const reqs = allReqs.filter(r => r.studentId === studentId);

    if (!reqs.length) {
        dest.textContent = 'No tienes solicitudes activas';
    } else {
        reqs.forEach(r => {
            const b = load(DB.booksKey).find(x => x.id === r.bookId) || {};
            const div = document.createElement('div');
            div.style.padding = '6px 0';
            div.style.borderBottom = '1px solid #eef2ff';
            div.innerHTML = `
                <strong>${escapeHtml(b.title || 'Libro')}</strong><br>
                <small>Solicitado por: ${escapeHtml(r.requesterName)}</small><br>
                <small style="color: #4f46e5; font-weight: 600;">NIP: ${escapeHtml(r.nip || 'N/A')}</small>
                <div class="row" style="margin-top:6px">
                    <button class="small ghost" onclick="returnBook('${r.id}')">Devolver</button>
                </div>`;
            dest.appendChild(div);
        });
    }

    byId('stat-req').textContent = allReqs.length;
}

window.requestBook = function (bookId) {
    const name = prompt('Tu nombre completo para la solicitud:');
    if (!name || !name.trim()) {
        alert('Debes ingresar tu nombre para solicitar el libro');
        return;
    }

    let books = load(DB.booksKey);
    const idx = books.findIndex(x => x.id === bookId);
    if (idx < 0) return alert('Libro no encontrado');
    if (!books[idx].available) return alert('No disponible');

    const nip = generateNIP();
    const studentId = getStudentId();

    books[idx].available = false;
    save(DB.booksKey, books);

    const reqs = load(DB.reqKey);
    reqs.unshift({
        id: uid(),
        bookId,
        requesterName: name.trim(),
        nip: nip,
        studentId: studentId,
        ts: new Date().toISOString()
    });
    save(DB.reqKey, reqs);

    alert(`Solicitud registrada exitosamente\n\nTu NIP es: ${nip}`);
    renderBooksResults();
    renderBooksTableAdmin();
    renderStudentRequests();
    renderBooksTable();
    refreshStats();
};

window.returnBook = function (reqId) {
    let reqs = load(DB.reqKey);
    const r = reqs.find(x => x.id === reqId);
    if (!r) return alert('Solicitud no encontrada');

    const returnName = prompt('Ingresa tu nombre completo para devolver el libro:');
    if (!returnName || !returnName.trim()) {
        alert('Debes ingresar tu nombre para devolver el libro');
        return;
    }

    const returnNIP = prompt('Ingresa el NIP que recibiste al solicitar el libro:');
    if (!returnNIP || !returnNIP.trim()) {
        alert('Debes ingresar el NIP para devolver el libro');
        return;
    }

    const nameMatch = r.requesterName.toLowerCase().trim() === returnName.toLowerCase().trim();
    const nipMatch = r.nip === returnNIP.trim();

    if (!nameMatch || !nipMatch) {
        let errorMsg = 'Error en la validación:\n\n';
        if (!nameMatch)
            errorMsg += `- El nombre ingresado (${returnName}) no coincide con quien solicitó el libro (${r.requesterName})\n`;
        if (!nipMatch)
            errorMsg += `- El NIP ingresado es incorrecto\n`;
        alert(errorMsg);
        return;
    }

    if (!confirm('✓ Nombre y NIP correctos\n\n¿Confirmar devolución del libro?'))
        return;

    let books = load(DB.booksKey);
    const b = books.find(x => x.id === r.bookId);
    if (b) b.available = true;
    save(DB.booksKey, books);

    reqs = reqs.filter(x => x.id !== reqId);
    save(DB.reqKey, reqs);

    alert('✓ Devolución registrada exitosamente');
    renderStudentRequests();
    renderBooksResults();
    renderBooksTableAdmin();
    refreshStats();
};

window.downloadBook = function (bookId) {
    const b = load(DB.booksKey).find(x => x.id === bookId);
    if (!b || !b.fileData)
        return alert('Archivo no disponible');

    const a = document.createElement('a');
    a.href = b.fileData;
    a.download = b.fileName || 'libro';
    document.body.appendChild(a);
    a.click();
    a.remove();
};

/* ================== CHARTS ================== */

let chartCarrera, chartSemestre, chartGenero;

function initChartsNav() {
    byId('open-chart-carrera').addEventListener('click', () => {
        hideAdminSections();
        show(byId('chart-carrera'));
        drawChartCarrera();
    });

    byId('open-chart-semestre').addEventListener('click', () => {
        hideAdminSections();
        show(byId('chart-semestre'));
        drawChartSemestre();
    });

    byId('open-chart-genero').addEventListener('click', () => {
        hideAdminSections();
        show(byId('chart-genero'));
        drawChartGenero();
    });

    byId('back-stats-from-carrera').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-stats'));
    });
    byId('back-stats-from-semestre').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-stats'));
    });
    byId('back-stats-from-genero').addEventListener('click', () => {
        hideAdminSections();
        show(byId('admin-stats'));
    });
}

function drawChartCarrera() {
    const arr = load(DB.attKey);
    const map = {};
    arr.forEach(a => map[a.carrera] = (map[a.carrera] || 0) + 1);

    const ctx = byId('chart-carrera-canvas').getContext('2d');
    if (chartCarrera) chartCarrera.destroy();

    chartCarrera = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(map),
            datasets: [{ label: 'Asistencias', data: Object.values(map) }]
        }
    });
}

function drawChartSemestre() {
    const arr = load(DB.attKey);
    const map = {};
    arr.forEach(a => map[a.semestre] = (map[a.semestre] || 0) + 1);

    const ctx = byId('chart-semestre-canvas').getContext('2d');
    if (chartSemestre) chartSemestre.destroy();

    chartSemestre = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(map),
            datasets: [{ label: 'Asistencias', data: Object.values(map) }]
        }
    });
}

function drawChartGenero() {
    const arr = load(DB.attKey);
    const map = {};
    arr.forEach(a => map[a.genero] = (map[a.genero] || 0) + 1);

    const ctx = byId('chart-genero-canvas').getContext('2d');
    if (chartGenero) chartGenero.destroy();

    chartGenero = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(map),
            datasets: [{ label: 'Asistencias', data: Object.values(map) }]
        }
    });
}

/* ================== CSV EXPORT ================== */

function exportCSV() {
    const arr = load(DB.attKey);
    if (!arr.length) {
        alert('Sin registros');
        return;
    }

    const rows = [['Nombres', 'Apellidos', 'Matrícula', 'Carrera', 'Semestre', 'Género', 'Actividad', 'Fecha']];

    arr.forEach(r => {
        rows.push([
            r.nombres,
            r.apellidos,
            r.mat,
            r.carrera,
            r.semestre,
            r.genero,
            r.actividad,
            new Date(r.ts).toLocaleString()
        ]);
    });

    const csv = rows.map(r =>
        r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'asistencias.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/* ================== UTILS GENERALES ================== */

function filterTableRows(selector, q) {
    document.querySelectorAll(selector + ' tbody tr').forEach(tr => {
        tr.style.display = q ?
            (tr.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none')
            : '';
    });
}

function refreshStats() {
    byId('stat-books').textContent = load(DB.booksKey).length;
    byId('stat-news').textContent = load(DB.newsKey).length;
    byId('stat-att').textContent = load(DB.attKey).length;
    byId('stat-req').textContent = load(DB.reqKey).length;
}

function renderAll() {
    renderBooksTable();
    renderBooksTableAdmin();
    renderNewsTable();
    renderNewsHome();
    renderAttendanceTable();
    renderAttendanceTableAdmin();
    renderRanking();
    renderStudentRequests();
    renderBooksResults();
    renderStudentsTable();
}

/* ================== INIT ================== */

async function init() {
    if (USE_API) {
        await loadAllFromApi();
    } else {
        seedDemo();
    }

    initNav();
    initAdmin();
    initBooks();
    initNews();
    initAttendance();
    initStudentBookFeatures();
    initChartsNav();
    renderAll();
    refreshStats();
    setInterval(refreshStats, 2000);
}

init();

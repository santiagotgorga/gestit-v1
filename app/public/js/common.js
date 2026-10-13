// Utilidades compartidas por todas las pantallas de GestIT
// RNF-04: todo texto ingresado por usuarios se muestra escapado (esc) o vía textContent.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(v) { return v === null || v === undefined ? '' : String(v).replace(/[&<>"']/g, (c) => ESC[c]); }

async function api(method, url, body) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(url, opts); } catch (e) {
    return { ok: false, status: 0, data: { error: 'No se pudo conectar con el servidor. Verificá tu conexión.' } };
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
  // RF-01: sin sesión o sesión expirada -> al login
  if (res.status === 401 && !url.startsWith('/api/login')) {
    const motivo = data.codigo === 'SESION_EXPIRADA' ? 'expirada' : 'requerida';
    location.href = `/login?motivo=${motivo}&volver=${encodeURIComponent(location.pathname + location.search)}`;
    return new Promise(() => {}); // corta el flujo
  }
  return { ok: res.ok, status: res.status, data };
}

function claseEstado(e) { return 'estado estado-' + String(e).replace(/ /g, '-'); }
function badgeEstado(e) { return `<span class="${claseEstado(e)}" data-testid="badge-estado">${esc(e)}</span>`; }

let USUARIO = null;
async function iniciarLayout(seccion) {
  const r = await api('GET', '/api/sesion');
  USUARIO = r.data.usuario;
  const esAdmin = USUARIO.rol === 'Administrador';
  const items = [
    ['equipos', '/equipos', 'Equipos', true],
    ['categorias', '/categorias', 'Categorías', esAdmin],
    ['usuarios', '/usuarios', 'Usuarios', esAdmin],
    ['auditoria', '/auditoria', 'Auditoría', esAdmin],
  ];
  // HU-03: el menú sólo muestra lo que el rol puede usar (el servidor igual valida cada operación)
  document.getElementById('topbar').innerHTML = `
    <div class="marca">Gest<span>IT</span></div>
    <nav data-testid="menu-principal">
      ${items.filter((i) => i[3]).map((i) => `<a href="${i[1]}" data-testid="menu-${i[0]}" class="${i[0] === seccion ? 'activo' : ''}">${i[2]}</a>`).join('')}
    </nav>
    <div class="usuario">
      <span data-testid="usuario-actual">${esc(USUARIO.nombre)}</span>
      <span class="rol" data-testid="rol-actual">${esc(USUARIO.rol)}</span>
      <button class="btn link" data-testid="btn-cerrar-sesion" id="btnCerrarSesion">Cerrar sesión</button>
    </div>`;
  document.getElementById('btnCerrarSesion').addEventListener('click', async () => {
    await api('POST', '/api/logout');
    location.replace('/login?motivo=logout');
  });
  return USUARIO;
}

function alerta(el, tipo, texto) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!texto) { el.className = 'oculto'; el.textContent = ''; return; }
  el.className = `alerta ${tipo}`;
  el.textContent = texto;
}

// Muestra los errores de validación devueltos por la API junto al campo correspondiente (RNF-02)
function limpiarErrores(form) {
  form.querySelectorAll('.invalido').forEach((x) => x.classList.remove('invalido'));
  form.querySelectorAll('.error-campo').forEach((x) => { x.textContent = ''; });
}
function marcarErrores(form, campos) {
  limpiarErrores(form);
  Object.entries(campos || {}).forEach(([campo, msg]) => {
    const input = form.querySelector(`[name="${campo}"]`);
    if (input) input.classList.add('invalido');
    const e = form.querySelector(`[data-error="${campo}"]`);
    if (e) e.textContent = msg;
  });
}

// Mensajes que sobreviven a una redirección
function flash(tipo, texto) { try { sessionStorage.setItem('flash', JSON.stringify({ tipo, texto })); } catch (e) { /* */ } }
function leerFlash(el) {
  try {
    const f = JSON.parse(sessionStorage.getItem('flash') || 'null');
    sessionStorage.removeItem('flash');
    if (f) alerta(el, f.tipo, f.texto);
  } catch (e) { /* */ }
}

// RNF-02: confirmación explícita para acciones irreversibles o sensibles
function confirmar({ titulo, texto, boton = 'Confirmar', peligro = false }) {
  return new Promise((resolve) => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `
      <div class="modal" role="dialog" data-testid="modal-confirmacion">
        <h2>${esc(titulo)}</h2>
        <p>${esc(texto)}</p>
        <div class="acciones">
          <button class="btn sec" data-testid="btn-confirmar-cancelar">Cancelar</button>
          <button class="btn ${peligro ? 'peligro' : ''}" data-testid="btn-confirmar-aceptar">${esc(boton)}</button>
        </div>
      </div>`;
    document.body.appendChild(fondo);
    const cerrar = (v) => { fondo.remove(); resolve(v); };
    fondo.querySelector('[data-testid=btn-confirmar-cancelar]').onclick = () => cerrar(false);
    fondo.querySelector('[data-testid=btn-confirmar-aceptar]').onclick = () => cerrar(true);
  });
}

function paginacionHTML(p, prefijo) {
  if (p.total <= p.tamPagina) return `<span data-testid="${prefijo}-total">${p.total} resultado(s)</span><span></span>`;
  return `
    <span data-testid="${prefijo}-total">${p.total} resultados · Página <b data-testid="${prefijo}-pagina">${p.pagina}</b> de ${p.paginas}</span>
    <span class="fila">
      <button class="btn sec chico" data-testid="${prefijo}-anterior" data-pag="${p.pagina - 1}" ${p.pagina <= 1 ? 'disabled' : ''}>← Anterior</button>
      <button class="btn sec chico" data-testid="${prefijo}-siguiente" data-pag="${p.pagina + 1}" ${p.pagina >= p.paginas ? 'disabled' : ''}>Siguiente →</button>
    </span>`;
}

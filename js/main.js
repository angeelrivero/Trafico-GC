// ---------------------------------------------------------
// 0. CONFIGURACIÓN SUPABASE
// ---------------------------------------------------------

const SUPABASE_URL = 'https://wfoidmoojjqwcltcpyaf.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_xzIZVjCgxaTyOwS1lrjHpA_SzEOtaxq';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------
// LOGICA DE AUTENTICACIÓN
// ---------------------------------------------------------

// 1. REGISTRO (CON DETECCIÓN DE YA REGISTRADO)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Limpiamos espacios
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    // 2. Validación básica
    if (!email.includes('@') || !email.includes('.')) {
        alert("Por favor, introduce un email válido.");
        return;
    }

    // 3. Llamada a Supabase
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    // 4. Comprobamos si hubo error técnico
    if (error) {
        alert("Error al registrar: " + error.message);
        return;
    }

    // 5. Comprobar si es un duplicado
    // Si identities es un array vacío ([]), significa que el email ya existía
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        alert("¡Ese correo ya está registrado! Por favor, inicia sesión.");
        return;
    }

    // 6. Éxito
    alert("¡Cuenta creada correctamente! Ahora inicia sesión.");

    // Cerrar modal registro
    const registerModalEl = document.getElementById('registerModal');
    const modal = bootstrap.Modal.getInstance(registerModalEl);
    modal.hide();

    // Abrir modal login automáticamente
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
});

// 2. LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Error de acceso: " + error.message);
    } else {
        const loginModalEl = document.getElementById('loginModal');
        const modal = bootstrap.Modal.getInstance(loginModalEl);
        modal.hide();
    }
});

// 3. LOGOUT (Evento añadido al cargar el DOM)
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.log('Error logout:', error);
    else alert("Has cerrado sesión");
}

// Vinculamos el botón de logout al click, usando delegación o getElementById si existe en el DOM dinámicamente
// Nota: En el HTML le hemos puesto un onclick="logout()" pero es mejor usar event listeners. 
// Para mantener compatibilidad con tu estructura original, vinculamos el ID:
document.addEventListener('click', function(e){
    if(e.target && e.target.id == 'logoutBtn'){
        e.preventDefault();
        logout();
    }
});


// 4. ESCUCHAR CAMBIOS DE ESTADO (LOGIN/LOGOUT)
supabase.auth.onAuthStateChange((event, session) => {
    updateUI(session);
});

// Función para actualizar la UI (Navbar y Chat)
function updateUI(session) {
    // Elementos del Navbar
    const loginBtn = document.getElementById('nav-login-btn');
    const userProfile = document.getElementById('nav-user-profile');
    const userEmailDisplay = document.getElementById('user-email-display');

    // Elementos del Chat
    const chatLock = document.getElementById('chat-lock');
    const chatContent = document.getElementById('chat-content');

    if (session) {
        // --- USUARIO LOGUEADO ---
        loginBtn.classList.add('d-none');
        userProfile.classList.remove('d-none');
        userEmailDisplay.textContent = session.user.email.split('@')[0];

        // Chat
        chatLock.classList.add('d-none');
        chatContent.classList.remove('d-none');

    } else {
        // --- USUARIO NO LOGUEADO ---
        loginBtn.classList.remove('d-none');
        userProfile.classList.add('d-none');

        // Chat
        chatLock.classList.remove('d-none');
        chatContent.classList.add('d-none');
    }
}

// Verificar sesión al cargar página
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    updateUI(session);
}
checkSession();


// ---------------------------------------------------------
// 1. CONFIGURACIÓN: CÁMARAS Y TRAMOS DE CARRETERA
// ---------------------------------------------------------

const camerasData = [
    { id: 1, name: "GC1 Telde", level: 8, videoId: "KmcLujr7PU0" },
    { id: 2, name: "GC1 Jinamar", level: 7, videoId: "2vDowXZy9cc" },
    { id: 3, name: "GC2 Arucas", level: 5, videoId: "z1E5ciDe3a0" },
    { id: 4, name: "GC2 Bañaderos", level: 1, videoId: "XGzncIaJJ44" },
    { id: 5, name: "Mesa y López", level: 5, videoId: "gfsJIcCZzlI" },
    { id: 6, name: "La Ballena", level: 4, videoId: "ZVgz2e-wMR4" },
    { id: 7, name: "Siete Palmas", level: 3, videoId: "eMbMc7VnI5Q" },
    { id: 8, name: "Maspalomas Sur", level: 0, videoId: "xrYXDI5uAoA" }
];

const trafficSegments = [
    {
        name: "GC1 - Telde (Bajada)",
        origin: "28.016694, -15.405527",
        destination: "28.051912, -15.418465",
        level: 8 // ROJO
    },
    {
        name: "GC2 - Norte (Arucas)",
        origin: "28.129994, -15.462319",
        destination: "28.138446, -15.519003",
        level: 2 // VERDE
    },
    {
        name: "Mesa y Lopez (Ciudad)",
        origin: "28.132808, -15.440263",
        destination: "28.130386, -15.446860",
        level: 5 // NARANJA
    }
];

// ---------------------------------------------------------
// 2. GENERADOR DE GRID DE CÁMARAS
// ---------------------------------------------------------
const container = document.getElementById('cameras-container');

camerasData.forEach(cam => {
    let barColor = 'bg-success';
    if (cam.level >= 3) barColor = 'bg-warning';
    if (cam.level >= 7) barColor = 'bg-danger';
    if (cam.level == 10) barColor = 'bg-dark';

    const html = `
        <div class="col-12 col-md-6 col-lg-3"> 
            <div class="camera-card h-100"> 
                <div class="card-header">
                    <span>${cam.name}</span> <span class="badge ${barColor}">${cam.level}/10</span>
                </div>
                <div class="iframe-container">
                    <iframe 
                        src="https://www.youtube.com/embed/${cam.videoId}?autoplay=1&mute=1&playsinline=1&rel=0" 
                        title="Cámara Tráfico"
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="traffic-stats text-center">
                    <div class="progress" style="height: 6px; background: #333;">
                        <div class="progress-bar ${barColor}" role="progressbar" style="width: ${cam.level * 10}%"></div>
                    </div>
                    <small class="text-muted mt-1 d-block" style="font-size:10px;">Live Data: ThingSpeak</small>
                </div>
            </div>
        </div>
    `;
    container.innerHTML += html;
});

// ---------------------------------------------------------
// 3. MAPA GOOGLE
// ---------------------------------------------------------
// Definimos initMap en window para que la API de Google pueda encontrarla
window.initMap = function() {
    const granCanaria = { lat: 28.05, lng: -15.45 };

    const darkStyle = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
    ];

    const map = new google.maps.Map(document.getElementById("googleMap"), {
        zoom: 11,
        center: granCanaria,
        styles: darkStyle,
        disableDefaultUI: true
    });

    const directionsService = new google.maps.DirectionsService();

    function getColorByLevel(level) {
        if (level <= 2) return "#00FF00";
        if (level <= 6) return "#FFA500";
        if (level <= 9) return "#FF0000";
        return "#000000";
    }

    trafficSegments.forEach(segment => {
        const request = {
            origin: segment.origin,
            destination: segment.destination,
            travelMode: 'DRIVING'
        };

        directionsService.route(request, function (result, status) {
            if (status == 'OK') {
                const exactPath = result.routes[0].overview_path;
                const trafficPolyline = new google.maps.Polyline({
                    path: exactPath,
                    geodesic: true,
                    strokeColor: getColorByLevel(segment.level),
                    strokeOpacity: 0.8,
                    strokeWeight: 6
                });
                trafficPolyline.setMap(map);
            } else {
                console.error('Error ruta: ' + segment.name);
            }
        });
    });
}
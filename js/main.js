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
    const loginBtn = document.getElementById('nav-login-btn');
    const userProfile = document.getElementById('nav-user-profile');
    const userEmailDisplay = document.getElementById('user-email-display');
    const chatLock = document.getElementById('chat-lock');
    const chatContent = document.getElementById('chat-content');

    if (session) {
        // --- USUARIO LOGUEADO ---
        loginBtn.classList.add('d-none');
        userProfile.classList.remove('d-none');
        
        // Ponemos estado de carga inicial
        userEmailDisplay.textContent = "Cargando..."; 
        
        // Chat
        chatLock.classList.add('d-none');
        chatContent.classList.remove('d-none');

        // Cargar datos reales
        getProfile(session); 

    } else {
        // --- USUARIO NO LOGUEADO (LOGOUT) ---
        loginBtn.classList.remove('d-none');
        userProfile.classList.add('d-none');

        // Chat
        chatLock.classList.remove('d-none');
        chatContent.classList.add('d-none');

        // --- LIMPIEZA IMPORTANTE (NUEVO) ---
        // 1. Resetear nombre
        userEmailDisplay.textContent = "Usuario";
        
        // 2. Resetear foto: Si hay una imagen, la quitamos y volvemos a poner el icono original
        const navImg = document.querySelector('.nav-avatar');
        if (navImg) {
            navImg.outerHTML = '<i class="fas fa-user-circle"></i>';
        }
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



// ---------------------------------------------------------
// 5. GESTIÓN DE PERFIL (NUEVO)
// ---------------------------------------------------------

// Función para cargar datos del perfil (se llama al hacer login)
async function getProfile(session) {
    if (!session) return;
    const { user } = session;

    // Buscamos en la tabla 'profiles'
    const { data, error } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single();

    // Si hay datos (el usuario ya editó su perfil alguna vez o se creó automático)
    if (data) {
        // Actualizar nombre en navbar
        userEmailDisplay = document.getElementById('user-email-display');
        userEmailDisplay.textContent = data.username || user.email.split('@')[0];

        // Rellenar modal
        document.getElementById('profileUsername').value = data.username || '';
        document.getElementById('profileWebsite').value = data.website || '';
        
        // Gestionar Avatar
        if (data.avatar_url) {
            downloadImage(data.avatar_url);
        } else {
            // Si el usuario NO tiene avatar, nos aseguramos de que se vea el icono por defecto
            // (por si acaso hubiera quedado una imagen residual de otro usuario)
            const navImg = document.querySelector('.nav-avatar');
            if (navImg) {
                navImg.outerHTML = '<i class="fas fa-user-circle"></i>';
            }
        }
    } else {
        // CASO NUEVO: El usuario no tiene perfil todavía en la BD
        // Quitamos el "Cargando..." y mostramos su email
        document.getElementById('user-email-display').textContent = user.email.split('@')[0];
    }
}

// Helper para descargar/mostrar la imagen
async function downloadImage(path) {
    try {
        const { data, error } = await supabase.storage.from('avatars').download(path);
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        document.getElementById('avatarPreview').src = url; // En el modal
        
        // Actualizar icono del navbar (truco visual)
        // Buscamos el icono de usuario y lo reemplazamos por la imagen o le ponemos la imagen al lado
        const navIcon = document.querySelector('#nav-user-profile i.fa-user-circle');
        if(navIcon) {
            // Creamos imagen si no existe
            const imgHTML = `<img src="${url}" class="nav-avatar">`;
            const spanName = document.getElementById('user-email-display');
            // Reemplazamos el icono por la imagen
            navIcon.outerHTML = imgHTML;
        } else {
            // Si ya hay imagen, actualizamos src
            const navImg = document.querySelector('.nav-avatar');
            if(navImg) navImg.src = url;
        }

    } catch (error) {
        console.log('Error descargando imagen: ', error.message);
    }
}

// Listener para guardar el formulario de perfil
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById('saveProfileBtn');
    const spinner = document.getElementById('saveSpinner');
    
    // UI Loading
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) throw new Error("No hay usuario logueado");

        const username = document.getElementById('profileUsername').value;
        const website = document.getElementById('profileWebsite').value;
        const avatarFile = document.getElementById('avatarFile').files[0];
        
        let avatar_url = null;

        // 1. Si hay archivo seleccionado, lo subimos
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Subir a Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, { upsert: true });

            if (uploadError) throw uploadError;
            avatar_url = filePath;
        }

        // 2. Preparar objeto de actualización
        const updates = {
            id: user.id,
            username,
            website,
            updated_at: new Date(),
        };

        // Si subimos foto nueva, actualizamos el campo, si no, no lo tocamos
        // Para no borrar la foto vieja si el usuario solo cambió el nombre
        if (avatar_url) {
            updates.avatar_url = avatar_url;
        }

        // 3. Guardar en Base de Datos (Upsert = Update o Insert)
        let { error } = await supabase.from('profiles').upsert(updates);

        if (error) throw error;

        alert('¡Perfil actualizado!');
        
        // Recargar datos en la vista
        const { data: { session } } = await supabase.auth.getSession();
        getProfile(session);
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
        modal.hide();

    } catch (error) {
        alert("Error actualizando perfil: " + error.message);
    } finally {
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
});

// Previsualización rápida al seleccionar archivo (antes de subir)
document.getElementById('avatarFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const src = URL.createObjectURL(file);
        document.getElementById('avatarPreview').src = src;
    }
});


// ---------------------------------------------------------
// 6. LÓGICA DEL CHAT EN TIEMPO REAL
// ---------------------------------------------------------

const chatContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendChatBtn');

// URL base para imágenes públicas (para no gastar cuota firmando URLs en cada mensaje)
// OJO: Asegúrate de que tu bucket 'avatars' sea PÚBLICO en Supabase Storage
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/avatars/`;

// A. Función para renderizar un mensaje en HTML
function renderMessage(msg) {
    // Datos del usuario (gracias al join con profiles)
    const profile = msg.profiles || {};
    const username = profile.username || 'Usuario Anónimo';
    
    // Si tiene avatar, construimos la URL, si no, ponemos uno por defecto
    let avatarImg = '<i class="fas fa-user-circle fa-lg me-2"></i>'; // Icono por defecto
    if (profile.avatar_url) {
        avatarImg = `<img src="${STORAGE_URL}${profile.avatar_url}" class="chat-avatar" alt="User">`;
    }

    // Formatear hora (Solo HH:MM)
    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // HTML del mensaje
    const html = `
        <div class="forum-msg">
            <div class="d-flex align-items-center mb-1">
                ${avatarImg}
                <span class="chat-username">${username}</span>
                <small class="chat-time">${time}</small>
            </div>
            <div>${msg.content}</div>
        </div>
    `;

    chatContainer.insertAdjacentHTML('beforeend', html);
    
    // Auto-scroll hacia abajo
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// B. Cargar mensajes iniciales
async function loadChat() {
    chatContainer.innerHTML = '<div class="text-center text-muted mt-5"><i class="fas fa-spinner fa-spin"></i> Cargando chat...</div>';

    const { data, error } = await supabase
        .from('messages')
        .select(`
            id, 
            content, 
            created_at, 
            user_id,
            profiles ( username, avatar_url )
        `)
        .order('created_at', { ascending: true }) // Los más viejos arriba
        .limit(50); // Últimos 50 mensajes

    chatContainer.innerHTML = ''; // Limpiar loader

    if (error) {
        chatContainer.innerHTML = '<p class="text-danger text-center">Error cargando chat</p>';
        console.error(error);
        return;
    }

    data.forEach(msg => renderMessage(msg));
}

// C. Suscribirse a nuevos mensajes (REALTIME)
const chatChannel = supabase.channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        // Cuando llega un mensaje nuevo, solo tenemos el ID del usuario, no su nombre/foto.
        // Tenemos que pedir los datos del perfil rápidamente.
        const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

        // Combinamos los datos del mensaje nuevo con los datos del perfil
        const fullMessage = {
            ...payload.new,
            profiles: profileData
        };

        renderMessage(fullMessage);
    })
    .subscribe();


// D. Enviar mensaje
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert("Debes iniciar sesión para escribir.");
        return;
    }

    // Limpiar input inmediatamente para buena UX
    chatInput.value = '';

    const { error } = await supabase
        .from('messages')
        .insert({
            content: text,
            user_id: user.id
        });

    if (error) {
        alert("Error enviando: " + error.message);
    }
}

// Event Listeners para enviar
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Inicializar chat
loadChat();
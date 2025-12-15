// ---------------------------------------------------------
// 0. CONFIGURACIÓN SUPABASE
// ---------------------------------------------------------
const SUPABASE_URL = 'https://wfoidmoojjqwcltcpyaf.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_xzIZVjCgxaTyOwS1lrjHpA_SzEOtaxq';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------
// LOGICA DE AUTENTICACIÓN
// ---------------------------------------------------------

// 1. REGISTRO
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();

        if (!email.includes('@') || !email.includes('.')) {
            alert("Por favor, introduce un email válido.");
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            alert("Error al registrar: " + error.message);
            return;
        }

        if (data.user && data.user.identities && data.user.identities.length === 0) {
            alert("¡Ese correo ya está registrado! Por favor, inicia sesión.");
            return;
        }

        alert("¡Cuenta creada correctamente! Ahora inicia sesión.");
        const registerModalEl = document.getElementById('registerModal');
        const modal = bootstrap.Modal.getInstance(registerModalEl);
        modal.hide();
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    });
}

// 2. LOGIN
if (document.getElementById('loginForm')) {
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
}

// 3. LOGOUT
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.log('Error logout:', error);
    else alert("Has cerrado sesión");
}

document.addEventListener('click', function(e){
    if(e.target && e.target.id == 'logoutBtn'){
        e.preventDefault();
        logout();
    }
});

// 4. ESCUCHAR CAMBIOS DE ESTADO
supabase.auth.onAuthStateChange((event, session) => {
    updateUI(session);
});

function updateUI(session) {
    const loginBtn = document.getElementById('nav-login-btn');
    const userProfile = document.getElementById('nav-user-profile');
    const userEmailDisplay = document.getElementById('user-email-display');
    const chatLock = document.getElementById('chat-lock');
    const chatContent = document.getElementById('chat-content');

    if (session) {
        if(loginBtn) loginBtn.classList.add('d-none');
        if(userProfile) userProfile.classList.remove('d-none');
        if(userEmailDisplay) userEmailDisplay.textContent = "Cargando..."; 
        
        if(chatLock) chatLock.classList.add('d-none');
        if(chatContent) chatContent.classList.remove('d-none');

        getProfile(session); 
        checkPremiumStatus(session.user.id);

    } else {
        if(loginBtn) loginBtn.classList.remove('d-none');
        if(userProfile) userProfile.classList.add('d-none');
        if(chatLock) chatLock.classList.remove('d-none');
        if(chatContent) chatContent.classList.add('d-none');

        if(userEmailDisplay) userEmailDisplay.textContent = "Usuario";
        
        document.querySelectorAll('.ad-banner').forEach(el => el.style.display = 'block');
        const navImg = document.querySelector('.nav-avatar');
        if (navImg) {
            navImg.outerHTML = '<i class="fas fa-user-circle"></i>';
        }
    }
}

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    updateUI(session);
}
checkSession();


// ---------------------------------------------------------
// 1. CONFIGURACIÓN: CÁMARAS Y TRAMOS DE CARRETERA
// ---------------------------------------------------------

const camerasData = [
    { id: 1, name: "GC1 Telde", level: 8, videoId: "KmcLujr7PU0", tsChannel: "000000", tsField: "1" },
    { id: 2, name: "GC1 Jinamar", level: 7, videoId: "2vDowXZy9cc", tsChannel: "000000", tsField: "1" },
    { id: 3, name: "GC2 Arucas", level: 5, videoId: "z1E5ciDe3a0", tsChannel: "000000", tsField: "1" },
    { id: 4, name: "GC2 Bañaderos", level: 1, videoId: "XGzncIaJJ44", tsChannel: "000000", tsField: "1" },
    { id: 5, name: "Mesa y López", level: 5, videoId: "gfsJIcCZzlI", tsChannel: "000000", tsField: "1" },
    
    // --- LA BALLENA CONFIGURADA CON READ KEY ---
    { 
        id: 6, 
        name: "La Ballena", 
        level: 4, 
        videoId: "ZVgz2e-wMR4", 
        tsChannel: "3199441", 
        tsField: "1",
        readKey: "Q1XCOL5COQL3D5QB" 
    },
    
    { id: 7, name: "Siete Palmas", level: 3, videoId: "eMbMc7VnI5Q", tsChannel: "000000", tsField: "1" },
    { id: 8, name: "Maspalomas Sur", level: 0, videoId: "xrYXDI5uAoA", tsChannel: "000000", tsField: "1" }
];

const trafficSegments = [
    { name: "GC1 - Telde (Bajada)", origin: "28.016694, -15.405527", destination: "28.051912, -15.418465", level: 8 },
    { name: "GC2 - Norte (Arucas)", origin: "28.129994, -15.462319", destination: "28.138446, -15.519003", level: 2 },
    { name: "Mesa y Lopez (Ciudad)", origin: "28.132808, -15.440263", destination: "28.130386, -15.446860", level: 5 }
];

// ---------------------------------------------------------
// 2. GENERADOR DE GRID DE CÁMARAS (MODIFICADO)
// ---------------------------------------------------------
const container = document.getElementById('cameras-container');

if (container) {
    camerasData.forEach(cam => {
        let barColor = 'bg-success';
        if (cam.level >= 3) barColor = 'bg-warning';
        if (cam.level >= 7) barColor = 'bg-danger';
        if (cam.level == 10) barColor = 'bg-dark';

        // --- CORRECCIÓN DE VISIBILIDAD DE TEXTO "Click para ver..." ---
        // Se cambió el color en el style del small
        const html = `
            <div class="col-12 col-md-6 col-lg-3"> 
                <a href="detalle.html?id=${cam.id}" class="camera-card-link">
                    <div class="camera-card h-100"> 
                        <div class="card-header">
                            <span>${cam.name}</span> 
                            <span id="badge-${cam.id}" class="badge ${barColor}">${cam.level}/10</span>
                        </div>
                        <div class="iframe-container">
                            <iframe 
                                src="https://www.youtube.com/embed/${cam.videoId}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0" 
                                title="Cámara Tráfico"
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                        </div>
                        <div class="traffic-stats text-center">
                            <div class="progress" style="height: 6px; background: #333;">
                                <div id="bar-${cam.id}" class="progress-bar ${barColor}" role="progressbar" style="width: ${cam.level * 10}%"></div>
                            </div>
                            <small class="d-block mt-2" style="color: #ccc; font-size: 11px;">Click para ver estadísticas detalladas</small>
                        </div>
                    </div>
                </a>
            </div>
        `;
        container.innerHTML += html;
    });

    updateDashboardLive();
    setInterval(updateDashboardLive, 15000); 
}

// ---------------------------------------------------------
// NUEVA FUNCIÓN: ACTUALIZAR DASHBOARD EN VIVO
// ---------------------------------------------------------
async function updateDashboardLive() {
    camerasData.forEach(async (cam) => {
        if (!cam.tsChannel || cam.tsChannel === "000000") return;

        try {
            let url = `https://api.thingspeak.com/channels/${cam.tsChannel}/feeds/last.json`;
            if (cam.readKey) {
                url += `?api_key=${cam.readKey}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            const val = data[`field${cam.tsField}`];
            
            if (val !== null && val !== undefined) {
                const level = parseInt(val);
                const badge = document.getElementById(`badge-${cam.id}`);
                const bar = document.getElementById(`bar-${cam.id}`);

                if (badge && bar) {
                    badge.innerText = `${level}/10`;
                    let newColorClass = 'bg-success'; 
                    if (level >= 3) newColorClass = 'bg-warning'; 
                    if (level >= 7) newColorClass = 'bg-danger'; 
                    if (level == 10) newColorClass = 'bg-dark'; 

                    badge.className = `badge ${newColorClass}`;
                    bar.style.width = `${level * 10}%`;
                    bar.className = `progress-bar ${newColorClass}`;
                }
            }
        } catch (err) {
            console.error(`Error actualizando cam ${cam.id}:`, err);
        }
    });
}

// ---------------------------------------------------------
// 3. MAPA GOOGLE (ESTILO VOLCÁNICO)
// ---------------------------------------------------------
window.initMap = function() {
    const mapDiv = document.getElementById("googleMap");
    if(!mapDiv) return;

    const granCanaria = { lat: 28.05, lng: -15.45 };
    
    // Estilo personalizado: Gris volcánico neutro con Mar Negro
    const darkStyle = [
        { elementType: "geometry", stylers: [{ color: "#212121" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }, 
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
    ];

    const map = new google.maps.Map(mapDiv, {
        zoom: 11,
        center: granCanaria,
        styles: darkStyle,
        disableDefaultUI: true
    });

    const directionsService = new google.maps.DirectionsService();

    function getColorByLevel(level) {
        if (level <= 2) return "#00FF00"; 
        if (level <= 6) return "#FFCC00"; 
        if (level <= 9) return "#FF0000"; 
        return "#FFFFFF"; 
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
                    strokeOpacity: 1.0, 
                    strokeWeight: 5
                });
                trafficPolyline.setMap(map);
            }
        });
    });
}

// ---------------------------------------------------------
// 5. GESTIÓN DE PERFIL
// ---------------------------------------------------------

async function getProfile(session) {
    if (!session) return;
    const { user } = session;

    const { data, error } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single();

    if (data) {
        const userEmailDisplay = document.getElementById('user-email-display');
        if(userEmailDisplay) userEmailDisplay.textContent = data.username || user.email.split('@')[0];

        const usernameInput = document.getElementById('profileUsername');
        const websiteInput = document.getElementById('profileWebsite');
        if(usernameInput) usernameInput.value = data.username || '';
        if(websiteInput) websiteInput.value = data.website || '';
        
        if (data.avatar_url) {
            downloadImage(data.avatar_url);
        } else {
            const navImg = document.querySelector('.nav-avatar');
            if (navImg) {
                navImg.outerHTML = '<i class="fas fa-user-circle"></i>';
            }
        }
    } else {
        const userEmailDisplay = document.getElementById('user-email-display');
        if(userEmailDisplay) userEmailDisplay.textContent = user.email.split('@')[0];
    }
}

async function downloadImage(path) {
    try {
        const { data, error } = await supabase.storage.from('avatars').download(path);
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        const avatarPreview = document.getElementById('avatarPreview');
        if(avatarPreview) avatarPreview.src = url; 
        
        const navIcon = document.querySelector('#nav-user-profile i.fa-user-circle');
        if(navIcon) {
            navIcon.outerHTML = `<img src="${url}" class="nav-avatar">`;
        } else {
            const navImg = document.querySelector('.nav-avatar');
            if(navImg) navImg.src = url;
        }
    } catch (error) {
        console.log('Error descargando imagen: ', error.message);
    }
}

// Listener Perfil
if (document.getElementById('profileForm')) {
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveProfileBtn');
        const spinner = document.getElementById('saveSpinner');
        
        saveBtn.disabled = true;
        spinner.classList.remove('d-none');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) throw new Error("No hay usuario logueado");

            const username = document.getElementById('profileUsername').value;
            const website = document.getElementById('profileWebsite').value;
            const avatarFile = document.getElementById('avatarFile').files[0];
            
            let avatar_url = null;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}/${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile, { upsert: true });

                if (uploadError) throw uploadError;
                avatar_url = fileName;
            }

            const updates = {
                id: user.id,
                username,
                website,
                updated_at: new Date(),
            };

            if (avatar_url) {
                updates.avatar_url = avatar_url;
            }

            let { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;

            alert('¡Perfil actualizado!');
            
            const { data: { session } } = await supabase.auth.getSession();
            getProfile(session);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            modal.hide();

        } catch (error) {
            alert("Error actualizando perfil: " + error.message);
        } finally {
            saveBtn.disabled = false;
            spinner.classList.add('d-none');
        }
    });
}

if (document.getElementById('avatarFile')) {
    document.getElementById('avatarFile').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const src = URL.createObjectURL(file);
            document.getElementById('avatarPreview').src = src;
        }
    });
}

// ---------------------------------------------------------
// 6. CHAT
// ---------------------------------------------------------
const chatContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendChatBtn');

if (chatContainer) {
    const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/avatars/`;

    function renderMessage(msg) {
        const profile = msg.profiles || {};
        const username = profile.username || 'Usuario Anónimo';
        let avatarImg = '<i class="fas fa-user-circle fa-lg me-2"></i>'; 
        if (profile.avatar_url) {
            avatarImg = `<img src="${STORAGE_URL}${profile.avatar_url}" class="chat-avatar" alt="User">`;
        }
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function loadChat() {
        chatContainer.innerHTML = '<div class="text-center text-muted mt-5"><i class="fas fa-spinner fa-spin"></i> Cargando chat...</div>';
        const { data, error } = await supabase
            .from('messages')
            .select(`id, content, created_at, user_id, profiles ( username, avatar_url )`)
            .order('created_at', { ascending: true })
            .limit(50);

        chatContainer.innerHTML = ''; 
        if (error) {
            chatContainer.innerHTML = '<p class="text-danger text-center">Error cargando chat</p>';
            return;
        }
        data.forEach(msg => renderMessage(msg));
    }

    const chatChannel = supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
            const { data: profileData } = await supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.user_id).single();
            const fullMessage = { ...payload.new, profiles: profileData };
            renderMessage(fullMessage);
        })
        .subscribe();

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Debes iniciar sesión para escribir.");
            return;
        }
        chatInput.value = '';
        const { error } = await supabase.from('messages').insert({ content: text, user_id: user.id });
        if (error) alert("Error enviando: " + error.message);
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    loadChat();
}


// ---------------------------------------------------------
// 7. SISTEMA DE SUSCRIPCIONES Y VIP (CORREGIDO)
// ---------------------------------------------------------

let isUserPremium = false;
let currentSubscriptions = [];

// Verificar si el usuario es Premium
async function checkPremiumStatus(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error verificando VIP:", error.message);
            return;
        }

        if (data && data.is_premium) {
            isUserPremium = true;
            
            // 1. Ocultar Anuncios
            document.querySelectorAll('.ad-banner').forEach(el => el.style.display = 'none');
            
            // 2. Mostrar Badge VIP
            const vipBadge = document.getElementById('vip-badge');
            if(vipBadge) vipBadge.classList.remove('d-none');
            
            console.log("Usuario identificado como VIP");
        }
    } catch (err) {
        console.error("Error inesperado en VIP:", err);
    }
}

// Lógica del botón de suscripción (Solo en detalle.html)
const btnSubscribe = document.getElementById('btnSubscribe');

if (btnSubscribe) {
    
    async function initSubscribeButton() {
        // 1. Verificar sesión
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            btnSubscribe.innerHTML = '<i class="fas fa-lock"></i> Inicia sesión para alertar';
            btnSubscribe.disabled = true;
            btnSubscribe.className = 'btn btn-secondary'; // Gris si no hay sesión
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const camIdParam = urlParams.get('id');

        if (!camIdParam) {
            console.warn("No hay ID de cámara en la URL");
            return;
        }

        const camId = parseInt(camIdParam);

        // 2. Obtener suscripciones actuales desde Supabase
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('camera_id')
                .eq('user_id', session.user.id);

            if (error) {
                console.error("Error cargando suscripciones:", error.message);
                btnSubscribe.innerText = "Error carga";
                return;
            }

            if (data) {
                currentSubscriptions = data.map(sub => sub.camera_id);
                updateSubscribeButtonUI(camId);
            }
        } catch (err) {
            console.error("Error fatal suscripciones:", err);
            btnSubscribe.innerText = "Error";
        }
    }

    function updateSubscribeButtonUI(camId) {
        const isSubscribed = currentSubscriptions.includes(camId);
        
        // Eliminamos el estado disabled y actualizamos texto
        btnSubscribe.disabled = false;

        if (isSubscribed) {
            btnSubscribe.innerHTML = '<i class="fas fa-bell-slash"></i> Desactivar Alerta';
            btnSubscribe.className = 'btn btn-danger text-white'; 
        } else {
            btnSubscribe.innerHTML = '<i class="fas fa-bell"></i> Activar Alerta (> Nvl 7)';
            btnSubscribe.className = 'btn btn-success text-white'; 
        }
    }

    // Evento Click
    btnSubscribe.addEventListener('click', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const urlParams = new URLSearchParams(window.location.search);
        const camId = parseInt(urlParams.get('id'));
        const isSubscribed = currentSubscriptions.includes(camId);

        // Feedback visual inmediato (loading)
        const oldText = btnSubscribe.innerHTML;
        btnSubscribe.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        btnSubscribe.disabled = true;

        if (isSubscribed) {
            // --- DESUSCRIBIRSE ---
            const { error } = await supabase
                .from('subscriptions')
                .delete()
                .match({ user_id: session.user.id, camera_id: camId });

            if (!error) {
                currentSubscriptions = currentSubscriptions.filter(id => id !== camId);
                // alert("Alerta desactivada."); // Opcional
            } else {
                console.error("Error borrar:", error);
                alert("Error al desactivar.");
            }
        } else {
            // --- SUSCRIBIRSE ---
            
            // Chequeo VIP vs FREE (Límite 2)
            if (!isUserPremium && currentSubscriptions.length >= 2) {
                const modalEl = document.getElementById('vipModal');
                if(modalEl) {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                } else {
                    alert("Límite alcanzado. Hazte VIP para más.");
                }
                
                // Restaurar botón
                updateSubscribeButtonUI(camId);
                return;
            }

            const { error } = await supabase
                .from('subscriptions')
                .insert({ user_id: session.user.id, camera_id: camId });

            if (!error) {
                currentSubscriptions.push(camId);
                alert("¡Alerta activada! Te avisaremos si hay atasco.");
            } else {
                console.error("Error insertar:", error);
                alert("Error al suscribirse: " + error.message);
            }
        }
        updateSubscribeButtonUI(camId);
    });

    // Iniciar
    initSubscribeButton();
}


// ---------------------------------------------------------
// 8. INTEGRACIÓN PAYPAL (En index.html o donde esté el modal)
// ---------------------------------------------------------
if (document.getElementById('paypal-button-container')) {
    
    paypal.Buttons({
        style: {
            layout: 'vertical',
            color:  'gold',
            shape:  'rect',
            label:  'paypal'
        },
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: "Suscripción GrancaCam VIP",
                    amount: {
                        value: '4.99'
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(async function(details) {
                // PAGO EXITOSO
                alert('¡Pago completado por ' + details.payer.name.given_name + '! Activando VIP...');
                
                const { data: { user } } = await supabase.auth.getUser();
                
                // Actualizar perfil a PREMIUM en Supabase
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_premium: true })
                    .eq('id', user.id);

                if (!error) {
                    location.reload(); // Recargar para aplicar cambios (quitar anuncios, etc)
                } else {
                    alert("Hubo un error activando tu cuenta, contáctanos.");
                }
            });
        }
    }).render('#paypal-button-container');
}

// Listener para abrir modal VIP desde el Navbar
const btnVipNav = document.querySelector('.btn-vip');
if(btnVipNav) {
    btnVipNav.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = new bootstrap.Modal(document.getElementById('vipModal'));
        modal.show();
    });
}
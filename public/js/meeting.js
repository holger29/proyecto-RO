const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true; // Silenciar mi propio video para evitar feedback
myVideo.classList.add('mirror'); // Espejo solo para mi vista local

// Obtener ID de la sala de la URL
const urlParams = new URLSearchParams(window.location.search);
const ROOM_ID = urlParams.get('room');

if (!ROOM_ID) {
    alert("ID de reunión no válido");
    window.location.href = '/';
}

let myPeerId = crypto.randomUUID(); // Generar ID temporal para este usuario
const peers = {}; // Almacenar conexiones RTCPeerConnection: { userId: connection }
let myStream;
let screenStream;

// Configuración STUN (Google)
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// 1. Inicializar Media (Cámara y Micrófono)
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    // Unirse a la sala
    socket.emit('join-room', ROOM_ID, myPeerId);

    // Escuchar cuando otro usuario se conecta
    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });

    // Escuchar ofertas (WebRTC)
    socket.on('offer', async payload => {
        const pc = createPeerConnection(payload.callerId, stream);
        peers[payload.callerId] = pc;
        
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
            target: payload.callerId,
            callerId: myPeerId,
            sdp: answer
        });
    });

    // Escuchar respuestas
    socket.on('answer', payload => {
        const pc = peers[payload.callerId];
        if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
    });

    // Escuchar candidatos ICE
    socket.on('ice-candidate', payload => {
        const pc = peers[payload.callerId];
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
    });

}).catch(err => {
    console.error("Error al acceder a dispositivos:", err);
    alert("Se requiere acceso a cámara y micrófono.");
    alert("No se pudo acceder a la cámara o micrófono. Asegúrate de dar permisos y tener los dispositivos conectados.");
    // Opcional: Redirigir al home si es crítico
    // window.location.href = '/';
});

// Desconexión de usuario
socket.on('user-disconnected', userId => {
    if (peers[userId]) {
        peers[userId].close(); // Cerrar conexión WebRTC
        delete peers[userId];
    }
    // Eliminar video del DOM
    const video = document.getElementById(userId);
    if (video) video.remove();
});

// --- Funciones Auxiliares WebRTC ---

function createPeerConnection(targetUserId, stream) {
    const pc = new RTCPeerConnection(iceServers);

    // Añadir tracks locales a la conexión
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Manejar candidatos ICE locales
    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                target: targetUserId,
                callerId: myPeerId,
                candidate: event.candidate
            });
        }
    };

    // Manejar stream remoto (cuando llega video del otro)
    pc.ontrack = event => {
        const existingVideo = document.getElementById(targetUserId);
        if (existingVideo) return;

        const video = document.createElement('video');
        video.id = targetUserId; // Asignar ID para poder eliminarlo luego
        addVideoStream(video, event.streams[0]);
    };

    return pc;
}

async function connectToNewUser(userId, stream) {
    const pc = createPeerConnection(userId, stream);
    peers[userId] = pc;

    // Crear oferta
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('offer', {
        target: userId,
        callerId: myPeerId,
        sdp: offer
    });
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// --- Controles de UI ---

const muteBtn = document.getElementById('mute-btn');
const videoBtn = document.getElementById('video-btn');
const screenBtn = document.getElementById('screen-btn');
const leaveBtn = document.getElementById('leave-btn');

// Mute / Unmute
muteBtn.addEventListener('click', () => {
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        muteBtn.classList.add('active');
        muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    } else {
        audioTrack.enabled = true;
        muteBtn.classList.remove('active');
        muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
});

// Video On / Off
videoBtn.addEventListener('click', () => {
    const videoTrack = myStream.getVideoTracks()[0];
    if (videoTrack.enabled) {
        videoTrack.enabled = false;
        videoBtn.classList.add('active');
        videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    } else {
        videoTrack.enabled = true;
        videoBtn.classList.remove('active');
        videoBtn.innerHTML = '<i class="fas fa-video"></i>';
    }
});

// Compartir Pantalla
screenBtn.addEventListener('click', async () => {
    if (!screenStream) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            // Reemplazar el track de video en todas las conexiones peer
            for (let userId in peers) {
                const pc = peers[userId];
                const sender = pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);
            }

            // Mostrar mi pantalla en mi propio video local
            myVideo.srcObject = screenStream;
            myVideo.classList.remove('mirror'); // No espejar al compartir pantalla
            screenBtn.classList.add('active');

            // Manejar cuando el usuario deja de compartir desde la UI del navegador
            screenTrack.onended = () => stopScreenSharing();

        } catch (err) {
            console.error("Error al compartir pantalla", err);
        }
    } else {
        stopScreenSharing();
    }
});

function stopScreenSharing() {
    if (screenStream) {
        const videoTrack = myStream.getVideoTracks()[0];
        
        // Volver a poner la cámara
        for (let userId in peers) {
            const pc = peers[userId];
            const sender = pc.getSenders().find(s => s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
        }
        myVideo.srcObject = myStream;
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        myVideo.classList.add('mirror'); // Volver a espejar la cámara
        screenBtn.classList.remove('active');
    }
}

leaveBtn.addEventListener('click', () => {
    window.location.href = '/';
});
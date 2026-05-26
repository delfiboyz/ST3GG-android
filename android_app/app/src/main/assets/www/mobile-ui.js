/**
 * Mobile UI Logic for ST3GG Mobile
 */

let state = {
    mode: 'home',
    image: null,
    canvas: null
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    state.mode = screenId.replace('-screen', '');
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            state.image = img;
            state.canvas = canvas;
            
            // Show preview
            const preview = document.getElementById(state.mode === 'encode' ? 'encode-preview' : 'decode-preview');
            preview.src = event.target.result;
            preview.classList.remove('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function startEncode() {
    if (!state.canvas) {
        alert("Pilih gambar terlebih dahulu!");
        return;
    }

    const text = document.getElementById('secret-text').value;
    if (!text) {
        alert("Masukkan pesan rahasia!");
        return;
    }

    try {
        document.getElementById('loading').classList.remove('hidden');
        const data = new TextEncoder().encode(text);
        
        // Simple default settings for laypeople
        const encodedCanvas = await encode(state.canvas, data, 'RGB', 1);
        
        const resultImg = encodedCanvas.toDataURL('image/png');
        document.getElementById('result-image').src = resultImg;
        showScreen('result-screen');
    } catch (e) {
        alert("Gagal menyembunyikan pesan: " + e.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

async function startDecode() {
    if (!state.canvas) {
        alert("Pilih gambar terlebih dahulu!");
        return;
    }

    try {
        document.getElementById('loading').classList.remove('hidden');
        const data = await decode(state.canvas);
        const text = new TextDecoder().decode(data);
        
        document.getElementById('decoded-text').textContent = text;
        showScreen('decoded-screen');
    } catch (e) {
        alert("Gagal menemukan pesan: " + e.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

function shareResult() {
    const dataUrl = document.getElementById('result-image').src;
    
    // Use native Android share if available
    if (window.Android && window.Android.shareImage) {
        window.Android.shareImage(dataUrl);
    } else {
        // Fallback to download for web preview
        const link = document.createElement('a');
        link.download = 'stego_pesan.png';
        link.href = dataUrl;
        link.click();
    }
}

function shareSafe() {
    const dataUrl = document.getElementById('result-image').src;
    
    // Use native Android share safe if available
    if (window.Android && window.Android.shareSafe) {
        window.Android.shareSafe(dataUrl);
    } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = 'stego_aman.png.stg';
        link.href = dataUrl;
        link.click();
    }
}

function saveResult() {
    const dataUrl = document.getElementById('result-image').src;
    
    // Use native Android save if available
    if (window.Android && window.Android.saveImage) {
        window.Android.saveImage(dataUrl);
    } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = 'stego_pesan.png';
        link.href = dataUrl;
        link.click();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-go-encode').onclick = () => showScreen('encode-screen');
    document.getElementById('btn-go-decode').onclick = () => showScreen('decode-screen');
    document.getElementById('btn-back-home').onclick = () => showScreen('home-screen');
    document.getElementById('btn-back-home2').onclick = () => showScreen('home-screen');
    
    document.getElementById('image-input-encode').onchange = handleImageSelect;
    document.getElementById('image-input-decode').onchange = handleImageSelect;
    
    document.getElementById('btn-start-encode').onclick = startEncode;
    document.getElementById('btn-start-decode').onclick = startDecode;
    
    document.getElementById('btn-save').onclick = saveResult;
    document.getElementById('btn-share-safe').onclick = shareSafe;
    document.getElementById('btn-share').onclick = shareResult;
    document.getElementById('btn-done').onclick = () => showScreen('home-screen');
});

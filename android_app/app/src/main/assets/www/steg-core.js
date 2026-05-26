/**
 * Core Steganography Logic for ST3GG Mobile
 * Ported from index.html (ST3GG Toolkit)
 */

const MAGIC_BYTES = [0x53, 0x54, 0x45, 0x47]; // "STEG"
const HEADER_SIZE = 32;

const CHANNEL_PRESETS = {
    'R': [0], 'G': [1], 'B': [2], 'A': [3],
    'RG': [0, 1], 'RB': [0, 2], 'RA': [0, 3],
    'GB': [1, 2], 'GA': [1, 3], 'BA': [2, 3],
    'RGB': [0, 1, 2], 'RGA': [0, 1, 3], 'RBA': [0, 2, 3], 'GBA': [1, 2, 3],
    'RGBA': [0, 1, 2, 3]
};

function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function compress(data) {
    if (typeof CompressionStream === 'undefined') return data;
    const stream = new Blob([data]).stream();
    const compressed = stream.pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(compressed).arrayBuffer());
}

async function decompress(data) {
    if (typeof DecompressionStream === 'undefined') return data;
    try {
        const stream = new Blob([data]).stream();
        const decompressed = stream.pipeThrough(new DecompressionStream('deflate'));
        return new Uint8Array(await new Response(decompressed).arrayBuffer());
    } catch (e) {
        return data;
    }
}

function bytesToBits(data, bitsPerUnit = 1) {
    const bits = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 7; j >= 0; j--) {
            bits.push((data[i] >> j) & 1);
        }
    }
    if (bitsPerUnit === 1) return bits;
    const result = [];
    for (let i = 0; i < bits.length; i += bitsPerUnit) {
        let value = 0;
        for (let j = 0; j < bitsPerUnit && i + j < bits.length; j++) {
            value = (value << 1) | bits[i + j];
        }
        result.push(value);
    }
    return result;
}

function bitsToBytes(bits, bitsPerUnit = 1) {
    let bitArray = [];
    if (bitsPerUnit === 1) {
        bitArray = bits;
    } else {
        for (let i = 0; i < bits.length; i++) {
            for (let j = bitsPerUnit - 1; j >= 0; j--) {
                bitArray.push((bits[i] >> j) & 1);
            }
        }
    }
    const bytes = new Uint8Array(Math.ceil(bitArray.length / 8));
    for (let i = 0; i < bitArray.length; i++) {
        if (bitArray[i]) {
            bytes[i >> 3] |= (1 << (7 - (i % 8)));
        }
    }
    return bytes;
}

function createHeader(payloadLength, originalLength, crc, channels, bitsPerChannel, compressed) {
    const header = new Uint8Array(HEADER_SIZE);
    header.set(MAGIC_BYTES, 0);
    header[4] = 3; // Version
    let channelMask = 0;
    channels.forEach(ch => channelMask |= (1 << ch));
    header[5] = channelMask;
    header[6] = bitsPerChannel;
    header[8] = compressed ? 1 : 0;
    header[16] = (payloadLength >> 24) & 0xFF;
    header[17] = (payloadLength >> 16) & 0xFF;
    header[18] = (payloadLength >> 8) & 0xFF;
    header[19] = payloadLength & 0xFF;
    header[20] = (originalLength >> 24) & 0xFF;
    header[21] = (originalLength >> 16) & 0xFF;
    header[22] = (originalLength >> 8) & 0xFF;
    header[23] = originalLength & 0xFF;
    header[24] = (crc >> 24) & 0xFF;
    header[25] = (crc >> 16) & 0xFF;
    header[26] = (crc >> 8) & 0xFF;
    header[27] = crc & 0xFF;
    return header;
}

function parseHeader(data) {
    if (data.length < HEADER_SIZE) return null;
    if (data[0] !== MAGIC_BYTES[0] || data[1] !== MAGIC_BYTES[1] ||
        data[2] !== MAGIC_BYTES[2] || data[3] !== MAGIC_BYTES[3]) return null;
    const channelMask = data[5];
    const channels = [];
    for (let i = 0; i < 4; i++) if (channelMask & (1 << i)) channels.push(i);
    return {
        channels,
        bitsPerChannel: data[6],
        compressed: !!(data[8] & 1),
        payloadLength: (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19],
        originalLength: (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23],
        crc: (data[24] << 24) | (data[25] << 16) | (data[26] << 8) | data[27]
    };
}

async function encode(canvas, data, channelName, bitsPerChannel) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const channels = CHANNEL_PRESETS[channelName] || [0, 1, 2];
    const originalLength = data.length;
    const crcValue = crc32(data);
    const payload = await compress(data);
    const header = createHeader(payload.length, originalLength, crcValue, channels, bitsPerChannel, true);
    const fullData = new Uint8Array(header.length + payload.length);
    fullData.set(header);
    fullData.set(payload, header.length);
    const totalPixels = canvas.width * canvas.height;
    const bitUnits = bytesToBits(fullData, bitsPerChannel);
    const bitMask = (1 << bitsPerChannel) - 1;
    const clearMask = ~bitMask & 0xFF;
    let unitIdx = 0;
    for (let pixIdx = 0; pixIdx < totalPixels && unitIdx < bitUnits.length; pixIdx++) {
        const baseIdx = pixIdx * 4;
        for (const ch of channels) {
            if (unitIdx >= bitUnits.length) break;
            pixels[baseIdx + ch] = (pixels[baseIdx + ch] & clearMask) | bitUnits[unitIdx];
            unitIdx++;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

async function decode(canvas) {
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const totalPixels = canvas.width * canvas.height;
    
    // Auto-detect header
    const configs = [];
    Object.keys(CHANNEL_PRESETS).forEach(name => {
        for (let bits = 1; bits <= 4; bits++) configs.push({ name, bits });
    });

    for (const config of configs) {
        const channels = CHANNEL_PRESETS[config.name];
        const bitMask = (1 << config.bits) - 1;
        const headerUnits = [];
        const unitsNeeded = Math.ceil(HEADER_SIZE * 8 / config.bits);
        let unitCount = 0;
        for (let pixIdx = 0; pixIdx < totalPixels && unitCount < unitsNeeded; pixIdx++) {
            const baseIdx = pixIdx * 4;
            for (const ch of channels) {
                if (unitCount >= unitsNeeded) break;
                headerUnits.push(pixels[baseIdx + ch] & bitMask);
                unitCount++;
            }
        }
        const headerBytes = bitsToBytes(headerUnits, config.bits);
        const header = parseHeader(headerBytes);
        if (header) {
            // Found valid header! Extract payload
            const totalUnitsNeeded = Math.ceil((HEADER_SIZE + header.payloadLength) * 8 / header.bitsPerChannel);
            const allUnits = [];
            unitCount = 0;
            for (let pixIdx = 0; pixIdx < totalPixels && unitCount < totalUnitsNeeded; pixIdx++) {
                const baseIdx = pixIdx * 4;
                for (const ch of header.channels) {
                    if (unitCount >= totalUnitsNeeded) break;
                    allUnits.push(pixels[baseIdx + ch] & ((1 << header.bitsPerChannel) - 1));
                    unitCount++;
                }
            }
            const allBytes = bitsToBytes(allUnits, header.bitsPerChannel);
            const payload = allBytes.slice(HEADER_SIZE, HEADER_SIZE + header.payloadLength);
            const data = header.compressed ? await decompress(payload) : payload;
            if (crc32(data) === header.crc) return data;
        }
    }
    throw new Error("Pesan rahasia tidak ditemukan atau kata sandi salah.");
}

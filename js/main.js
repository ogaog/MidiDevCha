import { MIDIHandler } from './midiHandler.js';
import { detectChord } from './chordDetector.js';

const DEGREE_NAMES = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];

const mod12 = (n) => ((n % 12) + 12) % 12;

// DOM 要素の参照
const inputSelect = document.getElementById('inputDeviceSelect');
const outputSelect = document.getElementById('outputDeviceSelect');
const channelSelect = document.getElementById('channelSelect');
const incChan = document.getElementById('incrementChannel');
const decChan = document.getElementById('decrementChannel');
const transInput = document.getElementById('transposeAmount');
const incTrans = document.getElementById('incrementTranspose');
const decTrans = document.getElementById('decrementTranspose');
const chordDisplay = document.getElementById('chordDisplay');
const degreeDisplay = document.getElementById('degreeDisplay');
const noteOnLog = document.getElementById('noteOnLog');
const allLog = document.getElementById('allLog');
const logContainer = document.getElementById('logContainer');
const splitVertical = document.getElementById('splitVertical');
const splitHorizontal = document.getElementById('splitHorizontal');

let currentChannel = 0;
let transpose = 0;
const pressedSet = new Set();

// LocalStorageキー
const STORAGE_KEYS = {
    inputDevice: 'midi_input_device',
    outputDevice: 'midi_output_device',
    channel: 'midi_channel',
    transpose: 'midi_transpose',
    logSplit: 'midi_log_split' // 'vertical' or 'horizontal'
};

// ログ管理
const MAX_LOG_LINES = 100; // ログの最大行数

function getDegreeName(chordInfo, transposeAmount) {
    if (!chordInfo || chordInfo.root === null) return '–';

    const tonicPc = mod12(transposeAmount); // transpose=0 を Cメジャーの I とする
    const rootDegree = DEGREE_NAMES[mod12(chordInfo.root - tonicPc)];

    if (chordInfo.slashBassPc === null) {
        return `${rootDegree}${chordInfo.suffix}`;
    }

    const bassDegree = DEGREE_NAMES[mod12(chordInfo.slashBassPc - tonicPc)];
    return `${rootDegree}${chordInfo.suffix}/${bassDegree}`;
}

// MIDIノート番号を音階名に変換（C4=60）
function noteToName(noteNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteName = noteNames[noteNumber % 12];
    return `${noteName}${octave}`;
}

// 設定をLocalStorageに保存
function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.inputDevice, inputSelect.value);
    localStorage.setItem(STORAGE_KEYS.outputDevice, outputSelect.value);
    localStorage.setItem(STORAGE_KEYS.channel, currentChannel.toString());
    localStorage.setItem(STORAGE_KEYS.transpose, transpose.toString());

    // 分割設定を保存
    const isVertical = logContainer.classList.contains('log-split-vertical');
    localStorage.setItem(STORAGE_KEYS.logSplit, isVertical ? 'vertical' : 'horizontal');
}

// 設定をLocalStorageから読み込み
function loadSettings() {
    const savedChannel = localStorage.getItem(STORAGE_KEYS.channel);
    const savedTranspose = localStorage.getItem(STORAGE_KEYS.transpose);
    const savedLogSplit = localStorage.getItem(STORAGE_KEYS.logSplit);

    if (savedChannel !== null) {
        const parsedChannel = parseInt(savedChannel, 10);
        currentChannel = Number.isInteger(parsedChannel) && parsedChannel >= 0 && parsedChannel <= 15
            ? parsedChannel
            : 0;
    }
    if (savedTranspose !== null) {
        transpose = parseInt(savedTranspose);
        transInput.value = transpose;
    }

    // 分割設定を復元
    if (savedLogSplit) {
        if (savedLogSplit === 'vertical') {
            logContainer.className = 'log-split-container log-split-vertical';
            splitVertical.classList.add('active');
            splitHorizontal.classList.remove('active');
        } else {
            logContainer.className = 'log-split-container log-split-horizontal';
            splitHorizontal.classList.add('active');
            splitVertical.classList.remove('active');
        }
        log(`Restored log split: ${savedLogSplit}`);
    }
}

// カウントダウン関数（2秒待機）
async function waitWithCountdown(seconds) {
    for (let i = seconds; i > 0; i--) {
        log(`Device auto-selection in ${i} second${i > 1 ? 's' : ''}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// デバイスを自動選択（前回選択したデバイスを復元）
function selectSavedDevice(selectElement, devices, storageKey) {
    const savedDeviceId = localStorage.getItem(storageKey);

    if (savedDeviceId) {
        const savedDevice = devices.find(device => device.id === savedDeviceId);
        if (savedDevice) {
            selectElement.value = savedDeviceId;
            log(`Restored previous device: ${savedDevice.name}`);
            return savedDeviceId;
        }
    }

    if (devices.length > 0) {
        selectElement.value = devices[0].id;
        log(`Selected first available device: ${devices[0].name}`);
        return devices[0].id;
    }

    return null;
}

// ログ出力（最大行数制限付き）
function log(msg, isNoteOn = false) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${msg}`;

    allLog.textContent = logLine + '\n' + allLog.textContent;

    if (isNoteOn) {
        noteOnLog.textContent = logLine + '\n' + noteOnLog.textContent;
    }

    limitLogLines(allLog);
    limitLogLines(noteOnLog);
}

function limitLogLines(logElement) {
    const lines = logElement.textContent.split('\n');
    if (lines.length > MAX_LOG_LINES) {
        logElement.textContent = lines.slice(0, MAX_LOG_LINES).join('\n');
    }
}

const midi = new MIDIHandler({
    onNoteMessage: ([status, note, vel]) => {
        const cmd = status & 0xf0;
        if (cmd === 0x90 && vel > 0) {
            pressedSet.add(note);
        } else {
            pressedSet.delete(note);
        }
        updateChord();

        const newStatus = (status & 0xf0) | currentChannel;
        const transposedNote = note + transpose;
        midi.sendMessage([newStatus, transposedNote, vel]);

        const originalNoteName = noteToName(note);
        const transposedNoteName = noteToName(transposedNote);
        const cmdType = (cmd === 0x90 && vel > 0) ? 'ON ' : 'OFF';
        const isNoteOn = (cmd === 0x90 && vel > 0);
        const maxBars = 60;

        let barCount = Math.round((vel / 127) * maxBars);
        barCount = Math.max(0, Math.min(maxBars, barCount));

        const formatFancyBars = (count) => {
            if (count <= 0) return ''.padEnd(maxBars / 2 + 1, ' ');
            const i = count - 1;
            let result = '';
            if (i === 0) result = ':';
            else if (i % 2 === 1) result = '|'.repeat((i + 1) / 2);
            else result = '|'.repeat(i / 2) + ':';
            return result.padEnd(maxBars / 2 + 1, ' ');
        };

        const velBars = formatFancyBars(barCount);
        const velStr = String(vel).padStart(3, ' ');

        const clampedTransposed = Math.max(0, Math.min(127, transposedNote));
        let heightBarCount = Math.round((clampedTransposed / 127) * maxBars);
        heightBarCount = Math.max(0, Math.min(maxBars, heightBarCount));
        const heightBars = formatFancyBars(heightBarCount);

        const formatName = (n) => (n.length > 3 ? n.slice(0, 3) : n.padEnd(3, ' '));
        log(`Note ${cmdType}: ${formatName(originalNoteName)} → ${formatName(transposedNoteName)}${heightBars} | Ch:${currentChannel + 1} | Vel:${velStr}${velBars}`, isNoteOn);
    },
    onOtherMessage: ([status, d1, d2]) => {
        const newStatus = (status & 0xf0) | currentChannel;
        midi.sendMessage([newStatus, d1, d2]);
        log(`Control:\t\tStatus:${newStatus.toString(16)}\t|\tData:${d1},${d2}\t|\tCh:${currentChannel + 1}`);
    }
});

function updateChord() {
    const transposedNotes = Array.from(pressedSet).map(note => note + transpose);
    const chordInfo = detectChord(transposedNotes);
    chordDisplay.textContent = chordInfo.label;
    degreeDisplay.textContent = getDegreeName(chordInfo, transpose);
}

function updateTranspose(newValue) {
    transpose = newValue;
    transInput.value = transpose;
    updateChord();
    saveSettings();
    log(`Settings:\t\tTranspose\t→\t${transpose}`);
}

function updateChannel(newValue) {
    if (newValue >= 0 && newValue <= 15) {
        currentChannel = newValue;
        channelSelect.value = currentChannel;
        saveSettings();
        log(`Settings:\t\tChannel\t\t→\t${currentChannel + 1}`);
    }
}

async function setup() {
    try {
        await midi.init();

        loadSettings();

        const inputDevices = midi.listInputs();
        const outputDevices = midi.listOutputs();

        inputDevices.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.text = i.name;
            inputSelect.add(opt);
        });

        outputDevices.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.text = o.name;
            outputSelect.add(opt);
        });

        for (let i = 0; i < 16; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = i + 1;
            channelSelect.add(opt);
        }
        channelSelect.value = currentChannel;

        await waitWithCountdown(2);

        const selectedInputId = selectSavedDevice(inputSelect, inputDevices, STORAGE_KEYS.inputDevice);
        const selectedOutputId = selectSavedDevice(outputSelect, outputDevices, STORAGE_KEYS.outputDevice);

        inputSelect.onchange = () => {
            midi.selectInput(inputSelect.value);
            saveSettings();
        };
        outputSelect.onchange = () => {
            midi.selectOutput(outputSelect.value);
            saveSettings();
        };
        channelSelect.onchange = () => {
            currentChannel = +channelSelect.value;
            saveSettings();
        };
        incChan.onclick = () => updateChannel(currentChannel + 1);
        decChan.onclick = () => updateChannel(currentChannel - 1);

        transInput.oninput = () => {
            transpose = +transInput.value;
            updateChord();
        };
        incTrans.onclick = () => updateTranspose(transpose + 1);
        decTrans.onclick = () => updateTranspose(transpose - 1);

        document.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
                return;
            }

            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    updateTranspose(transpose + 1);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    updateTranspose(transpose - 1);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    updateChannel(currentChannel + 1);
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    updateChannel(currentChannel - 1);
                    break;
            }
        });

        splitVertical.onclick = () => {
            logContainer.className = 'log-split-container log-split-vertical';
            splitVertical.classList.add('active');
            splitHorizontal.classList.remove('active');
            saveSettings();
            log(`Log split changed to: vertical`);
        };

        splitHorizontal.onclick = () => {
            logContainer.className = 'log-split-container log-split-horizontal';
            splitHorizontal.classList.add('active');
            splitVertical.classList.remove('active');
            saveSettings();
            log(`Log split changed to: horizontal`);
        };

        if (selectedInputId) {
            midi.selectInput(selectedInputId);
        }
        if (selectedOutputId) {
            midi.selectOutput(selectedOutputId);
        }

        updateChord();
        log(`System:\t\tMIDI Debaucher initialized`);
    } catch (e) {
        alert('MIDIアクセス失敗: ' + e);
    }
}

window.addEventListener('load', setup);

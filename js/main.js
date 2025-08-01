import { MIDIHandler } from './midiHandler.js';
import { detectChord } from './chordDetector.js';

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
const noteOnLog = document.getElementById('noteOnLog');
const allLog = document.getElementById('allLog');
const logContainer = document.getElementById('logContainer');
const splitVertical = document.getElementById('splitVertical');
const splitHorizontal = document.getElementById('splitHorizontal');

let currentChannel = 7;
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
        currentChannel = parseInt(savedChannel);
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

// デバイスを自動選択（前回選択したデバイスを復元）
function selectSavedDevice(selectElement, devices, storageKey) {
    const savedDeviceId = localStorage.getItem(storageKey);

    if (savedDeviceId) {
        // 前回選択したデバイスが利用可能かチェック
        const savedDevice = devices.find(device => device.id === savedDeviceId);
        if (savedDevice) {
            selectElement.value = savedDeviceId;
            log(`Restored previous device: ${savedDevice.name}`);
            return savedDeviceId;
        }
    }

    // 前回のデバイスが見つからない場合は最初のデバイスを選択
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

    // すべてのログに追加
    allLog.textContent = logLine + '\n' + allLog.textContent;

    // Note ON の場合は専用ログにも追加
    if (isNoteOn) {
        noteOnLog.textContent = logLine + '\n' + noteOnLog.textContent;
    }

    // 行数制限チェック（両方のログ領域）
    limitLogLines(allLog);
    limitLogLines(noteOnLog);
}

// ログ行数制限関数
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

        // 転送メッセージ作成＆送信
        const newStatus = (status & 0xf0) | currentChannel;
        const transposedNote = note + transpose;
        midi.sendMessage([newStatus, transposedNote, vel]);

        // 音階名を含むログ出力
        const originalNoteName = noteToName(note);
        const transposedNoteName = noteToName(transposedNote);
        const cmdType = (cmd === 0x90 && vel > 0) ? 'ON ' : 'OFF';
        const isNoteOn = (cmd === 0x90 && vel > 0);
        log(`Note ${cmdType}:\t${originalNoteName}\t→\t${transposedNoteName}\t|\tCh:${currentChannel + 1}\t|\tVel:${vel}`, isNoteOn);
    },
    onOtherMessage: ([status, d1, d2]) => {
        const newStatus = (status & 0xf0) | currentChannel;
        midi.sendMessage([newStatus, d1, d2]);
        log(`Control:\t\tStatus:${newStatus.toString(16)}\t|\tData:${d1},${d2}\t|\tCh:${currentChannel + 1}`);
    }
});

function updateChord() {
    // トランスポーズされたノートでコード検出
    const transposedNotes = Array.from(pressedSet).map(note => note + transpose);
    chordDisplay.textContent = detectChord(transposedNotes);
}

// トランスポーズ値を更新してUIに反映
function updateTranspose(newValue) {
    transpose = newValue;
    transInput.value = transpose;
    updateChord(); // トランスポーズ変更時にコードも更新
    saveSettings(); // 設定を保存
    log(`Settings:\t\tTranspose\t→\t${transpose}`);
}

// チャンネル値を更新してUIに反映
function updateChannel(newValue) {
    if (newValue >= 0 && newValue <= 15) {
        currentChannel = newValue;
        channelSelect.value = currentChannel;
        saveSettings(); // 設定を保存
        log(`Settings:\t\tChannel\t\t→\t${currentChannel + 1}`);
    }
}

async function setup() {
    try {
        await midi.init();

        // 設定を読み込み
        loadSettings();

        // デバイスリストを埋める
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

        // チャンネル1-16
        for (let i = 0; i < 16; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.text = i + 1;
            channelSelect.add(opt);
        }
        channelSelect.value = currentChannel;

        // デバイス自動選択（前回選択したデバイスを復元）
        const selectedInputId = selectSavedDevice(
            inputSelect,
            inputDevices,
            STORAGE_KEYS.inputDevice
        );

        const selectedOutputId = selectSavedDevice(
            outputSelect,
            outputDevices,
            STORAGE_KEYS.outputDevice
        );

        // イベント（設定保存付き）
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
            updateChord(); // 手動入力時にもコードを更新
        };
        incTrans.onclick = () => updateTranspose(transpose + 1);
        decTrans.onclick = () => updateTranspose(transpose - 1);

        // キーボードイベント（矢印キー）
        document.addEventListener('keydown', (event) => {
            // フォーカスが入力フィールドにある場合は無視
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

        // 分割切り替えイベント
        splitVertical.onclick = () => {
            logContainer.className = 'log-split-container log-split-vertical';
            splitVertical.classList.add('active');
            splitHorizontal.classList.remove('active');
            saveSettings(); // 設定を保存
            log(`Log split changed to: vertical`);
        };

        splitHorizontal.onclick = () => {
            logContainer.className = 'log-split-container log-split-horizontal';
            splitHorizontal.classList.add('active');
            splitVertical.classList.remove('active');
            saveSettings(); // 設定を保存
            log(`Log split changed to: horizontal`);
        };

        // 選択されたデバイスに接続
        if (selectedInputId) {
            midi.selectInput(selectedInputId);
        }
        if (selectedOutputId) {
            midi.selectOutput(selectedOutputId);
        }

        // 初期状態をログに記録
        log(`System:\t\tMIDI Debaucher initialized`);

    } catch (e) {
        alert('MIDIアクセス失敗: ' + e);
    }
}

window.addEventListener('load', setup);

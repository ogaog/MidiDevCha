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
const logOutput = document.getElementById('logOutput');

let currentChannel = 7;
let transpose = 0;
const pressedSet = new Set();

// ログ管理
const MAX_LOG_LINES = 100; // ログの最大行数

// MIDIノート番号を音階名に変換（C4=60）
function noteToName(noteNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteName = noteNames[noteNumber % 12];
    return `${noteName}${octave}`;
}

// ログ出力（最大行数制限付き）
function log(msg) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${msg}`;

    // 新しいログを先頭に追加
    logOutput.textContent = logLine + '\n' + logOutput.textContent;

    // 行数制限チェック
    const lines = logOutput.textContent.split('\n');
    if (lines.length > MAX_LOG_LINES) {
        // 制限を超えた場合、古い行を削除
        logOutput.textContent = lines.slice(0, MAX_LOG_LINES).join('\n');
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
        log(`Note ${cmdType}:\t${originalNoteName}\t→\t${transposedNoteName}\t|\tCh:${currentChannel + 1}\t|\tVel:${vel}`);
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
    log(`Settings:\t\tTranspose\t→\t${transpose}`);
}

// チャンネル値を更新してUIに反映
function updateChannel(newValue) {
    if (newValue >= 0 && newValue <= 15) {
        currentChannel = newValue;
        channelSelect.value = currentChannel;
        log(`Settings:\t\tChannel\t\t→\t${currentChannel + 1}`);
    }
}

async function setup() {
    try {
        await midi.init();
        // デバイスリストを埋める
        midi.listInputs().forEach(i => {
            const opt = document.createElement('option'); opt.value = i.id; opt.text = i.name; inputSelect.add(opt);
        });
        midi.listOutputs().forEach(o => {
            const opt = document.createElement('option'); opt.value = o.id; opt.text = o.name; outputSelect.add(opt);
        });
        // チャンネル1-16
        for (let i = 0; i < 16; i++) {
            const opt = document.createElement('option'); opt.value = i; opt.text = i + 1; channelSelect.add(opt);
        }
        channelSelect.value = currentChannel;

        // イベント
        inputSelect.onchange = () => midi.selectInput(inputSelect.value);
        outputSelect.onchange = () => midi.selectOutput(outputSelect.value);
        channelSelect.onchange = () => currentChannel = +channelSelect.value;
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

        // 初期選択
        if (inputSelect.options.length) inputSelect.selectedIndex = 0;
        if (outputSelect.options.length) outputSelect.selectedIndex = 0;
        midi.selectInput(inputSelect.value);
        midi.selectOutput(outputSelect.value);

    } catch (e) {
        alert('MIDIアクセス失敗: ' + e);
    }
}

window.addEventListener('load', setup);

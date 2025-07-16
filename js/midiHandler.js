// MIDIデバイスの選択とメッセージ転送
export class MIDIHandler {
    constructor({ onNoteMessage, onOtherMessage }) {
        this.onNoteMessage = onNoteMessage;   // ノートON/OFF専用ハンドラ
        this.onOtherMessage = onOtherMessage; // その他メッセージ汎用ハンドラ
        this.inputs = null;
        this.outputs = null;
        this.currentInput = null;
        this.currentOutput = null;
    }

    async init() {
        const access = await navigator.requestMIDIAccess();
        this.inputs = access.inputs;
        this.outputs = access.outputs;
        return access;
    }

    listInputs() {
        return Array.from(this.inputs.values());
    }
    listOutputs() {
        return Array.from(this.outputs.values());
    }

    selectInput(id) {
        if (this.currentInput) this.currentInput.onmidimessage = null;
        this.currentInput = this.inputs.get(id);
        this.currentInput.onmidimessage = (e) => this._handleMessage(e);
    }

    selectOutput(id) {
        this.currentOutput = this.outputs.get(id);
    }

    _handleMessage(event) {
        const [status, data1, data2] = event.data;
        const cmd = status & 0xf0;
        if ((cmd === 0x90 && data2 > 0) || cmd === 0x80) {
            this.onNoteMessage(event.data);
        } else {
            this.onOtherMessage(event.data);
        }
    }

    sendMessage([status, data1, data2]) {
        if (this.currentOutput) this.currentOutput.send([status, data1, data2]);
    }
}

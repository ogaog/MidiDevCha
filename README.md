# MIDIデバチャ

Web MIDI APIを使用したチャンネル選択可能なMIDIデバイス入出力処理とコード検出（Tonal.js使用）

### 機能
- MIDIデバイス選択（入力・出力）
- チャンネル変更
- トランスポーズ
- 押下中ノートからのコード検出

### 使用技術
- **Web MIDI API**: ブラウザネイティブのMIDI処理
- **Tonal.js**: コード検出

### 依存関係
- [Tonal.js](https://github.com/tonaljs/tonal) (CDN経由)
- Web MIDI API対応ブラウザ（Chrome等）

### 使用方法
1. MIDIデバイスを接続
2. ブラウザでページを開く
3. MIDIアクセス許可を与える
4. 入力・出力デバイスを選択
5. 演奏

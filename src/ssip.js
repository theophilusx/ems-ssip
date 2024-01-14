'use strict';

const net = require('node:net');
const fs = require('node:fs/promises');
const { execFileSync } = require('node:child_process');

class SsipClient {
  constructor() {
    this.capsState = false;
    this.splitCaps = true;
    this.allCapsBeep = false;
    this.rate = 40;
    this.pitch = 0;
    this.volume = 0;
    this.isTalking = false;
    this.charFactor = 1.2;
    this.punctuation = 'some';
    this.play = '/usr/bin/aplay -q';
    this.debug = false;
    this.paused = false;
    this.priority = 'text';
    this.isStopped = false;
    this.inBlock = false;
    this.client = null;
    this.EOL = '\r\n';
    this.dataRE = /\d{3}-(.*)/;
    this.statusRE = /(\d{3}) (.*)/;
  }

  #parseResponse(r) {
    const result = {
      data: [],
      statusCode: '',
      statusMsg: '',
    };
    const lines = r.split(this.EOL).filter((l) => l !== '');
    lines.forEach((l) => {
      if (l.startsWith('-', 3)) {
        let match = this.dataRE.exec(l);
        result.data.push(match[1]);
      } else {
        let match = this.statusRE.exec(l);
        result.statusCode = match[1];
        result.statusMsg = match[2];
      }
    });
    return result;
  }

  #addListeners(resolve, reject, buf) {
    let handlers = {
      error: (e) => {
        reject(e);
      },
      data: (d) => {
        let cmdEnd = /\d{3} .*/;
        buf += d;
        if (cmdEnd.test(d)) {
          resolve(this.#parseResponse(buf));
        }
      },
      end: () => {
        resolve(buf);
      },
    };
    this.client.on('error', handlers.error);
    this.client.on('data', handlers.data);
    this.client.on('end', handlers.end);
    return handlers;
  }

  #removeListeners(handlers) {
    this.client.removeListener('data', handlers.data);
    this.client.removeListener('end', handlers.end);
    this.client.removeListener('error', handlers.error);
  }

  command(cmd) {
    let listeners;
    let response = '';

    return new Promise((resolve, reject) => {
      try {
        listeners = this.#addListeners(resolve, reject, response);
        this.client.write(cmd + this.EOL);
      } catch (err) {
        reject(err);
      }
    }).finally(() => {
      this.#removeListeners(listeners);
    });
  }

  async #serverRunning() {
    const sdPidFile =
      process.env.SPEECH_DISPATCHER_PID ||
      `${process.env.XDG_RUNTIME_DIR}/speech-dispatcher/pid/speech-dispatcher.pid`;
    try {
      await fs.access(sdPidFile);
      const pid = await fs.readFile(sdPidFile, { encoding: 'utf8' });
      await fs.access(`/proc/${pid.trim()}`);
      return true;
    } catch {
      return false;
    }
  }

  #getConnection(path) {
    return new Promise((resolve, reject) => {
      let ssip;
      try {
        ssip = net.createConnection(path, () => {
          this.client = ssip;
          ssip.setEncoding('utf8');
          ssip.on('close', (hadError) => {
            if (hadError) {
              console.log('SSIP connection closed due to an error');
            }
            this.ssip = undefined;
          });
          resolve(ssip);
        });
        ssip.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async connect(socketPath, spawn = true) {
    try {
      if (this.client) {
        throw new Error('Error: Already connected to speech-dispatcher');
      }
      const serverRunning = await this.#serverRunning();
      if (!serverRunning && spawn) {
        console.log(spawn ? 'Starting server' : 'Not starting server');
        execFileSync('speech-dispatcher', ['--spawn']);
      }
      let ssip = await this.#getConnection(socketPath);
      let user = process.env.USER;
      await this.command(`SET self CLIENT_NAME ${user}:ems-ssip:server`);
      return ssip;
    } catch (err) {
      throw new Error(`connect: ${err.message}`);
    }
  }

  async end() {
    if (!this.client) {
      // not an error to try and close a non-existent connection
      return 'Not connected';
    }
    let resp = await this.command('QUIT');
    this.client.end();
    this.client = null;
    return resp[0];
  }

  async setDebug(state) {
    return await this.command(`SET self DEBUG ${state}`);
  }

  async setPunctuation(mode) {
    switch (mode) {
      case 'all': {
        this.punctuation = 'all';
        break;
      }
      case 'some': {
        this.punctuation = 'some';
        break;
      }
      case 'none': {
        this.punctuation = 'none';
        break;
      }
      default: {
        this.punctuation = 'some';
        break;
      }
    }
    return await this.command(`SET self PUNCTUATION ${this.punctuation}`);
  }

  async listOutputModules() {
    return await this.command('LIST OUTPUT_MODULES');
  }

  async getOutputModule() {
    return await this.command('GET OUTPUT_MODULE');
  }

  async setOutputModule(module) {
    return await this.command(`SET self OUTPUT_MODULE ${module}`);
  }

  async listVoices() {
    return await this.command('LIST VOICES');
  }

  async setVoice(voice) {
    return await this.command(`SET self VOICE_TYPE ${voice}`);
  }

  async getVoice() {
    return await this.command('GET VOICE_TYPE');
  }

  async setLanguage(lang) {
    return await this.command(`SET self LANGUAGE ${lang}`);
  }

  async setSpelling(mode) {
    return await this.command(`SET self SPELLING ${mode}`);
  }

  async setCapsRecognition(mode) {
    this.capsState = mode;
    return await this.command(`SET self CAP_LET_RECOGN ${mode}`);
  }

  async setRate(speechRate) {
    this.rate = speechRate;
    return await this.command(`SET self RATE ${speechRate}`);
  }

  async getRate() {
    return await this.command('GET RATE');
  }

  async setPitch(pitchLevel) {
    this.pitch = pitchLevel;
    return await this.command(`SET self PITCH ${this.pitch}`);
  }

  async getPitch() {
    return await this.command('GET PITCH');
  }

  async setVolume(vol) {
    this.volume = vol;
    return await this.command(`SET self VOLUME ${vol}`);
  }

  async getVolume() {
    return await this.command('GET VOLUME');
  }

  async stop() {
    return await this.command('STOP self');
  }

  async cancel() {
    return await this.command('CANCEL self');
  }

  async pause() {
    let resp = {
      data: [],
      statusCode: '200',
      statusMsg: 'Already paused',
    };
    if (!this.paused) {
      this.paused = true;
      return await this.command('PAUSE self');
    }
    return resp;
  }

  async resume() {
    let resp = {
      data: [],
      statusCode: '200',
      statusMsg: 'Not paused',
    };
    if (this.paused) {
      this.paused = false;
      return await this.command('RESUME self');
    }
    return resp;
  }

  async setPriority(p) {
    this.priority = p;
    return await this.command(`SET self PRIORITY ${p}`);
  }

  async speak(txt) {
    const readyResp = await this.command('SPEAK');
    if (readyResp.statusCode.startsWith('2')) {
      return await this.command(txt + this.EOL + '.');
    }
  }

  async char(c) {
    return await this.command(`CHAR ${c}`);
  }

  async key(keyName) {
    return await this.command(`KEY ${keyName}`);
  }

  async soundIcon(iconName) {
    return await this.command(`SOUND_ICON ${iconName}`);
  }

  async blockBegin() {
    if (this.inBlock) {
      return {
        data: [],
        statusCode: '200',
        statusMsg: 'Already in a block!',
      };
    } else {
      this.inBlock = true;
      return await this.command('BLOCK BEGIN');
    }
  }

  async blockEnd() {
    if (this.inBlock) {
      this.inBlock = false;
      return await this.command('BLOCK END');
    } else {
      return {
        data: [],
        statusCode: '200',
        statusMsg: 'Not in a block',
      };
    }
  }
}

module.exports = SsipClient;

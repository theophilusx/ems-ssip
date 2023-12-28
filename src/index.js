"use strict";

const Client = require("./ssip.js");

const socketPath = "/run/user/1000/speech-dispatcher/speechd.sock";

const ssip = new Client();

async function run() {
  await ssip.connect(socketPath);
  let modules = await ssip.listOutputModules();
  console.log("Output modules", modules);
  let modSet = await ssip.setOutputModule("voxin");
  console.log("Set mdoule result...", modSet.data[0]);
  let mod = await ssip.getOutputModule();
  console.log("Current output module", mod);
  let voices = await ssip.listVoices();
  console.log("Voices", voices);
  let setvoice = await ssip.setVoice("FEMALE1");
  console.log("Set voice..", setvoice);
  let voice = await ssip.getVoice();
  console.log("Current voice...", voice);
  let langSet = await ssip.setLanguage("en");
  console.log("Set language", langSet);
  let spellSet = await ssip.setSpelling("on");
  console.log("Set spelling result..", spellSet);
  let capsRec = await ssip.setCapsRecognition("icon");
  console.log("Cpas recognition set..", capsRec);
  let rateSet = await ssip.setRate(40);
  console.log("Set rate...", rateSet);
  let currentRate = await ssip.getRate();
  console.log("Current rate..", currentRate);
  let setPitch = await ssip.setPitch(0);
  console.log("Set pitch..", setPitch);
  let pitch = await ssip.getPitch();
  console.log("Current pitch..", pitch);
  let setVol = await ssip.setVolume(50);
  console.log("Set vol...", setVol);
  let getvol = await ssip.getVolume();
  console.log("get vol...", getvol);
  let speakResp = await ssip.speak("This is a basic message to speak.");
  console.log("speak responnse...", speakResp);
  await ssip.end();
}

run().catch((e) => {
  console.log(`Error: ${e.message}`);
});

// async function main() {
//   console.log("Set name");
//   let cmd1 = await command(ssip);
//   console.log(cmd1);
//   console.log("get output module name");
//   let cmd2 = await command(ssip, "GET OUTPUT_MODULE");
//   console.log(cmd2);
//   console.log("set message priority");
//   let cmd3 = await command(ssip, "SET SELF PRIORITY MESSAGE");
//   console.log(cmd3);
//   let cmd4 = await command(ssip, "SPEAK");
//   console.log("setup speak");
//   console.log(cmd4);
//   let cmd5 = await command(
//     ssip,
//     "Hello, I'm am SSIP communication example!" + EOL + "How are you?" + EOL + ".",
//   );
//   console.log(cmd5);
//   console.log("setup more speak");
//   let cmd6 = await command(ssip, "SPEAK");
//   console.log(cmd6);
//   let cmd7 = await command(ssip, "Still there?" + EOL + ".");
//   console.log(cmd7);
//   console.log("get history client list");
//   let cmd8 = await command(ssip, "HISTORY GET CLIENT_LIST");
//   console.log(cmd8);
//   console.log("history get last");
//   let cmd9 = await command(ssip, "HISTORY GET LAST");
//   console.log(cmd9);
//   console.log("quitting");
//   let bye = await end(client);
//   console.log(bye);
// }

// main().catch((e) => console.log(e));

/*
  main.js is primarily responsible for hooking up the UI to the rest of the application 
  and setting up the main event loop
*/

// We will write the functions in this file in the traditional ES5 way
// In this instance, we feel the code is more readable if written this way
// If you want to re-write these as ES6 arrow functions, to be consistent with the other files, go ahead!

import * as utils from './utils.js';
import * as audio from './audio.js';
import * as canvas from './canvas.js';

const drawParams = {
  showGradient: true,
  showBars: false,
  showCircles: false,
  showNoise: false,
  showInvert: false,
  showEmboss: false,
  showWaveform: false,
  showParticles: true
};

// 1 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
  sound1: "media/New Adventure Theme.mp3"
});

const init = () => {
  console.log("init called");

  audio.setupWebAudio(DEFAULTS.sound1);

  //console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);
  let canvasElement = document.querySelector("canvas"); // hookup <canvas> element
  setupUI(canvasElement);
  canvas.setupCanvas(canvasElement, audio.analyserNode);
  loop();

}

const setupUI = (canvasElement) => {
  // A - hookup fullscreen button
  setupButtons(canvasElement);

  setupVolumeSilder();

  
  setupCheckboxes();


} // end setupUI

const setupVolumeSilder = () => {
  // B - hookup volume slider
  let volumeSlider = document.querySelector("#slider-volume");
  let volumeLabel = document.querySelector("#label-volume");
  // add .oninput event to slider
  volumeSlider.oninput = e => {
    // set the gain
    audio.setVolume(e.target.value);
    // update output element
    volumeLabel.innerHTML = Math.round((e.target.value / 2 * 100));
  };

  volumeSlider.dispatchEvent(new Event("input"));
}

const setupButtons = (canvasElement) => {
  const fsButton = document.querySelector("#btn-fs");

  // add .onclick event to button
  fsButton.onclick = e => {
    console.log("goFullscreen() called");
    utils.goFullscreen(canvasElement);
  };
  const playButton = document.querySelector("#btn-play");
  playButton.onclick = e => {
    console.log(`audioCtx.state before = ${audio.audioCtx.state}`);
    // check if context is in suspended state (autoplay policy)
    if (audio.audioCtx.state == "suspended") {
      audio.audioCtx.resume();
    }
    console.log(`audioCtx.state after = ${audio.audioCtx.state}`);
    if (e.target.dataset.playing == "no") {
      // if track is currently paused, play it
      audio.playCurrentSound();
      e.target.dataset.playing = "yes";
    } else {
      // if track is currently playing, pause it
      audio.pauseCurrentSound();
      e.target.dataset.playing = "no";
    }
  };
  // C - hookup track <select>
  let trackSelect = document.querySelector("#select-track");
  // add .onchange event to <select>
  trackSelect.onchange = e => {
    audio.loadSoundFile(e.target.value);
    // pause the current track if it is playing
    if (playButton.dataset.playing == "yes") {
      playButton.dispatchEvent(new MouseEvent("click"));
    }
  };
}


const setupCheckboxes = () => {

  let bassCb = document.querySelector("#cb-bass");
  bassCb.onchange = e => {
    if (e.target.checked) {
      audio.setBassFilter();
    }
    else {
      audio.removeBassFilter();
    }
  }

  let trebleCB = document.querySelector("#cb-treble");
  trebleCB.onchange = e => {
    if (e.target.checked) {
      audio.setTrebleFilter();
    }
    else {
      audio.removeTrebleFilter();
    }
  }



  let gradientCB = document.querySelector("#cb-gradient");

  gradientCB.onchange = e => {
    drawParams.showGradient = e.target.checked;
  };

  let barsCB = document.querySelector("#cb-bars");

  barsCB.onchange = e => {
    drawParams.showBars = e.target.checked;
  };

  let circlesCB = document.querySelector("#cb-circles");

  circlesCB.onchange = e => {
    drawParams.showCircles = e.target.checked;
  };

  let noiseCB = document.querySelector("#cb-noise");

  noiseCB.onchange = e => {
    drawParams.showNoise = e.target.checked;
  };

  let invertColorsCB = document.querySelector("#cb-invert-colors");

  invertColorsCB.onchange = e => {
    drawParams.showInvert = e.target.checked;
  }

  let embossCB = document.querySelector("#cb-emboss");

  embossCB.onchange = e => {
    drawParams.showEmboss = e.target.checked;
  }

  let waveformCB = document.querySelector("#cb-waveform");
  waveformCB.onchange = e => {
    drawParams.showWaveform = e.target.checked;
  }

  let particlesCB = document.querySelector("#cb-particles");
  particlesCB.onchange = e => {
    drawParams.showParticles = e.target.checked;
  }
  
}

const loop = () => {
  setTimeout(() => {
    canvas.draw(drawParams);
    loop();
  }, 1000 / 60); 

}

export { init };
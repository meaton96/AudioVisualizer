import * as utils from './utils.js';
import * as audio from './audio.js';
import * as canvas from './canvas.js';
import { Particle } from './particle.js';
import * as particleController from './particle-controller.js';
import * as star from './star.js';

const drawParams = {
  showGradient: true,
  showBars: false,
  showCircles: false,
  showNoise: false,
  showInvert: false,
  showEmboss: false,
  showWaveform: false,
  showParticles: true,
  showLine: false,
  showVignette: true,
  showStars: true,
  showTunnel: true
};
const particleControls = Particle.particleControls;


// 1 - here we are faking an enumeration
const DEFAULTS = Object.freeze({
  sound1: "media/ftw.mp3"
});

const init = (json) => {


  const seekBar = document.getElementById('seek-bar');
  const timeElement = document.getElementById('time');
  document.title = json.appTitle;
  Particle.setDefaultParticleControls(json.defaultParticleControls);


  audio.setupWebAudio(DEFAULTS.sound1, seekBar, timeElement);


  //console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);
  let canvasElement = document.querySelector("canvas"); // hookup <canvas> element
  setupUI(canvasElement, json);
  canvas.setupCanvas(canvasElement, audio.analyserNode);
  loop();

}
const updateParticleHueControl = (type, value) => {
  let varType = type === 'min' ? 'minHue' : 'maxHue';
  Particle.particleControls[varType] = parseInt(value); // Update the hue value in particle controls
  //console.log(`#${type}-number`);
  document.querySelector(`#${type}-hue-number`).value = value; // Synchronize number input
  document.querySelector(`#${type}-hue`).value = value; // Synchronize range slider
}

const setupUI = (canvasElement, json) => {

  // A - hookup fullscreen button
  setupButtons(canvasElement, json);

  setupVolumeSilder();


  setupCheckboxes();

  createParticleControls(json);


  //add .onclick event to button


} // end setupUI


const updateParticleControl = (key, value) => {
  Particle.particleControls[key] = parseFloat(value); // Update the static property

}
const resetParticleControls = () => {
  // Reset the values
  Object.keys(Particle.defaultParticleControls).forEach(key => {
    Particle.particleControls[key] = Particle.defaultParticleControls[key];

    // Update the corresponding slider and input field
    const slider = document.getElementById(key);
    const input = document.getElementById(`${key}-input`);
    if (slider && input) {
      slider.value = Particle.defaultParticleControls[key];
      input.value = Particle.defaultParticleControls[key];
    }
  });
}

const createParticleControls = (json) => {
  const container = document.querySelector('#particle-controls');

  
  const particleControls = json.defaultParticleControls;
  Object.keys(particleControls).forEach(key => {
    // Create a label for the control
    const label = document.createElement('label');
    label.innerHTML = `${key}: `;
    label.for = key;

    // Create a slider for the control
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = key;
    slider.value = particleControls[key];
    // Define min, max, and step values as needed for each control
    slider.min = 0;
    slider.max = key.includes('alpha') || key.includes('velocity') ? 0.1 : 10; // Adjust based on your range needs
    slider.step = key.includes('alpha') || key.includes('velocity') ? 0.001 : 0.1;

    // Create an input field for the control
    const input = document.createElement('input');
    input.type = 'number';
    input.value = particleControls[key];
    input.step = slider.step; // Align step values with the slider
    input.id = `${key}-input`;

    // Update the particle control and the corresponding input field when the slider value changes
    slider.oninput = (e) => {
      const value = e.target.value;
      input.value = value;
      updateParticleControl(key, value);
    };

    // Update the particle control and the corresponding slider when the input field value changes
    input.oninput = (e) => {
      const value = e.target.value;
      slider.value = value;
      updateParticleControl(key, value);
    };

    // Append the controls to the container
    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(input);
    container.appendChild(document.createElement('br')); // For layout, to put each control on a new line
  });

  // Create and append the reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset to Default';
  resetButton.onclick = resetParticleControls; // Set the click event to reset the controls
  container.appendChild(resetButton); // Append the reset button to the container

  // Event listeners for the hue range controls
  document.querySelector('#min-hue').addEventListener('input', (e) => {
    updateParticleHueControl('min', e.target.value);
  });

  document.querySelector('#max-hue').addEventListener('input', (e) => {
    updateParticleHueControl('max', e.target.value);
  });

  document.querySelector('#min-hue-number').addEventListener('input', (e) => {
    updateParticleHueControl('min', e.target.value);
  });

  document.querySelector('#max-hue-number').addEventListener('input', (e) => {
    updateParticleHueControl('max', e.target.value);
  });


}
const setupTrackSelector = (songList, playButton) => {

  let trackSelect = document.querySelector("#select-track");
  // add <option> elements to the <select>
  const htmlString = songList.map((track) => {
    return `<option value="${track.filePath}">${track.title} - ${track.artist}</option>`;
  }).join('');

  trackSelect.innerHTML = htmlString;
  // add .onchange event to <select>
  trackSelect.onchange = e => {
    audio.loadSoundFile(e.target.value);
    if (playButton.dataset.playing == "yes") {
      playButton.dispatchEvent(new MouseEvent("click"));
    }
  };
}



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

const setupButtons = (canvasElement, json) => {
  const fsButton = document.querySelector("#btn-fs");

  // add .onclick event to button
  fsButton.onclick = e => {
    console.log("goFullscreen() called");
    utils.goFullscreen(canvasElement);
  };
  const playButton = document.querySelector("#btn-play");
  playButton.onclick = e => {
    // console.log(`audioCtx.state before = ${audio.audioCtx.state}`);
    // check if context is in suspended state (autoplay policy)
    if (audio.audioCtx.state == "suspended") {
      audio.audioCtx.resume();
    }
    // console.log(`audioCtx.state after = ${audio.audioCtx.state}`);
    if (e.target.dataset.playing == "no") {
      // if track is currently paused, play it
      particleController.clearParticles();
      star.stopStars();
      audio.playCurrentSound();

      e.target.dataset.playing = "yes";
    } else {
      // if track is currently playing, pause it
      particleController.clearParticles();
      star.stopStars();
      audio.pauseCurrentSound();
      particleController.endBassDrop();
      e.target.dataset.playing = "no";
    }
  };
  setupTrackSelector(json.songs, playButton);
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

  let lineCB = document.querySelector("#cb-line");
  lineCB.onchange = e => {
    drawParams.showLine = e.target.checked;
  }
  let vignetteCB = document.querySelector("#cb-vignette");
  vignetteCB.onchange = e => {
    drawParams.showVignette = e.target.checked;
  }

  let starsCB = document.querySelector("#cb-stars");
  starsCB.onchange = e => {
    drawParams.showStars = e.target.checked;
  }

}

const loop = () => {
  setTimeout(() => {
    canvas.draw(drawParams);
    loop();
  }, 1000 / 60);

}

export { init };
import * as utils from './utils.js';
import * as audio from './audio.js';
import * as canvas from './canvas.js';
import { Particle } from './particle.js';
import * as particleController from './particle-controller.js';
import * as star from './star.js';

const drawParams = {
  gradient: true,
  bars: false,
  circles: false,
  noise: false,
  invert: false,
  emboss: false,
  waveform: false,
  particles: true,
  line: false,
  vignette: true,
  stars: true,
  tunnel: true,
  colorLoudest: false,
  bassDropEffect: true
};

const DEFAULTS = Object.freeze({
  sound1: "media/ftw.mp3"
});

const init = (json) => {


  const seekBar = document.getElementById('seek-bar');
  const timeElement = document.getElementById('time');
  document.title = json.appTitle;


  audio.setupWebAudio(DEFAULTS.sound1, seekBar, timeElement);


  let canvasElement = document.querySelector("canvas"); // hookup <canvas> element
  setupUI(canvasElement, json);
  canvas.setupCanvas(canvasElement, audio.analyserNode);
  loop();

}
//updates the particle hue control
const updateParticleHueControl = (type, value) => {
  let varType = type === 'min' ? 'minHue' : 'maxHue';
  Particle.particleControls[varType] = parseInt(value); // Update the hue value in particle controls
  document.querySelector(`#${type}-hue-number`).value = value; // Synchronize number input
  document.querySelector(`#${type}-hue`).value = value; // Synchronize range slider
}

const setupUI = (canvasElement, json) => {

  // A - hookup fullscreen button
  setupButtons(canvasElement, json);

  setupVolumeSilder();
  createParticleControls(json);

} // end setupUI

//takes the value from the slider and updates the particle control
const updateParticleControl = (key, value) => {

  if (key === 'bassDropEffect' || key === 'colorLoudest') {
    Particle.particleControls[key] = value; 
    if (key === 'bassDropEffect') {
      particleController.toggleBassDropEnd();
    }

    return;
  }

  Particle.particleControls[key] = parseFloat(value); 


}
const resetParticleControls = () => {
  // Reset the values
  Object.keys(Particle.defaultParticleControls).forEach(key => {
    Particle.particleControls[key] = Particle.defaultParticleControls[key];

    // Update the corresponding slider and input field
    const slider = document.querySelector(`#range-${key}`);
    const input = document.querySelector(`#input-${key}`);
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


    try {
      // Create a slider for the control
      const slider = document.querySelector(`#range-${key}`);

      slider.value = particleControls[key];

      // Create an input field for the control
      const input = document.querySelector(`#input-${key}`);
      input.value = particleControls[key];


      // console.log(slider);
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
    } catch (error) {
      // Skip the value and go on to the next one
      //console.error(error);
    }



    //container.appendChild(document.createElement('br')); // For layout, to put each control on a new line
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
  const bassBtn = document.querySelector("#btn-bass");
  let isBassEnabled = false;
  bassBtn.onclick = () => {
    isBassEnabled = !isBassEnabled;
    if (isBassEnabled) {
      audio.setBassFilter();
    } else {
      audio.removeBassFilter();
    }
  };

  const trebleBtn = document.querySelector("#btn-treble");
  let isTrebleEnabled = false;
  trebleBtn.onclick = () => {
    isTrebleEnabled = !isTrebleEnabled;
    if (isTrebleEnabled) {
      audio.setTrebleFilter();
    } else {
      audio.removeTrebleFilter();
    }
  };

  const toggleDrawParam = (param) => {
    if (param === 'bassDropEffect' || param === 'colorLoudest') {
      updateParticleControl(param, !Particle.particleControls[param]);
    }
    else {
      drawParams[param] = !drawParams[param];
    }
    const button = document.querySelector(`#btn-${param}`);
    button.classList.toggle('active');
  };

  const setupButtonClick = (param) => {
    const button = document.querySelector(`#btn-${param}`);
    button.onclick = () => {

      toggleDrawParam(param);
    };

    //console.log(drawParams);
    // Check if the initial value is true
    if (drawParams[param]) {
      button.classList.add('active');
    }
  };

  const controlColumns = document.querySelector('#checkboxes').querySelectorAll('.control-column');
  const particleButtons = document.querySelector('#particle-buttons').querySelectorAll('button');

  const setupToggleButton = (button) => {
    const buttonId = button.id.replace('btn-', '');
    setupButtonClick(buttonId);
  }


  controlColumns.forEach(column => {
    const buttons = column.querySelectorAll('button');
    buttons.forEach(button => setupToggleButton(button));
  });

  

  particleButtons.forEach(button => setupToggleButton(button));

  setupTrackSelector(json.songs, playButton);

}





const loop = () => {
  setTimeout(() => {
    canvas.draw(drawParams);
    loop();
  }, 1000 / 60);

}

export { init };
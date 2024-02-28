/*
    The purpose of this file is to take in the analyser node and a <canvas> element: 
      - the module will create a drawing context that points at the <canvas> 
      - it will store the reference to the analyser node
      - in draw(), it will loop through the data in the analyser node
      - and then draw something representative on the canvas
      - maybe a better name for this file/module would be *visualizer.js* ?
*/

import * as utils from './utils.js';
import { Particle } from './particle.js';
import { audioCtx } from './audio.js';

let ctx, canvasWidth, canvasHeight, gradient, analyserNode, audioData;
let particles = [];
let baseAngle = 0;

let particleBeatTracking = {
    beatCutOff: 0,
    beatTime: 0,
    beatHoldTime: 2.5,
    beatDecayRate: 0.95,
    beatMin: 1,
    threshhold: 125
};

let fftSize;
const sampleRate = 44100; // This is a common sample rate for audio; adjust if yours is different


// Define your target frequency range
const melodyStartFrequency = 0; // example start frequency in Hz
const melodyEndFrequency = 200; // example end frequency in Hz

// Calculate corresponding bin indexes
const melodyStartBin = Math.floor((melodyStartFrequency * fftSize) / sampleRate);
const melodyEndBin = Math.floor((melodyEndFrequency * fftSize) / sampleRate);


const setupCanvas = (canvasElement, analyserNodeRef) => {
    // create drawing context
    ctx = canvasElement.getContext("2d");

    canvasWidth = canvasElement.width;
    canvasHeight = canvasElement.height;
    // create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(ctx, 0, 0, 0, canvasHeight, [{ percent: 0, color: "#87CEFA" }, { percent: .25, color: "#E6E6FA" }, { percent: .5, color: "#D8BFD8" }, { percent: .75, color: "#FFDDF4" }, { percent: 1, color: "#FFE4E1" }]);
    // keep a reference to the analyser node
    analyserNode = analyserNodeRef;
    analyserNode.fftSize; // This should be set on your analyserNode
    // this is the array where the analyser data will be stored
    audioData = new Uint8Array(analyserNode.fftSize / 2);


}
const updateParticles = () => {
    // Compute the sum of the lower frequencies
    let sum = 0;
    let beatFrequency = 10;
    for (let i = 0; i < beatFrequency; i++) {
        sum += audioData[i];
    }
    let average = sum / beatFrequency;

    // Detect beat if average is greater than beatCutOff
    if (average > particleBeatTracking.beatCutOff && average > particleBeatTracking.beatMin) {

        // Determine the frequency bins that correspond to the melody or significant beats

        console.log("average: " + average);

        let melodySum = 0;
        for (let i = melodyStartBin; i <= melodyEndBin; i++) {
            melodySum += audioData[i];
        }
        let melodyAverage = melodySum / (melodyEndBin - melodyStartBin + 1);

        if (melodyAverage > particleBeatTracking.beatMin) {
           // console.log("Prominent beat detected");
            particles.forEach(p => {
                //p.swapAngularVelocity();
                //    p.incrementHue(10);
                // p.vx *= -1;
                // p.vy *= -1;
            });
        }

        particleBeatTracking.beatCutOff = average * 1.5;


        for (let i = 0; i < audioData.length; i++) {
           // console.log(audioData[i]);
            // Check if the frequency for this bin is significantly present
            if (audioData[i] > particleBeatTracking.threshhold) { 
                let angle = (i / audioData.length) * Math.PI * 2 + baseAngle;

                let pos = { x: canvasWidth / 2, y: canvasHeight / 2 };
                pos.x += Math.cos(angle) * 50; // You can adjust the radius here
                pos.y += Math.sin(angle) * 50; // Same as above

                // Create a particle for this bin
                let p = new Particle(pos.x, pos.y, angle);
                particles.push(p);
            }
        }


        particleBeatTracking.beatTime = 0;

    } else {
        if (particleBeatTracking.beatTime <= particleBeatTracking.beatHoldTime) {
            particleBeatTracking.beatTime++;
        } else {
            particleBeatTracking.beatCutOff *= particleBeatTracking.beatDecayRate;
            particleBeatTracking.beatCutOff = Math.max(particleBeatTracking.beatCutOff, particleBeatTracking.beatMin);
        }
    }

    // Update and draw particles
    particles.forEach((p, index) => {
        p.move();
        p.draw(ctx);
        if (p.alpha <= 0) {
            particles.splice(index, 1);
        }
    });
};

const draw = (params = {}) => {
    // 1 - populate the audioData array with the frequency data from the analyserNode
    // notice these arrays are passed "by reference" 
    if (params.showWaveform) {
        analyserNode.getByteTimeDomainData(audioData);
    }
    else {
        analyserNode.getByteFrequencyData(audioData);
    }

    drawAudioVisualizer(params);

    alterImage(params);



}
const alterImage = (params = {}) => {
    // 6 - bitmap manipulation
    // TODO: right now. we are looping though every pixel of the canvas (320,000 of them!), 
    // regardless of whether or not we are applying a pixel effect
    // At some point, refactor this code so that we are looping though the image data only if
    // it is necessary

    // A) grab all of the pixels on the canvas and put them in the `data` array
    // `imageData.data` is a `Uint8ClampedArray()` typed array that has 1.28 million elements!
    // the variable `data` below is a reference to that array 
    let imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;
    let length = data.length;
    let width = imageData.width; // not using here
    // B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
    for (let i = 0; i < length; i += 4) {

        if (params.showNoise && Math.random() < .05) {

            /// Calculate the x and y positions of the pixel
            let x = (i / 4) % width;
            let y = Math.floor((i / 4) / width);

            // Adjust the color based on the x and y positions

            data[i + 1] = (x / width) * 255;
            data[i] = (y / imageData.height) * 255;
            data[i + 2] = 255 - ((x / width) * 255);

            // data[i + 3] is the alpha channel, leave it as is for full opacity
        } // end if

        if (params.showInvert) {
            let red = data[i], green = data[i + 1], blue = data[i + 2];
            data[i] = 255 - red; // set red value
            data[i + 1] = 255 - green; // set blue value
            data[i + 2] = 255 - blue; // set green value
        } // end if

    } // end for

    if (params.showEmboss) {
        for (let i = 0; i < length; i++) {
            if (i % 4 == 3) continue; // skip alpha channel
            data[i] = 127 + 2 * data[i] - data[i + 4] - data[i + width * 4];
        }
    }

    // D) copy image data back to canvas
    ctx.putImageData(imageData, 0, 0);

}
const drawAudioVisualizer = (params = {}) => {
    // 2 - draw background
    ctx.save();
    ctx.fillStyle = "black";
    ctx.globalAlpha = params.showWaveform ? 1 : .1;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    // 3 - draw gradient
    if (params.showGradient) {
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = params.showWaveform ? 1 : .3;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }
    // 4 - draw bars

    if (params.showBars) {
        if (params.showWaveform) {

        }
        let barSpacing = 4;
        let margin = 5;
        let screenWidthForBars = canvasWidth - (audioData.length * barSpacing) - margin * 2;
        let barWidth = screenWidthForBars / audioData.length;
        let barHeight = 200;
        let topSpacing = params.showWaveform ? 0 : 100;

        ctx.save();
        ctx.fillStyle = 'rgba(0,255,0,0.50)';
        ctx.strokeStyle = 'rgba(0,255,0,0.75)';
        for (let i = 0; i < audioData.length; i++) {
            ctx.fillRect(margin + i * (barWidth + barSpacing), topSpacing + 256 - audioData[i], barWidth, barHeight);
            ctx.strokeRect(margin + i * (barWidth + barSpacing), topSpacing + 256 - audioData[i], barWidth, barHeight);
        }
        ctx.restore();
    }
    // 5 - draw circles
    if (params.showCircles && !params.showWaveform) {
        let maxRadius = canvasHeight / 4;
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < audioData.length; i++) {
            let percent = audioData[i] / 255;

            let circleRadius = percent * maxRadius;
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(255, 111, 111, .34 - percent / 3.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(0, 0, 255, .10 - percent / 10.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * 1.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = utils.makeColor(200, 200, 0, .5 - percent / 5.0);
            ctx.arc(canvasWidth / 2, canvasHeight / 2, circleRadius * 0.5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }
        ctx.restore();
    }
    if (params.showParticles) {
        updateParticles();
    }
}

export { setupCanvas, draw };
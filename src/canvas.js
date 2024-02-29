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

let ctx, canvasWidth, canvasHeight, gradient, analyserNode, audioData, audioDataWaveform;

let baseAngle = 0;
let stars = [];

let vignetteFadeSpeed = .02;

let beatIntensity = 0;
let beatDetected = false;
let particles = [];
let particleBeatTracking = {
    spawnRadius: 50,
    beatCutOff: 0,
    beatTime: 0,
    beatHoldTime: 2.5,
    beatDecayRate: 0.9,
    beatMin: .15,
    audibleThreshold: 120,
    bassEndBin: 5,
};

const setupCanvas = (canvasElement, analyserNodeRef) => {
    // create drawing context
    ctx = canvasElement.getContext("2d");

    canvasWidth = canvasElement.width;
    canvasHeight = canvasElement.height;
    // create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(ctx, 0, 0, 0, canvasHeight, [{ percent: 0, color: "#87CEFA" }, { percent: .25, color: "#E6E6FA" }, { percent: .5, color: "#D8BFD8" }, { percent: .75, color: "#FFDDF4" }, { percent: 1, color: "#FFE4E1" }]);
    // keep a reference to the analyser node
    analyserNode = analyserNodeRef;
    // this is the array where the analyser data will be stored
    audioData = new Uint8Array(analyserNode.fftSize / 2);
    audioDataWaveform = new Uint8Array(analyserNode.fftSize / 2);
    createStars(500);

}
const updateParticles = () => {
    // Compute the sum of the lower frequencies
    let sum = 0;
    for (let i = 0; i < particleBeatTracking.bassEndBin; i++) {
        sum += audioData[i];
    }
    let average = sum / particleBeatTracking.bassEndBin;
    let angleIncrement = (Math.PI * 2) / (analyserNode.fftSize / 2.35);

    if (average > particleBeatTracking.beatCutOff && average > particleBeatTracking.beatMin) {
        // Iterate through all the bins of the frequency data

        for (let i = 0; i < audioData.length; i++) {
            // console.log(`Frequency bin ${i} has a value of ${audioData[i]}`);

            // Check if the frequency value exceeds the audible threshold
            if (audioData[i] > particleBeatTracking.audibleThreshold) {
                //50% loader than base threshold
                if (!beatDetected && audioData[i] > particleBeatTracking.audibleThreshold * 2) {
                    console.log("loud beat detected");
                    beatDetected = true;
                    beatIntensity = audioData[i] / 256;
                }

                // Calculate the angle for this particle
                let angle = i * angleIncrement + baseAngle;
                let pos = { x: canvasWidth / 2, y: canvasHeight / 2 };
                pos.x += Math.cos(angle) * particleBeatTracking.spawnRadius; // You can adjust the radius here
                pos.y += Math.sin(angle) * particleBeatTracking.spawnRadius; // Same as above

                // Create and add a new particle for this frequency bin
                let p = new Particle(pos.x, pos.y, angle, i, 2.5, audioData[i] / 256 * 10);
                particles.push(p);

            }

        }

        // particles.forEach(p => p.pulseRadius());

        // Reset beat tracking after spawning particles
        particleBeatTracking.beatCutOff = average * 1.5;
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
        // Map the particle's index to a position in the waveform data
        let waveformIndex = Math.floor(index * (audioDataWaveform.length / particles.length));
        let waveformValue = audioDataWaveform[waveformIndex];
        p.update(waveformValue); // Pass the corresponding waveform value
        p.draw(ctx);

        // Remove the particle if it's no longer visible

        //  p.move();
        //p.updateBasedOnMusic(audioData);
        //   p.draw(ctx);
        if (p.alpha <= p.alphaFadePerFrame || p.radius <= -p.radiusGrowthPerFrame) {

            particles.splice(index, 1);
        }
    });
};
const clearParticles = () => {
    particles.forEach((p, index) => {
        p.runaway = true;
        //particles.splice(index, 1);

    });

}
function drawVignette(beatIntensity) {
    // Determine the inner radius based on the beat intensity
    // The more intense the beat, the larger the inner radius (less vignette)
    let baseInnerRadius = canvasWidth / 4; // Adjust based on your canvas size and preferences
    let innerRadius = baseInnerRadius + (beatIntensity * 50); // Increase radius based on beat intensity

    // Determine the opacity based on the beat intensity
    // The more intense the beat, the less opaque the vignette
    let baseOpacity = 0.8; // Adjust based on your preferences
    let opacity = Math.max(0, baseOpacity - (beatIntensity * 0.2)); // Decrease opacity based on beat intensity

    // Create the gradient for the vignette effect
    let outerRadius = Math.max(canvasWidth, canvasHeight) / 2;
    let gradient = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, innerRadius, canvasWidth / 2, canvasHeight / 2, outerRadius);
    gradient.addColorStop(0, `rgba(0,0,0,0)`);
    gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);

    // Apply the vignette effect
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
}
const createStars = (count) => {
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            size: Math.random() * 1.5
        });
    }
}

const drawStars = () => {
    stars.forEach(star => {
        ctx.save();
        ctx.fillStyle = '#FFF'; // Star color
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}


const draw = (params = {}) => {
    // 1 - populate the audioData array with the frequency data from the analyserNode
    // notice these arrays are passed "by reference" 
    analyserNode.getByteTimeDomainData(audioDataWaveform);
    if (params.showWaveform) {
        audioData = audioDataWaveform;
    }
    else {
        analyserNode.getByteFrequencyData(audioData);
    }
    beatDetected = false;

    if (params.showStars)
        drawStars();

    drawAudioVisualizer(params);



    if (!beatDetected) { // Assuming you have a way to detect beats
        beatIntensity = Math.max(0, beatIntensity - vignetteFadeSpeed); // Gradually decrease
    }

    if (params.showVignette)
        drawVignette(beatIntensity);



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
        ctx.globalAlpha = params.showWaveform ? 1 : .5;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }
    // 4 - draw bars

    if (params.showBars) {

        let barSpacing = 4;
        let margin = 5;
        let screenWidthForBars = canvasWidth - (audioData.length * barSpacing) - margin * 2;
        let barWidth = screenWidthForBars / audioData.length;
        let barHeight = 200;
        let topSpacing = params.showWaveform ? 0 : 300;

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
    if (params.showLine) {
        let margin = 4; // Margin from the bottom of the canvas
        let height = canvasHeight - margin; // Y position for the line (near the bottom)
        let width = canvasWidth / audioData.length; // Width of each segment of the line

        ctx.save();
        ctx.beginPath();
        // Start from the bottom left, offset by the first audio data point
        ctx.moveTo(0, height - audioData[0]); // Adjust Y position based on audio data

        ctx.strokeStyle = utils.makeColor(255, 255, 255, 1);
        ctx.lineWidth = 3;

        for (let i = 1; i < audioData.length; i++) {
            // Draw line segments along the bottom of the screen
            ctx.lineTo(i * width, height - audioData[i]); // Adjust X and Y positions
        }
        // Do not close the path to avoid drawing a line back to the start point
        ctx.stroke(); // Apply the stroke to the path
        ctx.restore();
    }


}

export { setupCanvas, draw, clearParticles };
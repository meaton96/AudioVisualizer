import { Particle } from './particle.js';
import * as canvas from './canvas.js';
import { DEFAULTS } from './audio.js';
import { applySmoothing } from './utils.js';

let particles = [];
// Beat tracking parameters
let particleBeatTracking = {
    spawnRadius: 50,
    beatCutOff: 0,
    beatTime: 0,
    beatHoldTime: 2.5,
    beatDecayRate: 0.9,
    beatMin: .15,
    audibleThreshold: 115,
    bassEndBin: 2,
    veryLoudBeat: 230,
    letTheBassDrop: 254.9,
    bassEndVolume: 195,
    beatTrackBinEnd: 10,        //256 samples 172hz/bin
    bassDropped: false
};

const frequencyScaleFactor = .2; //percent
const trebleBoost = 1.5; //scalar
const trebleThreshold = 0.4; //percent

let bassBPM, bassBeatCounter = 0;
let frameCount = 0, beatFrames = 60;
let beatsPerMinuteSmoothed = [];
let beatSmoothSeconds = 3;
let previousLoudestFrequencyBin = 0;
let loudestFrequencyBin = 0;

//toggle on the bass drop effect by increases base radius, speed, and frequency responsiveness
const dropTheBass = () => {
    if (bassBPM < 2) return;
    console.log("bassDropped!");
    Particle.particleControls.baseSpeed = 5;
    Particle.particleControls.baseRadius = 15;
    Particle.particleControls.frequencyResponsiveness *= 2;
    particleBeatTracking.bassDropped = true;
    canvas.changeStarsOnBassDrop(); //also change the stars
}
//toggle off the bass drop effect by decreasing base radius, speed, and frequency responsiveness
const endBassDrop = () => {
    if (!particleBeatTracking.bassDropped) return;
    console.log("bassEnded!");
    Particle.particleControls.baseSpeed = Particle.defaultParticleControls.baseSpeed;
    Particle.particleControls.baseRadius = Particle.defaultParticleControls.baseRadius;
    Particle.particleControls.frequencyResponsiveness /= 2;
    particleBeatTracking.bassDropped = false;
    canvas.changeStarsBackToWhite();//also change the stars
};
//update the bass beats per minute
const updateBPM = (bassAverage, veryLoudBeatThreshold) => {

    //detect very loud bass beat only
    if (bassAverage > veryLoudBeatThreshold) {

        bassBeatCounter++;

        //calculate bpm every 60 frames
        if (frameCount >= beatFrames) {
            bassBPM = (bassBeatCounter / frameCount) * 60;
            beatsPerMinuteSmoothed.push(bassBPM);
            if (beatsPerMinuteSmoothed.length > beatSmoothSeconds)
                beatsPerMinuteSmoothed = beatsPerMinuteSmoothed.slice(1);
            let sum = 0;
            for (let i = 0; i < beatsPerMinuteSmoothed.length; i++) {
                sum += beatsPerMinuteSmoothed[i];
            }
            //reset counters, bpm is over 60 frames/1 second smoothed over 3 seconds
            bassBPM = sum / beatsPerMinuteSmoothed.length;
            frameCount = 0;
            bassBeatCounter = 0;
        }
    }
}

//calculate the average of the audio data
const calculateAverages = (audioData) => {
    let sum = 0;
    let bassData = applySmoothing(audioData.slice(0, particleBeatTracking.bassEndBin), 5);
    for (let i = 0; i < particleBeatTracking.bassEndBin; i++) {
        sum += bassData[i];
    }
    let bassAverage = sum / particleBeatTracking.bassEndBin;    //used to detect a change in bass pattern

    sum = 0;
    for (let i = 0; i < particleBeatTracking.beatTrackBinEnd; i++) {
        sum += audioData[i];
    }
    let average = sum / particleBeatTracking.beatTrackBinEnd;   //used to detect a beat

    return { average, bassAverage };
}
//used by the ui button to disable the ongoing bass effect if its on when the toggle is pressed
const toggleBassDropEnd = () => {
    if (particleBeatTracking.bassDropped) {
        endBassDrop();
    }
}
//check for a bass drop and initiate the effect
const checkForBassDrop = (bassAverage) => {
    
    if (Particle.particleControls.bassDropEffect &&
        !particleBeatTracking.bassDropped &&
        bassAverage > particleBeatTracking.letTheBassDrop) {
        dropTheBass();
    }
    else if (particleBeatTracking.bassDropped) {
        if (bassAverage > particleBeatTracking.letTheBassDrop) {
            canvas.changeStarsOnBassDrop();
        }
        else if (bassAverage < particleBeatTracking.bassEndVolume)
            toggleBassDropEnd();

    }
}

//create a particle in the given frequency bin at the given angle if the scaled audio data is above the audible threshold
const createParticle = (angleIncrement, i, audioData, average, canvasWidth, canvasHeight) => {
    // Scale the index to a value between 0 and 1
    const scaledIndex = i / (audioData.length - 1);
    // Convert the scaled index to a value between -1 and 1
    const percent = scaledIndex * 2 - 1;
    // Apply the scale factor
    const scaleAmount = 1 + frequencyScaleFactor * percent;
    // Scale the audio data by the scale amount
    const scaledAudioData = audioData[i] * scaleAmount * (i > audioData.length * trebleThreshold ? trebleBoost : 1);

    // Check if the frequency value exceeds the audible threshold
    if (scaledAudioData > particleBeatTracking.audibleThreshold) {

        if (audioData[i] > loudestFrequencyBin) {
            loudestFrequencyBin = i;
        }


        if (Particle.particleControls.bassDropEffect &&
            !canvas.getBeatDetected() &&
            audioData[i] > Particle.particleControls.veryLoudBeat) {
            canvas.detectVeryLoudBeat();

        }
        else if (average > particleBeatTracking.audibleThreshold * 2) {
            //twice as loud as the threshold
            //used for modifying the vignette
            canvas.detectBeat();

        }


        let angle = angleIncrement * i;
        let pos = { x: canvasWidth / 2, y: canvasHeight / 2 };
        pos.x += Math.cos(angle) * particleBeatTracking.spawnRadius; //radius of spawn from center
        pos.y += Math.sin(angle) * particleBeatTracking.spawnRadius;

        // Create and add a new particle 
        let p = new Particle(pos.x,
            pos.y,
            angle,
            i,
            Particle.particleControls.baseSpeed,
            audioData[i] / (DEFAULTS.numSamples - 1) * Particle.particleControls.baseRadius,
            previousLoudestFrequencyBin);

        particles.push(p);

    }
}
//calls the current particles move and draw functions
//also checks if there are particles to rmove
const updateAndDrawParticles = (audioDataWaveform, ctx) => {
    particles.forEach((p, index) => {
        // Map the particle's index to a position in the waveform data
        let waveformIndex = Math.floor(index * (audioDataWaveform.length / particles.length));
        let waveformValue = audioDataWaveform[waveformIndex];
        p.update(waveformValue); // Pass the corresponding waveform value
        p.draw(ctx);
        
        // Remove the particle if it's no longer visible
        if (p.alpha <= p.alphaFadePerFrame || p.radius <= -p.radiusGrowthPerFrame) {

            particles.splice(index, 1);
        }
    });
};
// Update the particles based on the audio data
const updateParticles = (audioData, audioDataWaveform, analyserNode, canvasWidth, canvasHeight, ctx) => {
    frameCount++;
    let { average, bassAverage } = calculateAverages(audioData);
    checkForBassDrop(bassAverage);

    // Calculate the angle increment for each frequency bin
    //detrmined by its bin and the circularization factor
    let angleIncrement = (Math.PI * 2) / (analyserNode.fftSize / Particle.particleControls.circularizationFactor);

    //
    if (average > particleBeatTracking.beatCutOff && average > particleBeatTracking.beatMin) {
        Particle.frequencyResponsivenessAdjusted = Particle.particleControls.frequencyResponsiveness + ((average - 230) / 100);

        updateBPM(bassAverage, particleBeatTracking.veryLoudBeat);
        // Iterate through all the bins of the frequency data
        for (let i = 0; i < audioData.length; i++) {
            createParticle(angleIncrement, i, audioData, average, canvasWidth, canvasHeight);
        }
        // Reset beat tracking after spawning particles
        previousLoudestFrequencyBin = loudestFrequencyBin;
        particleBeatTracking.beatCutOff = average * 1.5;
        particleBeatTracking.beatTime = 0;

    } else {
        if (particleBeatTracking.beatTime <= particleBeatTracking.beatHoldTime) {
            particleBeatTracking.beatTime++;
        } else {
            // Gradually decrease the beat cutoff
            particleBeatTracking.beatCutOff *= particleBeatTracking.beatDecayRate;
            particleBeatTracking.beatCutOff = Math.max(particleBeatTracking.beatCutOff, particleBeatTracking.beatMin);
        }
    }

    // Update and draw particles
    updateAndDrawParticles(audioDataWaveform, ctx);
};


//clear the projectiles by initiating scatter protocol 
const clearParticles = () => {
    particles.forEach((p) => {
        p.runaway = true;
    });
};





export { updateParticles, clearParticles, endBassDrop, toggleBassDropEnd };
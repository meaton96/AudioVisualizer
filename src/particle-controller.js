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
    audibleThreshold: 110,
    bassEndBin: 4,              //512 samples 86hz/bin ~ 344hz
    veryLoudBeat: 220,
    letTheBassDrop: 254.9,
    bassEndVolume: 195,
    beatTrackBinEnd: 20,        //512 samples 86 hz/bin ~ 1720hz
    bassDropped: false
};

const frequencyScaleFactor = .55; //percent
const trebleBoost = 1.4; //scalar
const trebleThreshold = .4; //percent

let bassBPM, bassBeatCounter = 0;
let frameCount = 0, beatFrames = 60;
let beatsPerMinuteSmoothed = [];
let beatSmoothFrames = 3;

const dropTheBass = () => {
    
    if (bassBPM < 2) return;
    console.log("bassDropped!");
    Particle.particleControls.baseSpeed = 5;
    Particle.particleControls.baseRadius = 15;
    Particle.particleControls.frequencyResponsiveness *= 2;
    particleBeatTracking.bassDropped = true;
    canvas.changeStarsOnBassDrop();
}
const endBassDrop = () => {
    if (!particleBeatTracking.bassDropped) return;
    console.log("bassEnded!");
    Particle.particleControls.baseSpeed = Particle.defaultParticleControls.baseSpeed;
    Particle.particleControls.baseRadius = Particle.defaultParticleControls.baseRadius;
    Particle.particleControls.frequencyResponsiveness /= 2;
    particleBeatTracking.bassDropped = false;
    canvas.changeStarsBackToWhite();
};
const updateBPM = (bassAverage, veryLoudBeatThreshold) => {
      
    if (bassAverage > veryLoudBeatThreshold) {
        
        bassBeatCounter++;
      //  console.log(frameCount); 
        if (frameCount >= beatFrames) {
            bassBPM = (bassBeatCounter / frameCount) * 60;
            beatsPerMinuteSmoothed.push(bassBPM);
            if (beatsPerMinuteSmoothed.length > beatSmoothFrames)
                beatsPerMinuteSmoothed = beatsPerMinuteSmoothed.slice(1);
            let sum = 0;
            for (let i = 0; i < beatsPerMinuteSmoothed.length; i++) {
                sum += beatsPerMinuteSmoothed[i];
            }
            bassBPM = sum / beatsPerMinuteSmoothed.length; //average the last 3 bpm
           // console.log(bassBPM);
            frameCount = 0;
            bassBeatCounter = 0;
        }
    }
}

// Update the particles based on the audio data
const updateParticles = (audioData, audioDataWaveform, analyserNode, canvasWidth, canvasHeight, ctx) => {
    frameCount++;
    //compute low frequency average
    let sum = 0;
    let bassData = applySmoothing(audioData.slice(0, particleBeatTracking.bassEndBin), 5);
    for (let i = 0; i < particleBeatTracking.bassEndBin; i++) {
        sum += bassData[i];
    }
    let bassAverage = sum / particleBeatTracking.bassEndBin;    //used to detect a change in bass pattern

    //console.log(bassAverage);
    sum = 0;
    for (let i = 0; i < particleBeatTracking.beatTrackBinEnd; i++) {
        sum += audioData[i];
    }
    let average = sum / particleBeatTracking.beatTrackBinEnd;
    // if (particleBeatTracking.bassDropped)
    //     //console.log(average);
    if (!particleBeatTracking.bassDropped && bassAverage > particleBeatTracking.letTheBassDrop) {
        dropTheBass();
    }
    else if (particleBeatTracking.bassDropped) {
        if (bassAverage > particleBeatTracking.letTheBassDrop) {
            canvas.changeStarsOnBassDrop();
        }
        else if (bassAverage < particleBeatTracking.bassEndVolume)
            endBassDrop();

    }
    let angleIncrement = (Math.PI * 2) / (analyserNode.fftSize / 2.35);
    //console.log(average);
    //use average to spawn particles
    if (average > particleBeatTracking.beatCutOff && average > particleBeatTracking.beatMin) {
        Particle.frequencyResponsivenessAdjusted = Particle.particleControls.frequencyResponsiveness + ((average - 230) / 100);
        // console.log(Particle.frequencyResponsivenessAdjusted);
        //increment beat counter if a loud bass beat is detected
        //for tracking bass bpm

      //  console.log(average);
        updateBPM(bassAverage, particleBeatTracking.veryLoudBeat);
        //flag a very loud beat to change stars/vignette
        if (!canvas.getBeatDetected() && average > Particle.particleControls.veryLoudBeat) {
            canvas.detectVeryLoudBeat();
           // console.log("very loud beat detected");

        }
        else if (average > particleBeatTracking.audibleThreshold * 2) {
            //twice as loud as the threshold
            //used for modifying the vignette
            canvas.detectBeat();
         //   console.log("loud beat detected");

        }


      //  console.log(average);
        // Iterate through all the bins of the frequency data
        for (let i = 0; i < audioData.length; i++) {
            //console.log(`${i} - ${audioData[i]}`);    



            // Scale the index to a value between 0 and 1
            const scaledIndex = i / (audioData.length - 1);
            // Convert the scaled index to a value between -1 and 1
            const percent = scaledIndex * 2 - 1;
            // Apply the scale factor
            const scaleAmount = 1 + frequencyScaleFactor * percent;


            //  console.log(i + " - " + audioData[i] * scaleAmount);

            const scaledAudioData = audioData[i] * scaleAmount * (i > audioData.length * trebleThreshold ? trebleBoost : 1);

            // Check if the frequency value exceeds the audible threshold
            if (scaledAudioData > particleBeatTracking.audibleThreshold) {


                


                // Calculate the angle for this particle
                let angle = i * angleIncrement;
                let pos = { x: canvasWidth / 2, y: canvasHeight / 2 };
                pos.x += Math.cos(angle) * particleBeatTracking.spawnRadius; //radius of spawn from center
                pos.y += Math.sin(angle) * particleBeatTracking.spawnRadius;

                // Create and add a new particle 
                let p = new Particle(pos.x, pos.y, angle, i, Particle.particleControls.baseSpeed, audioData[i] / (DEFAULTS.numSamples - 1) * Particle.particleControls.baseRadius);

                particles.push(p);

            }
        }
        // Reset beat tracking after spawning particles
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

//clear the projectiles by initiating scatter protocol 
const clearParticles = () => {
    particles.forEach((p) => {
        p.runaway = true;
    });
};





export { updateParticles, clearParticles, endBassDrop };
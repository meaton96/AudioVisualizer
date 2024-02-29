import { Particle } from './particle.js';
import { detectBeat, getBeatDetected } from './canvas.js';
import { DEFAULTS } from './audio.js';

let particles = [];
// Beat tracking parameters
let particleBeatTracking = {
    spawnRadius: 50,
    beatCutOff: 0,
    beatTime: 0,
    beatHoldTime: 2.5,
    beatDecayRate: 0.9,
    beatMin: .15,
    audibleThreshold: 120,
    bassEndBin: 5 
};
// Update the particles based on the audio data
const updateParticles = (audioData, audioDataWaveform, analyserNode, canvasWidth, canvasHeight, ctx) => {
    //compute low frequency average
    let sum = 0;
    for (let i = 0; i < particleBeatTracking.bassEndBin; i++) {
        sum += audioData[i];
    }
    let average = sum / particleBeatTracking.bassEndBin;
    let angleIncrement = (Math.PI * 2) / (analyserNode.fftSize / 2.35);
    //console.log(average);
    //use average to spawn particles
    if (average > particleBeatTracking.beatCutOff && average > particleBeatTracking.beatMin) {
        Particle.frequencyResponsivenessAdjusted = Particle.particleControls.frequencyResponsiveness + ((average - 230) / 100);
       // console.log(Particle.frequencyResponsivenessAdjusted);
        // Iterate through all the bins of the frequency data
        for (let i = 0; i < audioData.length; i++) {
            if (i === 0)
                console.log(audioData[i]);
            // Check if the frequency value exceeds the audible threshold
            if (audioData[i] > particleBeatTracking.audibleThreshold) {

                //twice as loud as the threshold
                //used for modifying the vignette
                if (!getBeatDetected() && audioData[i] > particleBeatTracking.audibleThreshold * 2) {
                    
                    detectBeat();
                }

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



export { updateParticles, clearParticles };
import { setWaveFormDeviation } from './canvas.js'
// particle.js
export class Particle {

    static defaultParticleControls = {
        angularVelocity: .01,
        friction: 0.995,
        alphaFadePerFrame: .002,
        radiusGrowthPerFrame: 0.05,
        speedMultiplier: 1,
        frequencyResponsiveness: 1,
        baseRadius: 10,
        baseSpeed: 2.5,
        minHue: 0,    
        maxHue: 360 
    };
    static particleControls = { ...Particle.defaultParticleControls };
    static frequencyResponsivenessAdjusted = 1;

    constructor(x, y, angle, frequencyBin, speed = 2.5, radius = 5) {
        this.x = x;             // x-coordinate                 
        this.y = y;            // y-coordinate              
        this.radius = radius;   // radius
        this.speed = speed;         // speed
        const hueRange = Particle.particleControls.maxHue - Particle.particleControls.minHue;
        const hue = Particle.particleControls.minHue + (angle / Math.PI * 180) * (hueRange / 360);
        this.color = `hsl(${hue}, 100%, 50%)`;
        //this.color = `hsl(${angle / Math.PI * 180}, 100%, 50%`; // color
        this.angle = angle;     // angle            
        this.frequencyBin = frequencyBin;       // frequencyBin 0-255
        this.angularVelocity = Particle.particleControls.angularVelocity;              // angular velocity
        this.friction = Particle.particleControls.friction;                  // friction
        this.alphaFadePerFrame = Particle.particleControls.alphaFadePerFrame;        // alpha fade per frame   
        this.radiusGrowthPerFrame = Particle.particleControls.radiusGrowthPerFrame;       // radius growth per frame
        this.runaway = false;                // runaway     (scatter effect)
        this.ran = false;                   // ran
        this.vx = Math.cos(angle) * speed;      // velocity x
        this.vy = Math.sin(angle) * speed;          // velocity y

        this.alpha = 1.0; // full opacity
    }
    // Update the particle
    update = (waveformValue) => {
        //called when turning off the song to scatter particles
        if (this.runaway) {
            this.handleRunaway();
        }
        else {

            // Calculate deviation from center (128) of waveformValue
            let deviation = (waveformValue - 128) / (32 / (Particle.frequencyResponsivenessAdjusted ?? 1));
            setWaveFormDeviation(deviation);


            this.move(deviation);
            this.adjustAlpha(deviation);
            this.adjustRadius(deviation);


        }
    }
    //handle moving the particle
    move = (deviation) => {
        // Use waveform deviation to alter the particle's speed and direction
        this.x += this.vx * (1 + deviation);
        this.y += this.vy * (1 + deviation);

        this.angle += this.angularVelocity * (1 + Math.abs(deviation));
        this.vx = Math.cos(this.angle) * this.speed * Particle.particleControls.speedMultiplier;
        this.vy = Math.sin(this.angle) * this.speed * Particle.particleControls.speedMultiplier;

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
    }
    //called when the user changes the particle controls
    updateControls = () => {
        this.angularVelocity = Particle.particleControls.angularVelocity;              // angular velocity
        this.friction = Particle.particleControls.friction;                  // friction
        this.alphaFadePerFrame = Particle.particleControls.alphaFadePerFrame;        // alpha fade per frame   
        this.radiusGrowthPerFrame = Particle.particleControls.radiusGrowthPerFrame;       // radius growth per frame
    }
    // Grow faster with louder sound
    adjustRadius = (deviation) => {
        this.radius += this.radiusGrowthPerFrame * (1 + Math.abs(deviation));
    }
    // Fade faster with louder sound
    adjustAlpha = (deviation) => {
        this.alpha -= this.alphaFadePerFrame * (1 + Math.abs(deviation));
        if (this.alpha < 0) this.alpha = 0; // Ensure alpha doesn't go negative
    }
    //scatter effect
    handleRunaway = () => {
        if (!this.ran) {
            this.vx = Math.random() * 20 - 10;
            this.vy = Math.random() * 20 - 10;
            this.ran = true;
        }
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.alphaFadePerFrame * 2;
        if (this.alpha < 0) this.alpha = 0;
    }
    // Draw the particle
    draw = (ctx) => {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
    }

}

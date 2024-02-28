import * as utils from './utils.js';
// particle.js
export class Particle {
    constructor(x, y, angle, speed = 2, radius = 8) {
        this.x = x;
        this.y = y;
        this.changeBeat = false;
        this.radius = radius;
        this.speed = speed;
        this.color = `hsl(${angle / Math.PI * 180}, 100%, 50%`;
        this.angle = angle;
        this.angularVelocity = .01;
        //console.log(angle);
        // Convert angle to radians for velocity calculation
        // let radians = angle * Math.PI / 180;
        // Adjust speed if necessary
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.alpha = 1.0; // full opacity
    }
    swapAngularVelocity = () => {
        this.angularVelocity *= -1;
    }

    move = () => {
        this.x += this.vx;
        this.y += this.vy;

        // Update the angle for the next move
        this.angle += this.angularVelocity;

        // Recalculate velocity based on the new angle
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        // Apply friction
        this.vx *= 0.993;
        this.vy *= 0.993;

        // Fade out and grow
        this.alpha -= 0.006;
        this.radius += 0.05;
    }

    draw = (ctx) => {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (!this.changeBeat) {
            this.changeBeat = true;
        }
        else {
           // this.color = this.incrementHue(this.color, 10);
            this.changeBeat = false;
        }


        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
    }
    incrementHue(incrementPercentage) {
        // Extract the hue value from the string
        const hueStart = this.color.indexOf('(') + 1;
        const hueEnd = this.color.indexOf(',', hueStart);
        let hueValue = parseFloat(this.color.substring(hueStart, hueEnd));
    
        // Calculate the new hue value, increment by 10% of 360 (36 degrees)
        hueValue += 360 * (incrementPercentage / 100);
        
        // Ensure the hue value wraps around if it exceeds 360
        hueValue = hueValue % 360;

        this.color = `hsl(${hueValue}, 100%, 50%)`;;
    }

}

let stars = [];

let starSpeed = 1;
let starFriction = .9999;


const createStars = (count, canvasWidth, canvasHeight, ctx) => {
    for (let i = 0; i < count; i++) {
        stars.push(
            new Star(Math.random() * canvasWidth * 2 - canvasWidth,
                Math.random() * canvasHeight * 2 - canvasHeight,
                Math.random() * 5,
                0,
                0,
                '#FFF',
                ctx));
    }
}

const changeStarsDirection = () => {
    stars.forEach(star => {
        star.vx = Math.random() * starSpeed * 2 - starSpeed;
        star.vy = Math.random() * starSpeed * 2 - starSpeed;
    });

}
const drawStars = () => {
    for (let i = 0; i < stars.length; i++) {
        stars[i].draw();
    }
}
const stopStars = () => {
    stars.forEach(star => {
        star.vx = 0;
        star.vy = 0;
    });
}
const updateStars = (deviation) => {
    stars.forEach(star => star.move(deviation));
}

class Star {
    constructor(x, y, size, vx, vy, color, ctx, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.ctx = ctx;
        this.canvasHeight = canvasHeight;
        this.canvasWidth = canvasWidth;
    }
    move = (deviation) => {
        this.x += this.vx * (1 + deviation); 
        this.y += this.vy * (1 + deviation);
        if (this.x > this.canvasWidth * 2) {
            this.x = -this.canvasWidth;
        }
        if (this.x < -this.canvasWidth) {
            this.x = this.canvasWidth * 2;
        }
        if (this.y > this.canvasHeight * 2) {
            this.y = -this.canvasHeight;
        }
        if (this.y < -this.canvasHeight) {
            this.y = this.canvasHeight * 2;
        }
        this.vx *= starFriction;
        this.vy *= starFriction;

        
    }
    draw = () => {
        this.ctx.save();
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
}
export { createStars, drawStars, updateStars, changeStarsDirection, stopStars};
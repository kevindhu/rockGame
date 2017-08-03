function Asteroid(asteroidInfo, client) {
    this.id = asteroidInfo.id;
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    this.radius = asteroidInfo.radius;

    this.client = client;
}

Asteroid.prototype.update = function (asteroidInfo) {
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    this.radius = asteroidInfo.radius;
    this.currPath = asteroidInfo.currPath;
    this.queuePosition = asteroidInfo.queuePosition;
    this.targetPt = asteroidInfo.targetPt;
};


Asteroid.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.lineWidth = 2;

    ctx.beginPath();


    ctx.fillStyle = "#ff1f1c";
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.closePath();

    if (this.currPath && 1===2) {
        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.arc(this.currPath.x, this.currPath.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }

    if (this.queuePosition && 1===2) {
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.arc(this.queuePosition.x, this.queuePosition.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }


    if (this.targetPt && 1===2) {
        ctx.beginPath();
        ctx.fillStyle = "pink";
        ctx.arc(this.targetPt.x, this.targetPt.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }

};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Asteroid;
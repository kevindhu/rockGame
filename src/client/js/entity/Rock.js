function Rock(asteroidInfo, client) {
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    this.client = client;
}

Rock.prototype.update = function (asteroidInfo) {
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;

    ctx.fillStyle = "purple";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
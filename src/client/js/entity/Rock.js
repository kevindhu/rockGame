function Rock(rockInfo, client) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.vertices = rockInfo.vertices;
    this.theta = rockInfo.theta;
    this.client = client;
}

Rock.prototype.update = function (rockInfo) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.queuePosition = rockInfo.queuePosition;
    this.theta = rockInfo.theta;
    this.owner = rockInfo.owner;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var SCALE = 100;
    var v = this.vertices;

    ctx.fillStyle = "purple";
    ctx.translate(this.x, this.y);
    ctx.beginPath();


    ctx.rotate(this.theta);
    ctx.moveTo(v[0][0] * SCALE, v[0][1] * SCALE);

    for (var i = 1; i < v.length; i++) {
        ctx.lineTo(v[i][0] * SCALE, v[i][1] * SCALE);
    }
    ctx.lineTo(v[0][0] * SCALE, v[0][1] * SCALE);

    ctx.fill();

    ctx.strokeStyle = !this.owner ? "yellow" : "green";

    ctx.stroke();
    ctx.rotate(2 * Math.PI - this.theta);
    ctx.closePath();
    ctx.translate(-this.x, -this.y);
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
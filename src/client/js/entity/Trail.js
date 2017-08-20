function Trail(client) {
    this.path = [];
    this.client = client;
}

Trail.prototype.updateList = function (x,y) {
    this.path.push({
        x: x,
        y: y
    });

    if (this.path.length > 50) {
        this.path.splice(0,1);
    }
};

Trail.prototype.show = function () {
    var playerX = this.client.SELF_PLAYER.x;
    var playerY = this.client.SELF_PLAYER.y;

    var ctx = this.client.mainCtx;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(126, 138, 158, 0.3)";
    ctx.lineWidth = 20;

    if (this.path.length <= 0) {
        return;
    }

    ctx.moveTo(playerX + this.path[this.path.length - 1].x,
        playerY + this.path[this.path.length - 1].y);

    var i;
    for (i = this.path.length - 2; i>=0; i--) {
        ctx.lineTo(playerX + this.path[i].x, playerY + this.path[i].y);
    }

    ctx.stroke();
    ctx.closePath();


};


module.exports = Trail;


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
function Rock(rockInfo, client) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.vertices = rockInfo.vertices;
    this.theta = rockInfo.theta;
    this.texture = rockInfo.texture;
    this.client = client;
}

Rock.prototype.update = function (rockInfo) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.queuePosition = rockInfo.queuePosition; //delete
    this.theta = rockInfo.theta;
    this.owner = rockInfo.owner;
    this.tempNeutral = rockInfo.tempNeutral;
    this.health = rockInfo.health;
    this.maxHealth = rockInfo.maxHealth;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var SCALE = 100;
    var v = this.vertices;


    switch (this.texture) {
        case "bronze":
            ctx.fillStyle = "brown";
            break;
        case "silver":
            ctx.fillStyle = "grey";
            break;
        case "gold":
            ctx.fillStyle = "yellow";
            break;
    }
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
    ctx.strokeStyle = this.tempNeutral ? "blue" : this.tempNeutral;

    ctx.stroke();
    ctx.rotate(2 * Math.PI - this.theta);
    ctx.closePath();
    ctx.translate(-this.x, -this.y);


    if (this.health && this.maxHealth) { //health bar
        console.log("HELTH");
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 100, 20);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x, this.y, 100 * this.health / this.maxHealth, 20);
        ctx.fill();
        ctx.closePath();
    } //display health bar
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
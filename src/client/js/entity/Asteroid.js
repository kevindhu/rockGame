function Asteroid(asteroidInfo, client) {
    this.id = asteroidInfo.id;
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    this.radius = asteroidInfo.radius;
    this.health = asteroidInfo.health;
    this.maxHealth = asteroidInfo.maxHealth;
    this.material = asteroidInfo.material;
    this.theta = asteroidInfo.theta;
    this.thetas = asteroidInfo.thetas;
    this.radii = [];
    this.colors = [];
    this.addRadii();
    this.addColors();
    this.client = client;
}

Asteroid.prototype.update = function (asteroidInfo) {
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    if (this.radius !== asteroidInfo.radius) {
        this.radius = asteroidInfo.radius;
        this.addRadii();
    }
    this.currPath = asteroidInfo.currPath;
    this.queuePosition = asteroidInfo.queuePosition;
    this.targetPt = asteroidInfo.targetPt;
    this.maxHealth = asteroidInfo.maxHealth;
    this.theta = asteroidInfo.theta;
    this.shooting = asteroidInfo.shooting;
    if (this.health !== asteroidInfo.health) {
        this.updateRadii((this.health - asteroidInfo.health) / this.maxHealth);
        this.health = asteroidInfo.health;
    }
};


Asteroid.prototype.show = function () {
    var radius, i;
    var ctx = this.client.mainCtx;
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (this.material === "sulfer") {
        ctx.fillStyle = "rgb(239,213,123)";
    }
    else if (this.material === "copper") {
        ctx.fillStyle = "rgb(239,213,123)";
    }

    if (this.shooting) {
        ctx.fillStyle = "purple";
    }


    var x, y, theta, startX, startY;
    theta = this.theta;
    startX = this.radius * Math.cos(theta);
    startY = this.radius * Math.sin(theta);
    ctx.moveTo(this.x + startX, this.y + startY);

    for (i = 0; i <= this.thetas.length; i++) {
        theta = this.theta + this.thetas[i];
        radius = this.radii[i];

        x = radius * Math.cos(theta);
        y = radius * Math.sin(theta);
        ctx.lineTo(this.x + x, this.y + y);
    }
    ctx.lineTo(this.x + startX, this.y + startY);
    ctx.fill();
    ctx.closePath();


    var l = this.thetas.length;
    //add low-poly
    for (i = 1; i <= l; i++) {
        var ind = (((i - 1) % l) + l) % l;

        var pre = {
            x: Math.floor(this.radii[ind] * Math.cos(this.theta + this.thetas[ind])),
            y: Math.floor(this.radii[ind] * Math.sin(this.theta + this.thetas[ind]))
        };
        var post = {
            x: Math.floor(this.radii[i] * Math.cos(this.theta + this.thetas[i])),
            y: Math.floor(this.radii[i] * Math.sin(this.theta + this.thetas[i]))
        };


        ctx.beginPath();
        ctx.fillStyle = this.colors[i];


        ctx.moveTo(this.x + pre.x, this.y + pre.y);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + post.x, this.y + post.y);
        ctx.lineTo(this.x + pre.x, this.y + pre.y);

        ctx.fill();
        //ctx.stroke();
        ctx.closePath();
    }

    var pre = {
        x: this.radii[0] * Math.cos(this.theta + this.thetas[0]),
        y: this.radii[0] * Math.sin(this.theta + this.thetas[0])
    };

    var post = {
        x: this.radii[l-1] * Math.cos(this.theta + this.thetas[l-1]),
        y: this.radii[l-1] * Math.sin(this.theta + this.thetas[l-1])
    };

    ctx.fillStyle = "rgb(239,213,123)";

    startX = this.radius * Math.cos(this.theta) + this.x;
    startY = this.radius * Math.sin(this.theta) + this.y;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(this.x + pre.x, this.y + pre.y);
    ctx.lineTo(this.x, this.y);
    ctx.lineTo(this.x + post.x, this.y + post.y);

    ctx.fill();

    ctx.closePath();





    if (this.currPath) {
        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.arc(this.currPath.x, this.currPath.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }
    if (this.queuePosition && 1 === 2) {
        ctx.beginPath();
        ctx.fillStyle = "yellow";
        ctx.arc(this.queuePosition.x, this.queuePosition.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }
    if (this.targetPt && 1 === 2) {
        ctx.beginPath();
        ctx.fillStyle = "pink";
        ctx.arc(this.targetPt.x, this.targetPt.y, 10, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }


    if (this.health && this.maxHealth) { //health bar
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


Asteroid.prototype.addRadii = function () {
    for (var i = 0; i < this.thetas.length; i++) {
        this.radii[i] = this.radius;
    }
};

Asteroid.prototype.addColors = function () {
    var rgb = {};
    for (var i = 0; i < this.thetas.length; i++) {
        rgb = {
            r: Math.floor(229 + getRandom(-20, 10)),
            g: Math.floor(213 + getRandom(-20, 10)),
            b: Math.floor(133 + getRandom(-20, 10))
        };
        this.colors[i] = "rgb(" + rgb.r + "," +
            rgb.g + "," + rgb.b + ")";
    }
};


Asteroid.prototype.updateRadii = function (amount) {
    var delta = amount;
    var radii = [];
    var i = Math.round(getRandom(0, this.radii.length - 1));

    this.radii[i] = this.radii[i] - getRandom(0, delta);
}


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Asteroid;
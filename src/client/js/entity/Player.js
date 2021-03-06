function Player(reader, client) {
    if (!reader) {
        this.client = client;
        return; //for fake rock purposes
    }

    this.id = reader.readUInt32(); //player id
    this.x = reader.readUInt32() / 100; //real x
    this.y = reader.readUInt32() / 100; //real y

    this.radius = reader.readUInt16(); //radius

    var nameLength = reader.readUInt8();
    var name = "";

    for (var i = 0; i < nameLength; i++) {
        var char = String.fromCharCode(reader.readUInt8());
        name += char;
    }
    this.name = name;

    this.vertices = [];            //vertices
    var count = reader.readUInt8();
    for (var i = 0; i < count; i++) {
        this.vertices[i] = [];
        this.vertices[i][0] = reader.readInt16() / 1000;
        this.vertices[i][1] = reader.readInt16() / 1000;
    }

    this.health = reader.readUInt16(); //health
    this.maxHealth = reader.readUInt16(); //maxHealth

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level


    switch (reader.readUInt8()) {    //flags
        case 1:
            this.vulnerable = true;
            break;
        case 16:
            this.shooting = true;
            break;
        case 17:
            this.vulnerable = true;
            this.shooting = true;
            break;
    }

    this.client = client;

    if (!this.client.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.SELF_PLAYER = this;
    }

    this.mover = {
        x: 0,
        y: 0
    };

    this.realMover = {
        x: 0,
        y: 0
    };
}


Player.prototype.update = function (reader) {
    this.updateTimer = 50;
    this.x = reader.readUInt32() / 100; //real x
    this.y = reader.readUInt32() / 100; //real y

    var prev = this.realRadius;
    this.realRadius = reader.readUInt16(); //radius
    if (prev < this.realRadius && this.id === this.client.SELF_ID) {
        this.client.setScaleFactor(10 / this.realRadius);
    }
    if (this.radius === 100 || this.radius < prev) {
        this.client.setDefaultScaleFactor();
    }
    this.health = reader.readUInt16(); //health
    this.maxHealth = reader.readUInt16(); //maxHealth

    this.shootMeter = reader.readUInt8();

    this.theta = reader.readInt16() / 100; //theta
    this.level = reader.readUInt8(); //level

    this.vulnerable = false;
    this.shooting = false;
    switch (reader.readUInt8()) {    //flags
        case 1:
            this.vulnerable = true;
            break;
        case 16:
            this.shooting = true;
            break;
        case 17:
            this.vulnerable = true;
            this.shooting = true;
            break;
    }

};




Player.prototype.getTheta = function (target, origin) {
    this.theta = Math.atan2(target.y - origin.y, target.x - origin.x) % (2 * Math.PI);
};

Player.prototype.move = function (x, y) {
    var target = {
        x: this.x + x,
        y: this.y + y
    };
    var origin = {
        x: this.x,
        y: this.y
    };

    this.getTheta(target, origin);

    var normalVel = normal(x, y);
    if (normalVel < 1) {
        normalVel = 1;
    }

    var velBuffer = 3; //change soon

    this.x += 100 * x / normalVel / velBuffer;
    this.y += 100 * y / normalVel / velBuffer;
};


Player.prototype.show = function () {
    if (this.fake) {
        return;
    }
    if (!this.radius || this.radius <= 0) {
        this.radius = 100;
    }

    if (this.radius > this.realRadius) {
        console.log("Player radius greater than its updated value, bad!");
    }
    this.radius = lerp(this.radius, this.realRadius, 0.2);

    this.updateTimer -= 1;
    if (this.updateTimer <= 0) {
        console.log("DELETING PLAYER VIA TIMEOUT");
        delete this.client.PLAYER_LIST[this.id];
    }

    var ctx = this.client.mainCtx;
    var fillAlpha;
    var strokeAlpha;
    var i;


    fillAlpha = this.health / (4 * this.maxHealth);
    strokeAlpha = 1;

    ctx.font = "20px Arial";


    ctx.strokeStyle = "rgba(252, 102, 37," + strokeAlpha + ")";
    if (this.shooting) {
        ctx.fillStyle = "green";
    }
    else if (this.vulnerable) {
        ctx.fillStyle = "red";
    }
    else {
        ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    }
    ctx.lineWidth = 10;


    ctx.beginPath();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.theta);

    if (this.vertices) {
        var v = this.vertices;
        ctx.moveTo(v[0][0] * this.radius, v[0][1] * this.radius);
        for (i = 1; i < v.length; i++) {
            ctx.lineTo(v[i][0] * this.radius, v[i][1] * this.radius);
        }
        ctx.lineTo(v[0][0] * this.radius, v[0][1] * this.radius);
        ctx.fill();
        ctx.stroke();
    }
    else {
        ctx.fillRect(0, 0, 30, 30);
    }
    ctx.fill();
    ctx.stroke();
    ctx.rotate(2 * Math.PI - this.theta);

    if (!this.vulnerable) {
        if (this.health > this.maxHealth / 2) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
        }
        else {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        }

        ctx.arc(0, 0, this.radius * 2, 0, 2 * Math.PI);
        ctx.fill();
    } //add shield

    ctx.translate(-this.x, -this.y);
    ctx.closePath();


    if (this.health && this.maxHealth && this.health > 0) { //health bar
        if (this.health > this.maxHealth) {
            //console.log("PLAYER HAS TOO MUCH HEALTH: " + this.health, this.maxHealth);
        }
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x - this.radius * 4, this.y + this.radius * 2, this.radius * 8, this.radius);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x - this.radius * 4, this.y + this.radius * 2, this.radius * 8 * this.health / this.maxHealth, this.radius);
        ctx.fill();
        ctx.closePath();
    }
    if (this.shootMeter) { //shoot meter
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x - this.radius * 4, this.y + this.radius * 3, this.radius * 8, this.radius / 2);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.rect(this.x - this.radius * 4, this.y + this.radius * 3, this.radius * 8 * this.shootMeter / 30, this.radius / 2);
        ctx.fill();
        ctx.closePath();
    } //display health bar

    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.font = this.radius + "px Sans-serif";

    ctx.strokeStyle = "black";
    ctx.lineWidth = this.radius / 10;
    ctx.strokeText(this.name, this.x, this.y + (this.radius * 0.8) + this.radius * 2);

    ctx.fillStyle = "white";
    ctx.fillText(this.name, this.x, this.y + (this.radius * 0.8) + this.radius * 2);
    ctx.closePath();


    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function normal(x, y) {
    return Math.sqrt(x * x + y * y);
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


module.exports = Player;
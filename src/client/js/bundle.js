(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Entity = require('./entity');
var MainUI = require('./ui/MainUI');

function Client() {
    this.SELF_ID = null;
    this.SELF_PLAYER = null;
    this.TRAIL = null;

    this.SLASH = [];

    this.mouseMoveTimer = 0;
    this.init();
}

Client.prototype.init = function () {
    this.initSocket();
    this.initCanvases();
    this.initLists();
    this.initViewers();
};
Client.prototype.initSocket = function () {
    this.socket = io();
    this.socket.verified = false;

    this.socket.on('initVerification', this.verify.bind(this));
    this.socket.on('updateEntities', this.handlePacket.bind(this));
    this.socket.on('drawScene', this.drawScene.bind(this));
    this.socket.on('chatMessage', this.mainUI)
};
Client.prototype.initCanvases = function () {
    this.mainCanvas = document.getElementById("main_canvas");
    this.mainCanvas.style.border = '1px solid #000000';
    this.mainCanvas.style.visibility = "hidden";
    this.mainCtx = this.mainCanvas.getContext("2d");


    document.addEventListener("mousedown", function (event) {
        if (this.SELF_ID) {
            var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
            var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

            this.socket.emit("mouseDown", {
                id: this.SELF_ID,
                x: x,
                y: y
            });
        }
    }.bind(this));

    document.addEventListener("mouseup", function (event) {
        if (!this.CHAT_CLICK) {
            this.mainUI.gameUI.chatUI.close();
        }

        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

        this.socket.emit("mouseUp", {
            id: this.SELF_ID,
            x: x,
            y: y
        });

        this.CHAT_CLICK = false;
    }.bind(this));

    document.addEventListener("mousemove", function (event) {
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) -
            this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) -
            this.mainCanvas.height / 2) / this.scaleFactor;

        if (this.SELF_PLAYER && square(x) + square(y) > square(this.SELF_PLAYER.range)) {
            return;
        }
        if (this.active) {
            if (this.SLASH.length >= 2) {
                if (square(this.SLASH[0].x - this.SLASH[1].x) +
                square(this.SLASH[0].y - this.SLASH[1].y) > 300) {
                    this.socket.emit("slash", {
                        id: this.SELF_ID,
                        x: (this.SLASH[0].x + this.SLASH[1].x) / 2,
                        y: (this.SLASH[0].y + this.SLASH[1].y) / 2
                    });
                }
                this.SLASH = [];
            }
            else {
                this.SLASH.push(
                    {
                        x: x,
                        y: y
                    });
            }
            return;
        }




        if (!this.pre) {
            this.pre = {
                x: x,
                y: y
            }
        }
        else if (square(this.pre.x - x) + square(this.pre.y - y) > 400) {
            this.pre = {
                x: x,
                y: y
            };
            this.socket.emit("mouseMove", {
                id: this.SELF_ID,
                x: x,
                y: y
            });
            this.TRAIL.updateList(x,y);
        }
    }.bind(this));
};



Client.prototype.initLists = function () {
    this.CONTROLLER_LIST = {};
    this.TILE_LIST = {};
    this.ASTEROID_LIST = {};
    this.ANIMATION_LIST = {};
};
Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 1;
    this.mainUI = new MainUI(this, this.socket);
    this.mainUI.playerNamerUI.open();
};

Client.prototype.verify = function (data) {
    if (!this.socket.verified) {
        console.log("VERIFIED CLIENT");
        this.socket.emit("verify", {});
        this.socket.verified = true;
    }
};

Client.prototype.handlePacket = function (data) {
    var packet, i;
    for (i = 0; i < data.length; i++) {
        packet = data[i];
        switch (packet.master) {
            case "add":
                this.addEntities(packet);
                break;
            case "delete":
                this.deleteEntities(packet);
                break;
            case "update":
                this.updateEntities(packet);
                break;
        }
    }
};

Client.prototype.addEntities = function (packet) {
    var addEntity = function (packet, list, entity, array) {
        if (!packet) {
            return;
        }
        list[packet.id] = new entity(packet, this);
        if (array && array.indexOf(packet.id) === -1) {
            array.push(packet.id);
        }
    }.bind(this);

    switch (packet.class) {
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "controllerInfo":
            addEntity(packet, this.CONTROLLER_LIST, Entity.Controller);
            break;
        case "asteroidInfo":
            addEntity(packet, this.ASTEROID_LIST, Entity.Asteroid);
        case "animationInfo":
            addEntity(packet, this.ANIMATION_LIST, Entity.Animation);
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.open(packet);
            }
            break;
        case "selfId":
            this.SELF_ID = packet.selfId;
            this.mainUI.gameUI.open();
            this.TRAIL = new Entity.Trail(this);
            break;
        case "chatInfo":
            this.mainUI.gameUI.chatUI.addMessage(packet);
            break;
    }
};

Client.prototype.updateEntities = function (packet) {
    function updateEntity(packet, list) {
        if (!packet) {
            return;
        }
        var entity = list[packet.id];
        if (!entity) {
            return;
        }
        entity.update(packet);
    }

    switch (packet.class) {
        case "controllerInfo":
            updateEntity(packet, this.CONTROLLER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
            break;
        case "asteroidInfo":
            updateEntity(packet, this.ASTEROID_LIST);
            break;
        case "homeInfo":
            updateEntity(packet, this.HOME_LIST);
            break;
        case "factionInfo":
            updateEntity(packet, this.FACTION_LIST);
            this.mainUI.updateLeaderBoard();
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.update(packet);
            }
            break;
    }
};

Client.prototype.deleteEntities = function (packet) {
    var deleteEntity = function (packet, list, array) {
        if (!packet) {
            return;
        }
        if (array) {
            var index = array.indexOf(packet.id);
            array.splice(index, 1);
        }
        delete list[packet.id];
    };

    switch (packet.class) {
        case "tileInfo":
            deleteEntity(packet, this.TILE_LIST);
            break;
        case "controllerInfo":
            deleteEntity(packet, this.CONTROLLER_LIST);
            break;
        case "asteroidInfo":
            deleteEntity(packet, this.ASTEROID_LIST);
            break;
        case "animationInfo":
            deleteEntity(packet, this.ANIMATION_LIST);
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.id) {
                this.mainUI.close(packet.action);
            }
            break;
    }
};

Client.prototype.drawScene = function (data) {
    var id;
    var entityList = [
        this.TILE_LIST,
        this.CONTROLLER_LIST,
        this.ASTEROID_LIST,
        this.ANIMATION_LIST
    ];
    var inBounds = function (player, x, y) {
        var range = this.mainCanvas.width / (0.7 * this.scaleFactor);
        return x < (player.x + range) && x > (player.x - range)
            && y < (player.y + range) && y > (player.y - range);
    }.bind(this);


    var translateScene = function () {
        this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.scaleFactor = lerp(this.scaleFactor, this.mainScaleFactor, 0.3);

        this.mainCtx.translate(this.mainCanvas.width / 2, this.mainCanvas.height / 2);
        this.mainCtx.scale(this.scaleFactor, this.scaleFactor);
        this.mainCtx.translate(-this.SELF_PLAYER.x, -this.SELF_PLAYER.y);
    }.bind(this);


    if (!this.SELF_PLAYER) {
        return;
    }

    this.mainCtx.clearRect(0, 0, 11000, 11000);

    this.mainCtx.fillStyle = "#1d1f21";
    this.mainCtx.fillRect(0, 0, 10000, 10000);


    for (var i = 0; i < entityList.length; i++) {
        var list = entityList[i];
        for (id in list) {
            var entity = list[id];
            if (inBounds(this.SELF_PLAYER, entity.x, entity.y)) {
                entity.show();
            }
        }
    }
    if (this.TRAIL && !this.active) {
        this.TRAIL.show();
    }

    translateScene();
};


function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


function square(a) {
    return a*a;
}

module.exports = Client;
},{"./entity":10,"./ui/MainUI":12}],2:[function(require,module,exports){
function Animation(animationInfo, client) {
    this.type = animationInfo.type;
    this.id = animationInfo.id;
    this.x = animationInfo.x;
    this.y = animationInfo.y;
    //this.theta = 15;
    this.timer = getRandom(10, 14);

    if (this.type === "slash") {
        this.pre = {
            x: this.x + getRandom(30, 70), 
            y: this.y + getRandom(30, 70)
        }
        this.post = {
            x: this.x - getRandom(30, 70),
            y: this.y - getRandom(30, 70)
        }
    }

    this.client = client;
}


Animation.prototype.show = function () {
    var home;
    var ctx = this.client.mainCtx;



    if (this.type === "slash") {
        ctx.beginPath();

        ctx.strokeStyle = "rgba(242, 31, 66, 0.6)";
        ctx.lineWidth = 15;

        ctx.moveTo(this.pre.x, this.pre.y);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.post.x, this.post.y);

        ctx.stroke();
        ctx.closePath();
    }
    

    if (this.type === "shardDeath") { //deprecated but could pull some good code from here
        ctx.font = 60 - this.timer + "px Arial";
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-Math.PI / 50 * this.theta);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 168, 86, " + this.timer * 10 / 100 + ")";
        ctx.fillText(this.name, 0, 15);
        ctx.restore();

        ctx.fillStyle = "#000000";
        this.theta = lerp(this.theta, 0, 0.08);
        this.x = lerp(this.x, this.endX, 0.1);
        this.y = lerp(this.y, this.endY, 0.1);
    }


    this.timer--;
    if (this.timer <= 0) {
        delete this.client.ANIMATION_LIST[this.id];
    }
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}

module.exports = Animation;



},{}],3:[function(require,module,exports){
function Arrow(x, y, client) {
    this.preX = x;
    this.preY = y;
    this.postX = x;
    this.postY = y;
    this.deltaX = function () {
        return this.postX - mainCanvas.width / 2;
    };
    this.deltaY = function () {
        return this.postY - mainCanvas.height / 2;
    };

    this.client = client;
}

Arrow.prototype.show = function () {
    var canvas = this.client.draftCanvas;
    var ctx = this.client.mainCtx;
    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELF_ID];
    var scaleFactor = this.client.scaleFactor;

    if (this.postX) {
        ctx.beginPath();
        ctx.strokeStyle = "#521522";
        ctx.fillStyle = "rgba(52, 175, 216, 0.3)";

        var preX = selfPlayer.x + (this.preX - canvas.width / 2) / scaleFactor;
        var preY = selfPlayer.y + (this.preY - canvas.height / 2) / scaleFactor;

        var postX = selfPlayer.x + (this.postX - canvas.width / 2) / scaleFactor;
        var postY = selfPlayer.y + (this.postY - canvas.height / 2) / scaleFactor;

        ctx.fillRect(preX, preY, postX - preX, postY - preY);

        ctx.arc(postX, postY, 3, 0, 2 * Math.PI, true);
        ctx.stroke();
        ctx.closePath();
    }

};


module.exports = Arrow;
},{}],4:[function(require,module,exports){
function Asteroid(asteroidInfo, client) {
    this.id = asteroidInfo.id;
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    this.radius = asteroidInfo.radius;
    this.health = asteroidInfo.health;
    this.maxHealth = asteroidInfo.maxHealth;
    this.material = asteroidInfo.material;
    this.displayTheta = asteroidInfo.displayTheta;
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
    this.displayTheta = asteroidInfo.displayTheta;
    this.targetPt = asteroidInfo.targetPt;
    this.maxHealth = asteroidInfo.maxHealth;
    this.shooting = asteroidInfo.shooting;
    if (this.health !== asteroidInfo.health) {
        this.updateRadii((this.health - asteroidInfo.health) / this.maxHealth);
        this.health = asteroidInfo.health;
    }
    this.glowing = asteroidInfo.glowing;
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

    if (this.glowing) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(244, 164, 66, 0.2)";
        ctx.arc(this.x, this.y, this.radius + 20, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }

    var x, y, theta, startX, startY;
    theta = this.displayTheta;
    startX = this.radius * Math.cos(theta);
    startY = this.radius * Math.sin(theta);
    ctx.moveTo(this.x + startX, this.y + startY);

    for (i = 0; i <= this.thetas.length; i++) {
        theta = this.displayTheta + this.thetas[i];
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
            x: Math.floor(this.radii[ind] * Math.cos(this.displayTheta + this.thetas[ind])),
            y: Math.floor(this.radii[ind] * Math.sin(this.displayTheta + this.thetas[ind]))
        };
        var post = {
            x: Math.floor(this.radii[i] * Math.cos(this.displayTheta + this.thetas[i])),
            y: Math.floor(this.radii[i] * Math.sin(this.displayTheta + this.thetas[i]))
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
        x: this.radii[0] * Math.cos(this.displayTheta + this.thetas[0]),
        y: this.radii[0] * Math.sin(this.displayTheta + this.thetas[0])
    };

    var post = {
        x: this.radii[l-1] * Math.cos(this.displayTheta + this.thetas[l-1]),
        y: this.radii[l-1] * Math.sin(this.displayTheta + this.thetas[l-1])
    };

    ctx.fillStyle = "rgb(239,213,123)";

    startX = this.radius * Math.cos(this.displayTheta) + this.x;
    startY = this.radius * Math.sin(this.displayTheta) + this.y;

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
},{}],5:[function(require,module,exports){
function Controller(controllerInfo, client) {
    this.id = controllerInfo.id;
    this.name = controllerInfo.name;
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level; //need to implement again
    this.radius = controllerInfo.radius;
    this.active = controllerInfo.active;
    this.range = controllerInfo.range;
    this.client = client;

    if (this.id = this.client.SELF_ID) {
        this.client.active = this.active; //probably should change this
        this.client.SELF_PLAYER = this;
    }
}

Controller.prototype.update = function (controllerInfo) {
    console.log("UPDATING");
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level;
    this.active = controllerInfo.active;
    if (this.radius !== controllerInfo.radius) {
        console.log("NEW RADIUS:"  + controllerInfo.radius);
    }
    this.radius = controllerInfo.radius;
    this.range = controllerInfo.range;

    if (this.id = this.client.SELF_ID) {
        this.client.active = this.active; //probably should change this
    }
    if (this.client.active) {
        this.client.TRAIL.realPath = [];
    }
};

Controller.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var selfId = this.client.SELF_ID;
    var fillAlpha;
    var strokeAlpha;
    var i;


    fillAlpha = this.health / (4 * this.maxHealth);
    strokeAlpha = 1;
    
    ctx.font = "20px Arial";

    if (this.range) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(196, 41, 54, 0.2)";
        ctx.arc(this.x, this.y, this.range, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }

    if (this.active) {
        ctx.strokeStyle = "rgba(202, 12, 37," + strokeAlpha + ")";
    }
    else {
        ctx.strokeStyle = "rgba(252, 102, 37," + strokeAlpha + ")";
    }

    ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    ctx.lineWidth = 10;

    ctx.beginPath();
    //draw player object
    
    var radius = this.radius;
    ctx.moveTo(this.x + radius, this.y);
    
    for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
        theta = i + getRandom(-(this.maxHealth / this.health) / 7, (this.maxHealth / this.health) / 7);
        x = radius * Math.cos(theta);
        y = radius * Math.sin(theta);
        ctx.lineTo(this.x + x, this.y + y);
    }
    ctx.lineTo(this.x + radius, this.y + 3);
    ctx.stroke();
    ctx.fill();
    

    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);

    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Controller;
},{}],6:[function(require,module,exports){
function Home(homeInfo, client) {
    this.id = homeInfo.id;
    this.x = homeInfo.x;
    this.y = homeInfo.y;
    this.name = homeInfo.owner;
    this.type = homeInfo.type;
    this.radius = homeInfo.radius;
    this.power = homeInfo.power;
    this.level = homeInfo.level;
    this.hasColor = homeInfo.hasColor;
    this.health = homeInfo.health;
    this.neighbors = homeInfo.neighbors;

    this.unitDmg = homeInfo.unitDmg;
    this.unitSpeed = homeInfo.unitSpeed;
    this.unitArmor = homeInfo.unitArmor;
    this.queue = homeInfo.queue;
    this.bots = homeInfo.bots;

    this.client = client;
}


Home.prototype.update = function (homeInfo) {
    this.level = homeInfo.level;
    this.radius = homeInfo.radius;
    this.power = homeInfo.power;
    this.health = homeInfo.health;
    this.hasColor = homeInfo.hasColor;
    this.neighbors = homeInfo.neighbors;
    this.unitDmg = homeInfo.unitDmg;
    this.unitSpeed = homeInfo.unitSpeed;
    this.unitArmor = homeInfo.unitArmor;
    this.queue = homeInfo.queue;
    this.bots = homeInfo.bots;
};

module.exports = Home;


Home.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.beginPath();
    if (this.neighbors.length >= 4) {
        ctx.fillStyle = "#4169e1";
    } else {
        ctx.fillStyle = "#396a6d";
    }

    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();

    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELF_ID];

    if (inBoundsClose(selfPlayer, this.x, this.y)) {
        if (this.faction)
            ctx.strokeStyle = "rgba(12, 255, 218, 0.7)";
        ctx.lineWidth = 10;
        ctx.stroke();
    }
    ctx.closePath();
};


function inBoundsClose(player, x, y) {
    var range = 150;
    return x < (player.x + range) && x > (player.x - 5 / 4 * range)
        && y < (player.y + range) && y > (player.y - 5 / 4 * range);
}

},{}],7:[function(require,module,exports){
function MiniMap() { //deprecated, please update
}

MiniMap.prototype.draw = function () {
    if (mapTimer <= 0 || serverMap === null) {
        var tileLength = Math.sqrt(Object.size(TILE_LIST));
        if (tileLength === 0 || !selfPlayer) {
            return;
        }
        var imgData = mainCtx.createImageData(tileLength, tileLength);
        var tile;
        var tileRGB;
        var i = 0;


        for (var id in TILE_LIST) {
            tileRGB = {};
            tile = TILE_LIST[id];
            if (tile.color && tile.alert || inBounds(selfPlayer, tile.x, tile.y)) {
                tileRGB.r = tile.color.r;
                tileRGB.g = tile.color.g;
                tileRGB.b = tile.color.b;
            }
            else {
                tileRGB.r = 0;
                tileRGB.g = 0;
                tileRGB.b = 0;
            }

            imgData.data[i] = tileRGB.r;
            imgData.data[i + 1] = tileRGB.g;
            imgData.data[i + 2] = tileRGB.b;
            imgData.data[i + 3] = 255;
            i += 4;
        }
        console.log(400 / Object.size(TILE_LIST));
        imgData = scaleImageData(imgData, Math.floor(400 / Object.size(TILE_LIST)), mainCtx);

        mMapCtx.putImageData(imgData, 0, 0);

        mMapCtxRot.rotate(90 * Math.PI / 180);
        mMapCtxRot.scale(1, -1);
        mMapCtxRot.drawImage(mMap, 0, 0);
        mMapCtxRot.scale(1, -1);
        mMapCtxRot.rotate(270 * Math.PI / 180);

        serverMap = mMapRot;
        mapTimer = 25;
    }

    else {
        mapTimer -= 1;
    }

    mainCtx.drawImage(serverMap, 800, 400);
}; //deprecated

MiniMap.prototype.scaleImageData = function (imageData, scale, mainCtx) {
    var scaled = mainCtx.createImageData(imageData.width * scale, imageData.height * scale);
    var subLine = mainCtx.createImageData(scale, 1).data;
    for (var row = 0; row < imageData.height; row++) {
        for (var col = 0; col < imageData.width; col++) {
            var sourcePixel = imageData.data.subarray(
                (row * imageData.width + col) * 4,
                (row * imageData.width + col) * 4 + 4
            );
            for (var x = 0; x < scale; x++) subLine.set(sourcePixel, x * 4)
            for (var y = 0; y < scale; y++) {
                var destRow = row * scale + y;
                var destCol = col * scale;
                scaled.data.set(subLine, (destRow * scaled.width + destCol) * 4)
            }
        }
    }

    return scaled;
};

module.exports = MiniMap;
},{}],8:[function(require,module,exports){
function Tile(thisInfo, client) {
    this.id = thisInfo.id;
    this.x = thisInfo.x;
    this.y = thisInfo.y;
    this.length = thisInfo.length;
    this.color = thisInfo.color;
    this.topColor = {
        r: this.color.r + 10,
        g: this.color.g + 10,
        b: this.color.b + 10
    };
    this.borderColor = {
        r: this.color.r - 10,
        g: this.color.g - 10,
        b: this.color.b - 10
    };
    this.alert = thisInfo.alert;
    this.random = Math.floor(getRandom(0, 3));

    this.client = client;
}

Tile.prototype.update = function (thisInfo) {
    this.color = thisInfo.color;
    this.topColor = {
        r: this.color.r + 100,
        g: this.color.g + 100,
        b: this.color.b + 100
    };
    this.borderColor = {
        r: this.color.r - 10,
        g: this.color.g - 10,
        b: this.color.b - 10
    };
    this.alert = thisInfo.alert;
};

Tile.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.beginPath();

    ctx.strokeStyle = "rgb(" + this.borderColor.r + "," + this.borderColor.g + "," + this.borderColor.b + ")";
    ctx.lineWidth = 20;


    var grd = ctx.createLinearGradient(this.x + this.length * 3/4, this.y, this.x + this.length/4, this.y + this.length);
    grd.addColorStop(0, "rgb(" + this.topColor.r + "," + this.topColor.g + "," + this.topColor.b + ")");
    grd.addColorStop(1, "rgb(" + this.color.r + "," + this.color.g + "," + this.color.b + ")");
    ctx.fillStyle = grd;


    ctx.rect(this.x + 30, this.y + 30, this.length - 30, this.length - 30);

    ctx.stroke();
    ctx.fill();


};


module.exports = Tile;


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
},{}],9:[function(require,module,exports){
function Trail(client) {
    this.realPath = [];
    this.client = client;
}

Trail.prototype.updateList = function (x,y) {
    var currX = this.client.SELF_PLAYER.x + x;
    var currY = this.client.SELF_PLAYER.y + y;

    this.realPath.push({
        x: currX,
        y: currY
    });

    if (this.realPath.length > 18) {
        this.realPath.splice(0,1);
    }
}

Trail.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(126, 138, 158, 0.3)";
    ctx.lineWidth = 20;

    if (this.realPath.length <= 0) {
        return;
    }

    ctx.moveTo(this.realPath[this.realPath.length - 1].x, 
        this.realPath[this.realPath.length - 1].y);

    var i;
    for (i = this.realPath.length - 2; i>=0; i--) {
        ctx.lineTo(this.realPath[i].x, this.realPath[i].y);
    }

    ctx.stroke();
    ctx.closePath();


};


module.exports = Trail;


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}
},{}],10:[function(require,module,exports){
module.exports = {
    Animation: require('./Animation'),
    Arrow: require('./Arrow'),
    Controller: require('./Controller'),
    Home: require('./Home'),
    MiniMap: require('./MiniMap'),
    Tile: require('./Tile'),
    Asteroid: require('./Asteroid'),
    Trail: require('./Trail')
};
},{"./Animation":2,"./Arrow":3,"./Asteroid":4,"./Controller":5,"./Home":6,"./MiniMap":7,"./Tile":8,"./Trail":9}],11:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();


document.onkeydown = function (event) {
    if (client.CHAT_OPEN) {
        return;
    }
    client.keys[event.keyCode] = true;
    client.socket.emit('keyEvent', {id: event.keyCode, state: true});
};

document.onkeyup = function (event) {
    if (event.keyCode === 84) {
        client.mainUI.gameUI.chatUI.textInput.click();
    }
    client.keys[event.keyCode] = false;
    client.socket.emit('keyEvent', {id: event.keyCode, state: false});
};


$(window).bind('mousewheel DOMMouseScroll', function (event) {
    if (event.ctrlKey === true) {
        event.preventDefault();
    }
    if (client.CHAT_SCROLL) {
        client.CHAT_SCROLL = false;
        return;
    }

    if(event.originalEvent.wheelDelta /120 > 0 && client.mainScaleFactor < 4) {
        client.mainScaleFactor += 0.2;
    }
    else if (client.mainScaleFactor > 0.4) {
        client.mainScaleFactor -= 0.2;
    }
});

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":1,"./ui/MainUI":12}],12:[function(require,module,exports){
document.documentElement.style.overflow = 'hidden';  // firefox, chrome
document.body.scroll = "no";

var PlayerNamerUI = require('./PlayerNamerUI');
var GameUI = require('./game/GameUI');

function MainUI(client, socket) {
    this.client = client;
    this.socket = socket;

    this.gameUI = new GameUI(this.client, this.socket, this);

    this.playerNamerUI = new PlayerNamerUI(this.client, this.socket);
}

MainUI.prototype.open = function (info) {
    var action = info.action;
    var home;
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.open(info.message);
    }
};


MainUI.prototype.close = function (action) {
    if (action === "gameMsgPrompt") {
        this.gameUI.gameMsgPrompt.close();
    }
};


MainUI.prototype.updateLeaderBoard = function () {
    var leaderboard = document.getElementById("leaderboard");
    var PLAYER_ARRAY = this.client.PLAYEr_ARRAY;


    var playerSort = function (a, b) {
        var factionA = this.client.CONTROLLER_LIST[a];
        var factionB = this.client.CONTROLLER_LIST[b];
        return factionA.score - factionB.score;
    }.bind(this);

    PLAYER_ARRAY.sort(playerSort);
    leaderboard.innerHTML = "";

    for (var i = PLAYER_ARRAY.length - 1; i >= 0; i--) {
        var player = this.client.CONTROLLER_LIST[PLAYER_ARRAY[i]];

        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(player.name + " - " + player.score));
        leaderboard.appendChild(entry);
    }
};



module.exports = MainUI;
},{"./PlayerNamerUI":13,"./game/GameUI":16}],13:[function(require,module,exports){
function PlayerNamerUI (client, socket) {
    this.client = client;
    this.socket = socket;

    this.leaderboard = document.getElementById("leaderboard_container");
    this.nameBtn = document.getElementById("nameSubmit");
    this.playerNameInput = document.getElementById("playerNameInput");
    this.playerNamer = document.getElementById("player_namer");
}

PlayerNamerUI.prototype.open = function () {
    this.playerNameInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            this.nameBtn.click();
        }
    }.bind(this));

    this.nameBtn.addEventListener("click", function () {
        this.client.mainCanvas.style.visibility = "visible";
        this.leaderboard.style.visibility = "visible";
        this.socket.emit("newPlayer",
            {
                name: this.playerNameInput.value,
            });
        this.playerNamer.style.display = 'none';
    }.bind(this));

    this.playerNamer.style.visibility = "visible";
    this.playerNameInput.focus();
    this.leaderboard.style.visibility = "hidden";
};

module.exports = PlayerNamerUI;
},{}],14:[function(require,module,exports){
function ChatUI(parent) {
    this.parent = parent;
    this.template = document.getElementById("chat_container");
    this.textInput = document.getElementById('chat_input');
    this.chatList = document.getElementById('chat_list');


    this.textInput.addEventListener('click', function () {
        this.textInput.focus();

        this.parent.client.CHAT_OPEN = true;
        this.chatList.style.height = "80%";
        this.chatList.style.overflowY = "auto";

        this.textInput.style.background = "rgba(34, 48, 71, 1)";
    }.bind(this));
    this.textInput.addEventListener('keydown', function (e) {
        if (e.keyCode === 13) {
            this.sendMessage();
        }
    }.bind(this));


    this.template.addEventListener('mousewheel', function () {
        this.parent.client.CHAT_SCROLL = true;
    }.bind(this));

    this.template.addEventListener('mousedown', function () {
        this.parent.client.CHAT_CLICK = true;
    }.bind(this));
}

ChatUI.prototype.open = function (message) {
    this.template.style.display = "block";
    this.close();
};


ChatUI.prototype.close = function () {
    this.textInput.blur();
    this.parent.client.CHAT_OPEN = false;
    this.chatList.style.height = "30%";
    this.chatList.style.background = "rgba(182, 193, 211, 0.02)";
    this.textInput.style.background = "rgba(182, 193, 211, 0.1)";
    this.parent.client.CHAT_SCROLL = false;
    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
    this.chatList.style.overflowY = "none";
};


ChatUI.prototype.addMessage = function (packet) {
    var entry = document.createElement('li');
    entry.appendChild(document.createTextNode(packet.name + " : " + packet.chatMessage));
    this.chatList.appendChild(entry);

    $('#chat_list').animate({scrollTop: $('#chat_list').prop("scrollHeight")}, 100);
};


ChatUI.prototype.sendMessage = function () {
    var socket = this.parent.socket;


    if (this.textInput.value && this.textInput.value !== "") {
        socket.emit('chatMessage', {
            id: this.parent.client.SELFID,
            message: this.textInput.value
        });
        this.textInput.value = "";
    }
    this.close();
};

module.exports = ChatUI;



},{}],15:[function(require,module,exports){
function GameMsgPrompt(parent) {
    this.parent = parent;
    this.template = document.getElementById("prompt_container");
    this.message = document.getElementById('game_msg_prompt');
}

GameMsgPrompt.prototype.open = function (message) {
    this.template.style.display = "block";
    this.message.innerHTML = message;
};

GameMsgPrompt.prototype.close = function () {
    this.template.style.display = "none";
};

module.exports = GameMsgPrompt;



},{}],16:[function(require,module,exports){
var GameMsgPrompt = require('./GameMsgPrompt');
var ChatUI = require('./ChatUI');

function GameUI(client, socket, parent) {
    this.client = client;
    this.socket = socket;
    this.parent = parent;
    this.gameMsgPrompt = new GameMsgPrompt(this);
    this.chatUI = new ChatUI(this);
}

GameUI.prototype.open = function () {
    console.log("OPENING GAME UI");
    this.chatUI.open();
};

module.exports =  GameUI;
},{"./ChatUI":14,"./GameMsgPrompt":15}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQXN0ZXJvaWQuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9Db250cm9sbGVyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L01pbmlNYXAuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVHJhaWwuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9pbmRleC5qcyIsInNyYy9jbGllbnQvanMvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL3VpL01haW5VSS5qcyIsInNyYy9jbGllbnQvanMvdWkvUGxheWVyTmFtZXJVSS5qcyIsInNyYy9jbGllbnQvanMvdWkvZ2FtZS9DaGF0VUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZU1zZ1Byb21wdC5qcyIsInNyYy9jbGllbnQvanMvdWkvZ2FtZS9HYW1lVUkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEVudGl0eSA9IHJlcXVpcmUoJy4vZW50aXR5Jyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGX0lEID0gbnVsbDtcclxuICAgIHRoaXMuU0VMRl9QTEFZRVIgPSBudWxsO1xyXG4gICAgdGhpcy5UUkFJTCA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5TTEFTSCA9IFtdO1xyXG5cclxuICAgIHRoaXMubW91c2VNb3ZlVGltZXIgPSAwO1xyXG4gICAgdGhpcy5pbml0KCk7XHJcbn1cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaW5pdFNvY2tldCgpO1xyXG4gICAgdGhpcy5pbml0Q2FudmFzZXMoKTtcclxuICAgIHRoaXMuaW5pdExpc3RzKCk7XHJcbiAgICB0aGlzLmluaXRWaWV3ZXJzKCk7XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFNvY2tldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuc29ja2V0ID0gaW8oKTtcclxuICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5zb2NrZXQub24oJ2luaXRWZXJpZmljYXRpb24nLCB0aGlzLnZlcmlmeS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMuc29ja2V0Lm9uKCd1cGRhdGVFbnRpdGllcycsIHRoaXMuaGFuZGxlUGFja2V0LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2RyYXdTY2VuZScsIHRoaXMuZHJhd1NjZW5lLmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ2NoYXRNZXNzYWdlJywgdGhpcy5tYWluVUkpXHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdENhbnZhc2VzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5tYWluQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluX2NhbnZhc1wiKTtcclxuICAgIHRoaXMubWFpbkNhbnZhcy5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkICMwMDAwMDAnO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm1vdXNlRG93blwiLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuQ0hBVF9DTElDSykge1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibW91c2VVcFwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgIHk6IHlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5DSEFUX0NMSUNLID0gZmFsc2U7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtXHJcbiAgICAgICAgICAgIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC1cclxuICAgICAgICAgICAgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuU0VMRl9QTEFZRVIgJiYgc3F1YXJlKHgpICsgc3F1YXJlKHkpID4gc3F1YXJlKHRoaXMuU0VMRl9QTEFZRVIucmFuZ2UpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNMQVNILmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3F1YXJlKHRoaXMuU0xBU0hbMF0ueCAtIHRoaXMuU0xBU0hbMV0ueCkgK1xyXG4gICAgICAgICAgICAgICAgc3F1YXJlKHRoaXMuU0xBU0hbMF0ueSAtIHRoaXMuU0xBU0hbMV0ueSkgPiAzMDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwic2xhc2hcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiAodGhpcy5TTEFTSFswXS54ICsgdGhpcy5TTEFTSFsxXS54KSAvIDIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6ICh0aGlzLlNMQVNIWzBdLnkgKyB0aGlzLlNMQVNIWzFdLnkpIC8gMlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5TTEFTSCA9IFtdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5TTEFTSC5wdXNoKFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wcmUpIHtcclxuICAgICAgICAgICAgdGhpcy5wcmUgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZSh0aGlzLnByZS54IC0geCkgKyBzcXVhcmUodGhpcy5wcmUueSAtIHkpID4gNDAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge1xyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm1vdXNlTW92ZVwiLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuVFJBSUwudXBkYXRlTGlzdCh4LHkpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5DT05UUk9MTEVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLkFTVEVST0lEX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QgPSB7fTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Vmlld2VycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5tYWluVUkucGxheWVyTmFtZXJVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnZlcmlmeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc29ja2V0LnZlcmlmaWVkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJWRVJJRklFRCBDTElFTlRcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5oYW5kbGVQYWNrZXQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHBhY2tldCwgaTtcclxuICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcGFja2V0ID0gZGF0YVtpXTtcclxuICAgICAgICBzd2l0Y2ggKHBhY2tldC5tYXN0ZXIpIHtcclxuICAgICAgICAgICAgY2FzZSBcImFkZFwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJkZWxldGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwidXBkYXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFkZEVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGFkZEVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGVudGl0eSwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxpc3RbcGFja2V0LmlkXSA9IG5ldyBlbnRpdHkocGFja2V0LCB0aGlzKTtcclxuICAgICAgICBpZiAoYXJyYXkgJiYgYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKHBhY2tldC5pZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCwgRW50aXR5LkNvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYXN0ZXJvaWRJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuQVNURVJPSURfTElTVCwgRW50aXR5LkFzdGVyb2lkKTtcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNULCBFbnRpdHkuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLm9wZW4ocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2VsZklkXCI6XHJcbiAgICAgICAgICAgIHRoaXMuU0VMRl9JRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5vcGVuKCk7XHJcbiAgICAgICAgICAgIHRoaXMuVFJBSUwgPSBuZXcgRW50aXR5LlRyYWlsKHRoaXMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY2hhdEluZm9cIjpcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLmNoYXRVSS5hZGRNZXNzYWdlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS51cGRhdGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eShwYWNrZXQsIGxpc3QpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnRpdHkudXBkYXRlKHBhY2tldCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYXN0ZXJvaWRJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuQVNURVJPSURfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJob21lSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkhPTUVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmYWN0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkZBQ1RJT05fTElTVCk7XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLnVwZGF0ZUxlYWRlckJvYXJkKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRl9JRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS51cGRhdGUocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZGVsZXRlRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZGVsZXRlRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcnJheSkge1xyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBhcnJheS5pbmRleE9mKHBhY2tldC5pZCk7XHJcbiAgICAgICAgICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlbGV0ZSBsaXN0W3BhY2tldC5pZF07XHJcbiAgICB9O1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImNvbnRyb2xsZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFzdGVyb2lkSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFTVEVST0lEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIGlkO1xyXG4gICAgdmFyIGVudGl0eUxpc3QgPSBbXHJcbiAgICAgICAgdGhpcy5USUxFX0xJU1QsXHJcbiAgICAgICAgdGhpcy5DT05UUk9MTEVSX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BU1RFUk9JRF9MSVNULFxyXG4gICAgICAgIHRoaXMuQU5JTUFUSU9OX0xJU1RcclxuICAgIF07XHJcbiAgICB2YXIgaW5Cb3VuZHMgPSBmdW5jdGlvbiAocGxheWVyLCB4LCB5KSB7XHJcbiAgICAgICAgdmFyIHJhbmdlID0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gKDAuNyAqIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSByYW5nZSlcclxuICAgICAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gcmFuZ2UpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICB2YXIgdHJhbnNsYXRlU2NlbmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuXHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSh0aGlzLm1haW5DYW52YXMud2lkdGggLyAyLCB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNjYWxlKHRoaXMuc2NhbGVGYWN0b3IsIHRoaXMuc2NhbGVGYWN0b3IpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUoLXRoaXMuU0VMRl9QTEFZRVIueCwgLXRoaXMuU0VMRl9QTEFZRVIueSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG5cclxuICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxTdHlsZSA9IFwiIzFkMWYyMVwiO1xyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxSZWN0KDAsIDAsIDEwMDAwLCAxMDAwMCk7XHJcblxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHModGhpcy5TRUxGX1BMQVlFUiwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLlRSQUlMICYmICF0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIHRoaXMuVFJBSUwuc2hvdygpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzcXVhcmUoYSkge1xyXG4gICAgcmV0dXJuIGEqYTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW1hdGlvbkluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy50eXBlID0gYW5pbWF0aW9uSW5mby50eXBlO1xyXG4gICAgdGhpcy5pZCA9IGFuaW1hdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBhbmltYXRpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhbmltYXRpb25JbmZvLnk7XHJcbiAgICAvL3RoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICB0aGlzLnByZSA9IHtcclxuICAgICAgICAgICAgeDogdGhpcy54ICsgZ2V0UmFuZG9tKDMwLCA3MCksIFxyXG4gICAgICAgICAgICB5OiB0aGlzLnkgKyBnZXRSYW5kb20oMzAsIDcwKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBvc3QgPSB7XHJcbiAgICAgICAgICAgIHg6IHRoaXMueCAtIGdldFJhbmRvbSgzMCwgNzApLFxyXG4gICAgICAgICAgICB5OiB0aGlzLnkgLSBnZXRSYW5kb20oMzAsIDcwKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcblxyXG5cclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNDIsIDMxLCA2NiwgMC42KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuXHJcbiAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnByZS54LCB0aGlzLnByZS55KTtcclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgubGluZVRvKHRoaXMucG9zdC54LCB0aGlzLnBvc3QueSk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNoYXJkRGVhdGhcIikgeyAvL2RlcHJlY2F0ZWQgYnV0IGNvdWxkIHB1bGwgc29tZSBnb29kIGNvZGUgZnJvbSBoZXJlXHJcbiAgICAgICAgY3R4LmZvbnQgPSA2MCAtIHRoaXMudGltZXIgKyBcInB4IEFyaWFsXCI7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucm90YXRlKC1NYXRoLlBJIC8gNTAgKiB0aGlzLnRoZXRhKTtcclxuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMTY4LCA4NiwgXCIgKyB0aGlzLnRpbWVyICogMTAgLyAxMDAgKyBcIilcIjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCAwLCAxNSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xyXG4gICAgICAgIHRoaXMudGhldGEgPSBsZXJwKHRoaXMudGhldGEsIDAsIDAuMDgpO1xyXG4gICAgICAgIHRoaXMueCA9IGxlcnAodGhpcy54LCB0aGlzLmVuZFgsIDAuMSk7XHJcbiAgICAgICAgdGhpcy55ID0gbGVycCh0aGlzLnksIHRoaXMuZW5kWSwgMC4xKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdGhpcy50aW1lci0tO1xyXG4gICAgaWYgKHRoaXMudGltZXIgPD0gMCkge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmNsaWVudC5BTklNQVRJT05fTElTVFt0aGlzLmlkXTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFuaW1hdGlvbjtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBBcnJvdyh4LCB5LCBjbGllbnQpIHtcclxuICAgIHRoaXMucHJlWCA9IHg7XHJcbiAgICB0aGlzLnByZVkgPSB5O1xyXG4gICAgdGhpcy5wb3N0WCA9IHg7XHJcbiAgICB0aGlzLnBvc3RZID0geTtcclxuICAgIHRoaXMuZGVsdGFYID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RYIC0gbWFpbkNhbnZhcy53aWR0aCAvIDI7XHJcbiAgICB9O1xyXG4gICAgdGhpcy5kZWx0YVkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zdFkgLSBtYWluQ2FudmFzLmhlaWdodCAvIDI7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5BcnJvdy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjYW52YXMgPSB0aGlzLmNsaWVudC5kcmFmdENhbnZhcztcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRl9JRF07XHJcbiAgICB2YXIgc2NhbGVGYWN0b3IgPSB0aGlzLmNsaWVudC5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICBpZiAodGhpcy5wb3N0WCkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM1MjE1MjJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDUyLCAxNzUsIDIxNiwgMC4zKVwiO1xyXG5cclxuICAgICAgICB2YXIgcHJlWCA9IHNlbGZQbGF5ZXIueCArICh0aGlzLnByZVggLSBjYW52YXMud2lkdGggLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciBwcmVZID0gc2VsZlBsYXllci55ICsgKHRoaXMucHJlWSAtIGNhbnZhcy5oZWlnaHQgLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB2YXIgcG9zdFggPSBzZWxmUGxheWVyLnggKyAodGhpcy5wb3N0WCAtIGNhbnZhcy53aWR0aCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHBvc3RZID0gc2VsZlBsYXllci55ICsgKHRoaXMucG9zdFkgLSBjYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHByZVgsIHByZVksIHBvc3RYIC0gcHJlWCwgcG9zdFkgLSBwcmVZKTtcclxuXHJcbiAgICAgICAgY3R4LmFyYyhwb3N0WCwgcG9zdFksIDMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFycm93OyIsImZ1bmN0aW9uIEFzdGVyb2lkKGFzdGVyb2lkSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gYXN0ZXJvaWRJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gYXN0ZXJvaWRJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhc3Rlcm9pZEluZm8ueTtcclxuICAgIHRoaXMucmFkaXVzID0gYXN0ZXJvaWRJbmZvLnJhZGl1cztcclxuICAgIHRoaXMuaGVhbHRoID0gYXN0ZXJvaWRJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gYXN0ZXJvaWRJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMubWF0ZXJpYWwgPSBhc3Rlcm9pZEluZm8ubWF0ZXJpYWw7XHJcbiAgICB0aGlzLmRpc3BsYXlUaGV0YSA9IGFzdGVyb2lkSW5mby5kaXNwbGF5VGhldGE7XHJcbiAgICB0aGlzLnRoZXRhcyA9IGFzdGVyb2lkSW5mby50aGV0YXM7XHJcbiAgICB0aGlzLnJhZGlpID0gW107XHJcbiAgICB0aGlzLmNvbG9ycyA9IFtdO1xyXG4gICAgdGhpcy5hZGRSYWRpaSgpO1xyXG4gICAgdGhpcy5hZGRDb2xvcnMoKTtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5Bc3Rlcm9pZC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGFzdGVyb2lkSW5mbykge1xyXG4gICAgdGhpcy54ID0gYXN0ZXJvaWRJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhc3Rlcm9pZEluZm8ueTtcclxuICAgIGlmICh0aGlzLnJhZGl1cyAhPT0gYXN0ZXJvaWRJbmZvLnJhZGl1cykge1xyXG4gICAgICAgIHRoaXMucmFkaXVzID0gYXN0ZXJvaWRJbmZvLnJhZGl1cztcclxuICAgICAgICB0aGlzLmFkZFJhZGlpKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmN1cnJQYXRoID0gYXN0ZXJvaWRJbmZvLmN1cnJQYXRoO1xyXG4gICAgdGhpcy5xdWV1ZVBvc2l0aW9uID0gYXN0ZXJvaWRJbmZvLnF1ZXVlUG9zaXRpb247XHJcbiAgICB0aGlzLmRpc3BsYXlUaGV0YSA9IGFzdGVyb2lkSW5mby5kaXNwbGF5VGhldGE7XHJcbiAgICB0aGlzLnRhcmdldFB0ID0gYXN0ZXJvaWRJbmZvLnRhcmdldFB0O1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBhc3Rlcm9pZEluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy5zaG9vdGluZyA9IGFzdGVyb2lkSW5mby5zaG9vdGluZztcclxuICAgIGlmICh0aGlzLmhlYWx0aCAhPT0gYXN0ZXJvaWRJbmZvLmhlYWx0aCkge1xyXG4gICAgICAgIHRoaXMudXBkYXRlUmFkaWkoKHRoaXMuaGVhbHRoIC0gYXN0ZXJvaWRJbmZvLmhlYWx0aCkgLyB0aGlzLm1heEhlYWx0aCk7XHJcbiAgICAgICAgdGhpcy5oZWFsdGggPSBhc3Rlcm9pZEluZm8uaGVhbHRoO1xyXG4gICAgfVxyXG4gICAgdGhpcy5nbG93aW5nID0gYXN0ZXJvaWRJbmZvLmdsb3dpbmc7XHJcbn07XHJcblxyXG5cclxuQXN0ZXJvaWQucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcmFkaXVzLCBpO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBpZiAodGhpcy5tYXRlcmlhbCA9PT0gXCJzdWxmZXJcIikge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYigyMzksMjEzLDEyMylcIjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHRoaXMubWF0ZXJpYWwgPT09IFwiY29wcGVyXCIpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2IoMjM5LDIxMywxMjMpXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuc2hvb3RpbmcpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJwdXJwbGVcIjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5nbG93aW5nKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjQ0LCAxNjQsIDY2LCAwLjIpXCI7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMgKyAyMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgeCwgeSwgdGhldGEsIHN0YXJ0WCwgc3RhcnRZO1xyXG4gICAgdGhldGEgPSB0aGlzLmRpc3BsYXlUaGV0YTtcclxuICAgIHN0YXJ0WCA9IHRoaXMucmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgc3RhcnRZID0gdGhpcy5yYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICBjdHgubW92ZVRvKHRoaXMueCArIHN0YXJ0WCwgdGhpcy55ICsgc3RhcnRZKTtcclxuXHJcbiAgICBmb3IgKGkgPSAwOyBpIDw9IHRoaXMudGhldGFzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhldGEgPSB0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2ldO1xyXG4gICAgICAgIHJhZGl1cyA9IHRoaXMucmFkaWlbaV07XHJcblxyXG4gICAgICAgIHggPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgfVxyXG4gICAgY3R4LmxpbmVUbyh0aGlzLnggKyBzdGFydFgsIHRoaXMueSArIHN0YXJ0WSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbiAgICB2YXIgbCA9IHRoaXMudGhldGFzLmxlbmd0aDtcclxuICAgIC8vYWRkIGxvdy1wb2x5XHJcbiAgICBmb3IgKGkgPSAxOyBpIDw9IGw7IGkrKykge1xyXG4gICAgICAgIHZhciBpbmQgPSAoKChpIC0gMSkgJSBsKSArIGwpICUgbDtcclxuXHJcbiAgICAgICAgdmFyIHByZSA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5mbG9vcih0aGlzLnJhZGlpW2luZF0gKiBNYXRoLmNvcyh0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2luZF0pKSxcclxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcih0aGlzLnJhZGlpW2luZF0gKiBNYXRoLnNpbih0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2luZF0pKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIHBvc3QgPSB7XHJcbiAgICAgICAgICAgIHg6IE1hdGguZmxvb3IodGhpcy5yYWRpaVtpXSAqIE1hdGguY29zKHRoaXMuZGlzcGxheVRoZXRhICsgdGhpcy50aGV0YXNbaV0pKSxcclxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcih0aGlzLnJhZGlpW2ldICogTWF0aC5zaW4odGhpcy5kaXNwbGF5VGhldGEgKyB0aGlzLnRoZXRhc1tpXSkpXHJcbiAgICAgICAgfTtcclxuXHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcnNbaV07XHJcblxyXG5cclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCArIHByZS54LCB0aGlzLnkgKyBwcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyBwb3N0LngsIHRoaXMueSArIHBvc3QueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyBwcmUueCwgdGhpcy55ICsgcHJlLnkpO1xyXG5cclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIC8vY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJlID0ge1xyXG4gICAgICAgIHg6IHRoaXMucmFkaWlbMF0gKiBNYXRoLmNvcyh0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzWzBdKSxcclxuICAgICAgICB5OiB0aGlzLnJhZGlpWzBdICogTWF0aC5zaW4odGhpcy5kaXNwbGF5VGhldGEgKyB0aGlzLnRoZXRhc1swXSlcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHBvc3QgPSB7XHJcbiAgICAgICAgeDogdGhpcy5yYWRpaVtsLTFdICogTWF0aC5jb3ModGhpcy5kaXNwbGF5VGhldGEgKyB0aGlzLnRoZXRhc1tsLTFdKSxcclxuICAgICAgICB5OiB0aGlzLnJhZGlpW2wtMV0gKiBNYXRoLnNpbih0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2wtMV0pXHJcbiAgICB9O1xyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYigyMzksMjEzLDEyMylcIjtcclxuXHJcbiAgICBzdGFydFggPSB0aGlzLnJhZGl1cyAqIE1hdGguY29zKHRoaXMuZGlzcGxheVRoZXRhKSArIHRoaXMueDtcclxuICAgIHN0YXJ0WSA9IHRoaXMucmFkaXVzICogTWF0aC5zaW4odGhpcy5kaXNwbGF5VGhldGEpICsgdGhpcy55O1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oc3RhcnRYLCBzdGFydFkpO1xyXG4gICAgY3R4LmxpbmVUbyh0aGlzLnggKyBwcmUueCwgdGhpcy55ICsgcHJlLnkpO1xyXG4gICAgY3R4LmxpbmVUbyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICBjdHgubGluZVRvKHRoaXMueCArIHBvc3QueCwgdGhpcy55ICsgcG9zdC55KTtcclxuXHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcblxyXG5cclxuXHJcblxyXG4gICAgaWYgKHRoaXMuY3VyclBhdGgpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMuY3VyclBhdGgueCwgdGhpcy5jdXJyUGF0aC55LCAxMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnF1ZXVlUG9zaXRpb24gJiYgMSA9PT0gMikge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJ5ZWxsb3dcIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMucXVldWVQb3NpdGlvbi54LCB0aGlzLnF1ZXVlUG9zaXRpb24ueSwgMTAsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy50YXJnZXRQdCAmJiAxID09PSAyKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInBpbmtcIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMudGFyZ2V0UHQueCwgdGhpcy50YXJnZXRQdC55LCAxMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgaWYgKHRoaXMuaGVhbHRoICYmIHRoaXMubWF4SGVhbHRoKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAyMCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcbn07XHJcblxyXG5cclxuQXN0ZXJvaWQucHJvdG90eXBlLmFkZFJhZGlpID0gZnVuY3Rpb24gKCkge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRoZXRhcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMucmFkaWlbaV0gPSB0aGlzLnJhZGl1cztcclxuICAgIH1cclxufTtcclxuXHJcbkFzdGVyb2lkLnByb3RvdHlwZS5hZGRDb2xvcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgcmdiID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudGhldGFzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgcmdiID0ge1xyXG4gICAgICAgICAgICByOiBNYXRoLmZsb29yKDIyOSArIGdldFJhbmRvbSgtMjAsIDEwKSksXHJcbiAgICAgICAgICAgIGc6IE1hdGguZmxvb3IoMjEzICsgZ2V0UmFuZG9tKC0yMCwgMTApKSxcclxuICAgICAgICAgICAgYjogTWF0aC5mbG9vcigxMzMgKyBnZXRSYW5kb20oLTIwLCAxMCkpXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmNvbG9yc1tpXSA9IFwicmdiKFwiICsgcmdiLnIgKyBcIixcIiArXHJcbiAgICAgICAgICAgIHJnYi5nICsgXCIsXCIgKyByZ2IuYiArIFwiKVwiO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkFzdGVyb2lkLnByb3RvdHlwZS51cGRhdGVSYWRpaSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcclxuICAgIHZhciBkZWx0YSA9IGFtb3VudDtcclxuICAgIHZhciByYWRpaSA9IFtdO1xyXG4gICAgdmFyIGkgPSBNYXRoLnJvdW5kKGdldFJhbmRvbSgwLCB0aGlzLnJhZGlpLmxlbmd0aCAtIDEpKTtcclxuXHJcbiAgICB0aGlzLnJhZGlpW2ldID0gdGhpcy5yYWRpaVtpXSAtIGdldFJhbmRvbSgwLCBkZWx0YSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXN0ZXJvaWQ7IiwiZnVuY3Rpb24gQ29udHJvbGxlcihjb250cm9sbGVySW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gY29udHJvbGxlckluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBjb250cm9sbGVySW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gY29udHJvbGxlckluZm8ueDtcclxuICAgIHRoaXMueSA9IGNvbnRyb2xsZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gY29udHJvbGxlckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy50aGV0YSA9IGNvbnRyb2xsZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsOyAvL25lZWQgdG8gaW1wbGVtZW50IGFnYWluXHJcbiAgICB0aGlzLnJhZGl1cyA9IGNvbnRyb2xsZXJJbmZvLnJhZGl1cztcclxuICAgIHRoaXMuYWN0aXZlID0gY29udHJvbGxlckluZm8uYWN0aXZlO1xyXG4gICAgdGhpcy5yYW5nZSA9IGNvbnRyb2xsZXJJbmZvLnJhbmdlO1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcblxyXG4gICAgaWYgKHRoaXMuaWQgPSB0aGlzLmNsaWVudC5TRUxGX0lEKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuYWN0aXZlID0gdGhpcy5hY3RpdmU7IC8vcHJvYmFibHkgc2hvdWxkIGNoYW5nZSB0aGlzXHJcbiAgICAgICAgdGhpcy5jbGllbnQuU0VMRl9QTEFZRVIgPSB0aGlzO1xyXG4gICAgfVxyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoY29udHJvbGxlckluZm8pIHtcclxuICAgIGNvbnNvbGUubG9nKFwiVVBEQVRJTkdcIik7XHJcbiAgICB0aGlzLnggPSBjb250cm9sbGVySW5mby54O1xyXG4gICAgdGhpcy55ID0gY29udHJvbGxlckluZm8ueTtcclxuICAgIHRoaXMuaGVhbHRoID0gY29udHJvbGxlckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBjb250cm9sbGVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnRoZXRhID0gY29udHJvbGxlckluZm8udGhldGE7XHJcbiAgICB0aGlzLmxldmVsID0gY29udHJvbGxlckluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLmFjdGl2ZSA9IGNvbnRyb2xsZXJJbmZvLmFjdGl2ZTtcclxuICAgIGlmICh0aGlzLnJhZGl1cyAhPT0gY29udHJvbGxlckluZm8ucmFkaXVzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJORVcgUkFESVVTOlwiICArIGNvbnRyb2xsZXJJbmZvLnJhZGl1cyk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnJhZGl1cyA9IGNvbnRyb2xsZXJJbmZvLnJhZGl1cztcclxuICAgIHRoaXMucmFuZ2UgPSBjb250cm9sbGVySW5mby5yYW5nZTtcclxuXHJcbiAgICBpZiAodGhpcy5pZCA9IHRoaXMuY2xpZW50LlNFTEZfSUQpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5hY3RpdmUgPSB0aGlzLmFjdGl2ZTsgLy9wcm9iYWJseSBzaG91bGQgY2hhbmdlIHRoaXNcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmNsaWVudC5hY3RpdmUpIHtcclxuICAgICAgICB0aGlzLmNsaWVudC5UUkFJTC5yZWFsUGF0aCA9IFtdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHNlbGZJZCA9IHRoaXMuY2xpZW50LlNFTEZfSUQ7XHJcbiAgICB2YXIgZmlsbEFscGhhO1xyXG4gICAgdmFyIHN0cm9rZUFscGhhO1xyXG4gICAgdmFyIGk7XHJcblxyXG5cclxuICAgIGZpbGxBbHBoYSA9IHRoaXMuaGVhbHRoIC8gKDQgKiB0aGlzLm1heEhlYWx0aCk7XHJcbiAgICBzdHJva2VBbHBoYSA9IDE7XHJcbiAgICBcclxuICAgIGN0eC5mb250ID0gXCIyMHB4IEFyaWFsXCI7XHJcblxyXG4gICAgaWYgKHRoaXMucmFuZ2UpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxOTYsIDQxLCA1NCwgMC4yKVwiO1xyXG4gICAgICAgIGN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMucmFuZ2UsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuYWN0aXZlKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDIwMiwgMTIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTIsIDEwMiwgMzcsXCIgKyBzdHJva2VBbHBoYSArIFwiKVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMTIzLDAsMCxcIiArIGZpbGxBbHBoYSArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIC8vZHJhdyBwbGF5ZXIgb2JqZWN0XHJcbiAgICBcclxuICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG4gICAgXHJcbiAgICBmb3IgKGkgPSBNYXRoLlBJIC8gNDsgaSA8PSAyICogTWF0aC5QSSAtIE1hdGguUEkgLyA0OyBpICs9IE1hdGguUEkgLyA0KSB7XHJcbiAgICAgICAgdGhldGEgPSBpICsgZ2V0UmFuZG9tKC0odGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3LCAodGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3KTtcclxuICAgICAgICB4ID0gcmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICAgIHkgPSByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcclxuICAgIH1cclxuICAgIGN0eC5saW5lVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkgKyAzKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBcclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjZmY5ZDYwXCI7XHJcbiAgICBjdHguZmlsbFRleHQodGhpcy5uYW1lLCB0aGlzLngsIHRoaXMueSArIDcwKTtcclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7IiwiZnVuY3Rpb24gSG9tZShob21lSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gaG9tZUluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBob21lSW5mby54O1xyXG4gICAgdGhpcy55ID0gaG9tZUluZm8ueTtcclxuICAgIHRoaXMubmFtZSA9IGhvbWVJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50eXBlID0gaG9tZUluZm8udHlwZTtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5sZXZlbCA9IGhvbWVJbmZvLmxldmVsO1xyXG4gICAgdGhpcy5oYXNDb2xvciA9IGhvbWVJbmZvLmhhc0NvbG9yO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuXHJcbiAgICB0aGlzLnVuaXREbWcgPSBob21lSW5mby51bml0RG1nO1xyXG4gICAgdGhpcy51bml0U3BlZWQgPSBob21lSW5mby51bml0U3BlZWQ7XHJcbiAgICB0aGlzLnVuaXRBcm1vciA9IGhvbWVJbmZvLnVuaXRBcm1vcjtcclxuICAgIHRoaXMucXVldWUgPSBob21lSW5mby5xdWV1ZTtcclxuICAgIHRoaXMuYm90cyA9IGhvbWVJbmZvLmJvdHM7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaG9tZUluZm8pIHtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZTtcclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBpZiAodGhpcy5uZWlnaGJvcnMubGVuZ3RoID49IDQpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjNDE2OWUxXCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMzOTZhNmRcIjtcclxuICAgIH1cclxuXHJcbiAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRl9JRF07XHJcblxyXG4gICAgaWYgKGluQm91bmRzQ2xvc2Uoc2VsZlBsYXllciwgdGhpcy54LCB0aGlzLnkpKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZmFjdGlvbilcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDEyLCAyNTUsIDIxOCwgMC43KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gaW5Cb3VuZHNDbG9zZShwbGF5ZXIsIHgsIHkpIHtcclxuICAgIHZhciByYW5nZSA9IDE1MDtcclxuICAgIHJldHVybiB4IDwgKHBsYXllci54ICsgcmFuZ2UpICYmIHggPiAocGxheWVyLnggLSA1IC8gNCAqIHJhbmdlKVxyXG4gICAgICAgICYmIHkgPCAocGxheWVyLnkgKyByYW5nZSkgJiYgeSA+IChwbGF5ZXIueSAtIDUgLyA0ICogcmFuZ2UpO1xyXG59XHJcbiIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7IC8vZGVwcmVjYXRlZCwgcGxlYXNlIHVwZGF0ZVxyXG59XHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKG1hcFRpbWVyIDw9IDAgfHwgc2VydmVyTWFwID09PSBudWxsKSB7XHJcbiAgICAgICAgdmFyIHRpbGVMZW5ndGggPSBNYXRoLnNxcnQoT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaWYgKHRpbGVMZW5ndGggPT09IDAgfHwgIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHRpbGVMZW5ndGgsIHRpbGVMZW5ndGgpO1xyXG4gICAgICAgIHZhciB0aWxlO1xyXG4gICAgICAgIHZhciB0aWxlUkdCO1xyXG4gICAgICAgIHZhciBpID0gMDtcclxuXHJcblxyXG4gICAgICAgIGZvciAodmFyIGlkIGluIFRJTEVfTElTVCkge1xyXG4gICAgICAgICAgICB0aWxlUkdCID0ge307XHJcbiAgICAgICAgICAgIHRpbGUgPSBUSUxFX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAodGlsZS5jb2xvciAmJiB0aWxlLmFsZXJ0IHx8IGluQm91bmRzKHNlbGZQbGF5ZXIsIHRpbGUueCwgdGlsZS55KSkge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gdGlsZS5jb2xvci5yO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gdGlsZS5jb2xvci5nO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gdGlsZS5jb2xvci5iO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaV0gPSB0aWxlUkdCLnI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMV0gPSB0aWxlUkdCLmc7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMl0gPSB0aWxlUkdCLmI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIGkgKz0gNDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaW1nRGF0YSA9IHNjYWxlSW1hZ2VEYXRhKGltZ0RhdGEsIE1hdGguZmxvb3IoNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSksIG1haW5DdHgpO1xyXG5cclxuICAgICAgICBtTWFwQ3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoOTAgKiBNYXRoLlBJIC8gMTgwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LmRyYXdJbWFnZShtTWFwLCAwLCAwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSgyNzAgKiBNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgc2VydmVyTWFwID0gbU1hcFJvdDtcclxuICAgICAgICBtYXBUaW1lciA9IDI1O1xyXG4gICAgfVxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIG1hcFRpbWVyIC09IDE7XHJcbiAgICB9XHJcblxyXG4gICAgbWFpbkN0eC5kcmF3SW1hZ2Uoc2VydmVyTWFwLCA4MDAsIDQwMCk7XHJcbn07IC8vZGVwcmVjYXRlZFxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuc2NhbGVJbWFnZURhdGEgPSBmdW5jdGlvbiAoaW1hZ2VEYXRhLCBzY2FsZSwgbWFpbkN0eCkge1xyXG4gICAgdmFyIHNjYWxlZCA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKGltYWdlRGF0YS53aWR0aCAqIHNjYWxlLCBpbWFnZURhdGEuaGVpZ2h0ICogc2NhbGUpO1xyXG4gICAgdmFyIHN1YkxpbmUgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShzY2FsZSwgMSkuZGF0YTtcclxuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IGltYWdlRGF0YS5oZWlnaHQ7IHJvdysrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgaW1hZ2VEYXRhLndpZHRoOyBjb2wrKykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlUGl4ZWwgPSBpbWFnZURhdGEuZGF0YS5zdWJhcnJheShcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCxcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCArIDRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBzY2FsZTsgeCsrKSBzdWJMaW5lLnNldChzb3VyY2VQaXhlbCwgeCAqIDQpXHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgc2NhbGU7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RSb3cgPSByb3cgKiBzY2FsZSArIHk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdENvbCA9IGNvbCAqIHNjYWxlO1xyXG4gICAgICAgICAgICAgICAgc2NhbGVkLmRhdGEuc2V0KHN1YkxpbmUsIChkZXN0Um93ICogc2NhbGVkLndpZHRoICsgZGVzdENvbCkgKiA0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzY2FsZWQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmlNYXA7IiwiZnVuY3Rpb24gVGlsZSh0aGlzSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gdGhpc0luZm8uaWQ7XHJcbiAgICB0aGlzLnggPSB0aGlzSW5mby54O1xyXG4gICAgdGhpcy55ID0gdGhpc0luZm8ueTtcclxuICAgIHRoaXMubGVuZ3RoID0gdGhpc0luZm8ubGVuZ3RoO1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy50b3BDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgKyAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgKyAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYm9yZGVyQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yIC0gMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nIC0gMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iIC0gMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmFsZXJ0ID0gdGhpc0luZm8uYWxlcnQ7XHJcbiAgICB0aGlzLnJhbmRvbSA9IE1hdGguZmxvb3IoZ2V0UmFuZG9tKDAsIDMpKTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuVGlsZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHRoaXNJbmZvKSB7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgKyAxMDAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iICsgMTAwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxufTtcclxuXHJcblRpbGUucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYihcIiArIHRoaXMuYm9yZGVyQ29sb3IuciArIFwiLFwiICsgdGhpcy5ib3JkZXJDb2xvci5nICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmIgKyBcIilcIjtcclxuICAgIGN0eC5saW5lV2lkdGggPSAyMDtcclxuXHJcblxyXG4gICAgdmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCh0aGlzLnggKyB0aGlzLmxlbmd0aCAqIDMvNCwgdGhpcy55LCB0aGlzLnggKyB0aGlzLmxlbmd0aC80LCB0aGlzLnkgKyB0aGlzLmxlbmd0aCk7XHJcbiAgICBncmQuYWRkQ29sb3JTdG9wKDAsIFwicmdiKFwiICsgdGhpcy50b3BDb2xvci5yICsgXCIsXCIgKyB0aGlzLnRvcENvbG9yLmcgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuYiArIFwiKVwiKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMSwgXCJyZ2IoXCIgKyB0aGlzLmNvbG9yLnIgKyBcIixcIiArIHRoaXMuY29sb3IuZyArIFwiLFwiICsgdGhpcy5jb2xvci5iICsgXCIpXCIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGdyZDtcclxuXHJcblxyXG4gICAgY3R4LnJlY3QodGhpcy54ICsgMzAsIHRoaXMueSArIDMwLCB0aGlzLmxlbmd0aCAtIDMwLCB0aGlzLmxlbmd0aCAtIDMwKTtcclxuXHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaWxlO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufSIsImZ1bmN0aW9uIFRyYWlsKGNsaWVudCkge1xyXG4gICAgdGhpcy5yZWFsUGF0aCA9IFtdO1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRyYWlsLnByb3RvdHlwZS51cGRhdGVMaXN0ID0gZnVuY3Rpb24gKHgseSkge1xyXG4gICAgdmFyIGN1cnJYID0gdGhpcy5jbGllbnQuU0VMRl9QTEFZRVIueCArIHg7XHJcbiAgICB2YXIgY3VyclkgPSB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUi55ICsgeTtcclxuXHJcbiAgICB0aGlzLnJlYWxQYXRoLnB1c2goe1xyXG4gICAgICAgIHg6IGN1cnJYLFxyXG4gICAgICAgIHk6IGN1cnJZXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAodGhpcy5yZWFsUGF0aC5sZW5ndGggPiAxOCkge1xyXG4gICAgICAgIHRoaXMucmVhbFBhdGguc3BsaWNlKDAsMSk7XHJcbiAgICB9XHJcbn1cclxuXHJcblRyYWlsLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMTI2LCAxMzgsIDE1OCwgMC4zKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuICAgIGlmICh0aGlzLnJlYWxQYXRoLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5tb3ZlVG8odGhpcy5yZWFsUGF0aFt0aGlzLnJlYWxQYXRoLmxlbmd0aCAtIDFdLngsIFxyXG4gICAgICAgIHRoaXMucmVhbFBhdGhbdGhpcy5yZWFsUGF0aC5sZW5ndGggLSAxXS55KTtcclxuXHJcbiAgICB2YXIgaTtcclxuICAgIGZvciAoaSA9IHRoaXMucmVhbFBhdGgubGVuZ3RoIC0gMjsgaT49MDsgaS0tKSB7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnJlYWxQYXRoW2ldLngsIHRoaXMucmVhbFBhdGhbaV0ueSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmFpbDtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEFuaW1hdGlvbjogcmVxdWlyZSgnLi9BbmltYXRpb24nKSxcclxuICAgIEFycm93OiByZXF1aXJlKCcuL0Fycm93JyksXHJcbiAgICBDb250cm9sbGVyOiByZXF1aXJlKCcuL0NvbnRyb2xsZXInKSxcclxuICAgIEhvbWU6IHJlcXVpcmUoJy4vSG9tZScpLFxyXG4gICAgTWluaU1hcDogcmVxdWlyZSgnLi9NaW5pTWFwJyksXHJcbiAgICBUaWxlOiByZXF1aXJlKCcuL1RpbGUnKSxcclxuICAgIEFzdGVyb2lkOiByZXF1aXJlKCcuL0FzdGVyb2lkJyksXHJcbiAgICBUcmFpbDogcmVxdWlyZSgnLi9UcmFpbCcpXHJcbn07IiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50LmpzJyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxudmFyIGNsaWVudCA9IG5ldyBDbGllbnQoKTtcclxuXHJcblxyXG5kb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChjbGllbnQuQ0hBVF9PUEVOKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSB0cnVlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IHRydWV9KTtcclxufTtcclxuXHJcbmRvY3VtZW50Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSA4NCkge1xyXG4gICAgICAgIGNsaWVudC5tYWluVUkuZ2FtZVVJLmNoYXRVSS50ZXh0SW5wdXQuY2xpY2soKTtcclxuICAgIH1cclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogZmFsc2V9KTtcclxufTtcclxuXHJcblxyXG4kKHdpbmRvdykuYmluZCgnbW91c2V3aGVlbCBET01Nb3VzZVNjcm9sbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmN0cmxLZXkgPT09IHRydWUpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNsaWVudC5DSEFUX1NDUk9MTCkge1xyXG4gICAgICAgIGNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZihldmVudC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGEgLzEyMCA+IDAgJiYgY2xpZW50Lm1haW5TY2FsZUZhY3RvciA8IDQpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yICs9IDAuMjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPiAwLjQpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMjtcclxuICAgIH1cclxufSk7XHJcblxyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChlKSB7IC8vcHJldmVudCByaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxufSwgZmFsc2UpOyIsImRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nOyAgLy8gZmlyZWZveCwgY2hyb21lXHJcbmRvY3VtZW50LmJvZHkuc2Nyb2xsID0gXCJub1wiO1xyXG5cclxudmFyIFBsYXllck5hbWVyVUkgPSByZXF1aXJlKCcuL1BsYXllck5hbWVyVUknKTtcclxudmFyIEdhbWVVSSA9IHJlcXVpcmUoJy4vZ2FtZS9HYW1lVUknKTtcclxuXHJcbmZ1bmN0aW9uIE1haW5VSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmdhbWVVSSA9IG5ldyBHYW1lVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0LCB0aGlzKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImdhbWVNc2dQcm9tcHRcIikge1xyXG4gICAgICAgIHRoaXMuZ2FtZVVJLmdhbWVNc2dQcm9tcHQub3BlbihpbmZvLm1lc3NhZ2UpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoYWN0aW9uKSB7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImdhbWVNc2dQcm9tcHRcIikge1xyXG4gICAgICAgIHRoaXMuZ2FtZVVJLmdhbWVNc2dQcm9tcHQuY2xvc2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZUxlYWRlckJvYXJkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZFwiKTtcclxuICAgIHZhciBQTEFZRVJfQVJSQVkgPSB0aGlzLmNsaWVudC5QTEFZRXJfQVJSQVk7XHJcblxyXG5cclxuICAgIHZhciBwbGF5ZXJTb3J0ID0gZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICB2YXIgZmFjdGlvbkEgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbYV07XHJcbiAgICAgICAgdmFyIGZhY3Rpb25CID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW2JdO1xyXG4gICAgICAgIHJldHVybiBmYWN0aW9uQS5zY29yZSAtIGZhY3Rpb25CLnNjb3JlO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIFBMQVlFUl9BUlJBWS5zb3J0KHBsYXllclNvcnQpO1xyXG4gICAgbGVhZGVyYm9hcmQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gUExBWUVSX0FSUkFZLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFtQTEFZRVJfQVJSQVlbaV1dO1xyXG5cclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBsYXllci5uYW1lICsgXCIgLSBcIiArIHBsYXllci5zY29yZSkpO1xyXG4gICAgICAgIGxlYWRlcmJvYXJkLmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYWluVUk7IiwiZnVuY3Rpb24gUGxheWVyTmFtZXJVSSAoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5sZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5uYW1lQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU3VibWl0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllcl9uYW1lclwiKTtcclxufVxyXG5cclxuUGxheWVyTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyTmFtZXJVSTsiLCJmdW5jdGlvbiBDaGF0VUkocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYXRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9pbnB1dCcpO1xyXG4gICAgdGhpcy5jaGF0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2xpc3QnKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjgwJVwiO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJhdXRvXCI7XHJcblxyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMzQsIDQ4LCA3MSwgMSlcIjtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLnNlbmRNZXNzYWdlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX0NMSUNLID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGV4dElucHV0LmJsdXIoKTtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSBmYWxzZTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCIzMCVcIjtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjAyKVwiO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjEpXCI7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5hZGRNZXNzYWdlID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhY2tldC5uYW1lICsgXCIgOiBcIiArIHBhY2tldC5jaGF0TWVzc2FnZSkpO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcblxyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc29ja2V0ID0gdGhpcy5wYXJlbnQuc29ja2V0O1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy50ZXh0SW5wdXQudmFsdWUgJiYgdGhpcy50ZXh0SW5wdXQudmFsdWUgIT09IFwiXCIpIHtcclxuICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdE1lc3NhZ2UnLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnBhcmVudC5jbGllbnQuU0VMRklELFxyXG4gICAgICAgICAgICBtZXNzYWdlOiB0aGlzLnRleHRJbnB1dC52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhdFVJO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEdhbWVNc2dQcm9tcHQocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb21wdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZV9tc2dfcHJvbXB0Jyk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lTXNnUHJvbXB0O1xyXG5cclxuXHJcbiIsInZhciBHYW1lTXNnUHJvbXB0ID0gcmVxdWlyZSgnLi9HYW1lTXNnUHJvbXB0Jyk7XHJcbnZhciBDaGF0VUkgPSByZXF1aXJlKCcuL0NoYXRVSScpO1xyXG5cclxuZnVuY3Rpb24gR2FtZVVJKGNsaWVudCwgc29ja2V0LCBwYXJlbnQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZ2FtZU1zZ1Byb21wdCA9IG5ldyBHYW1lTXNnUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuY2hhdFVJLm9wZW4oKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiXX0=

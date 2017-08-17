(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function BinaryReader(data) {
    this._offset = 0;
    this._buffer = new DataView(data);
}

module.exports = BinaryReader;


BinaryReader.prototype.readInt8 = function () {
    var value = this._buffer.getInt8(this._offset);
    this._offset += 1;
    return value;
};

BinaryReader.prototype.readInt16 = function () {
    var value = this._buffer.getInt16(this._offset);
    this._offset += 2;
    return value;
};



BinaryReader.prototype.readInt32 = function () {
    var value = this._buffer.getInt32(this._offset);
    this._offset += 4;
    return value;

};

BinaryReader.prototype.skipBytes = function (length) {
    this._offset += length;
};

BinaryReader.prototype.length = function () {
    return this._buffer.byteLength;
};


},{}],2:[function(require,module,exports){
var Entity = require('./entity');
var MainUI = require('./ui/MainUI');
var BinaryReader = require('./BinaryReader');

function Client() {
    this.SELF_ID = null;
    this.SELF_PLAYER = null;
    this.TRAIL = null;

    this.SLASH = [];
    this.SLASH_ARRAY = [];
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
    this.socket.on('chatMessage', this.mainUI);
    this.socket.on('updateLOL', this.handleLOL.bind(this));


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
        if (!this.SELF_PLAYER) {
            return;
        }

        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) -
            this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) -
            this.mainCanvas.height / 2) / this.scaleFactor;

        if (square(x) + square(y) > square(this.SELF_PLAYER.range)) { //if not in range
            return;
        }
        if (1===2) {
            if (this.SLASH.length >= 2) {
                if (square(this.SLASH[0].x - this.SLASH[1].x) +
                    square(this.SLASH[0].y - this.SLASH[1].y) > 1000) {

                    this.SLASH.id = Math.random();
                    this.SLASH_ARRAY.push(this.SLASH);

                    this.socket.emit("slash", {
                        id: this.SELF_ID,
                        x: (this.SLASH[0].x + this.SLASH[1].x) / 2,
                        y: (this.SLASH[0].y + this.SLASH[1].y) / 2,
                        slashId: this.SLASH.id
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
            this.TRAIL.updateList(x, y);
        }
    }.bind(this));
};


Client.prototype.initLists = function () {
    this.CONTROLLER_LIST = {};
    this.TILE_LIST = {};
    this.ROCK_LIST = {};
    this.ASTEROID_LIST = {};
    this.ANIMATION_LIST = {};
};
Client.prototype.initViewers = function () {
    this.keys = [];
    this.scaleFactor = 1;
    this.mainScaleFactor = 0.5;
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


Client.prototype.handleLOL =  function (data) {
    var reader = new BinaryReader(data);

    if (reader.length() > 20) {
        console.log("YIPEEEE");
        console.log(reader.readInt8());

        //console.log(reader.readInt32()); //asteroid id
        //console.log(reader.readInt32()); //owner id

        //console.log(reader.readInt32()); //real x
        //console.log(reader.readInt32()); //real y



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
        case "rockInfo":
            addEntity(packet, this.ROCK_LIST, Entity.Rock);
            break;
        case "tileInfo":
            addEntity(packet, this.TILE_LIST, Entity.Tile);
            break;
        case "controllerInfo":
            addEntity(packet, this.CONTROLLER_LIST, Entity.Controller);
            break;
        case "asteroidInfo":
            addEntity(packet, this.ASTEROID_LIST, Entity.Asteroid);
            break;
        case "animationInfo":
            if (packet.id === this.SELF_ID) {
                addEntity(packet, this.ANIMATION_LIST, Entity.Animation);
            }
            break;
        case "UIInfo":
            if (this.SELF_ID === packet.playerId) {
                this.mainUI.open(packet);
            }
            break;
        case "selfId":
            if (!this.SELF_ID) {
                this.SELF_ID = packet.selfId;
                this.mainUI.gameUI.open();
                this.TRAIL = new Entity.Trail(this);
            }
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
        case "rockInfo":
            updateEntity(packet, this.ROCK_LIST);
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
        this.ANIMATION_LIST,
        this.ROCK_LIST
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

    translateScene();
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
};


Client.prototype.findSlash = function (id) {
    var i, slash;
    for (i = 0; i < this.SLASH_ARRAY.length; i++) {
        slash = this.SLASH_ARRAY[i];
        if (slash.id === id) {
            this.SLASH_ARRAY.splice(0, i); //cut all the slashes before it
            return slash;
        }
    }
    return false;
};




Client.prototype.start = function () {
    setInterval(this.drawScene.bind(this), 1000 / 25);
};

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


function square(a) {
    return a * a;
}

module.exports = Client;
},{"./BinaryReader":1,"./entity":11,"./ui/MainUI":13}],3:[function(require,module,exports){
function Animation(animationInfo, client) {

    this.client = client;
    this.type = animationInfo.type;
    this.id = animationInfo.id;
    this.x = animationInfo.x;
    this.y = animationInfo.y;
    //this.theta = 15;
    this.timer = getRandom(10, 14);

    if (this.type === "slash") {
        this.slashId = animationInfo.slashId;
        var slash = this.client.findSlash(this.slashId);
        this.pre = slash[0];
        this.post = slash[1];
    }
}


Animation.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var player = this.client.SELF_PLAYER;

    if (this.type === "slash" && player) {
        ctx.beginPath();

        ctx.strokeStyle = "rgba(242, 31, 66, 0.6)";
        ctx.lineWidth = 15;

        ctx.moveTo(player.x + this.pre.x, player.y + this.pre.y);
        ctx.lineTo(player.x + this.post.x, player.y + this.post.y);

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
    this.displayTheta = asteroidInfo.displayTheta;
    this.targetPt = asteroidInfo.targetPt;
    this.maxHealth = asteroidInfo.maxHealth;
    this.shooting = asteroidInfo.shooting;
    this.theta = asteroidInfo.theta;
    this.owner = asteroidInfo.owner;
    if (this.health !== asteroidInfo.health) {
        //this.updateRadii((this.health - asteroidInfo.health) / this.maxHealth);
        this.health = asteroidInfo.health;
    }
    this.glowing = asteroidInfo.glowing;
    this.fast = asteroidInfo.fast;
};


Asteroid.prototype.show = function () {
    var radius, i;
    var ctx = this.client.mainCtx;
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (this.shooting) {
        ctx.fillStyle = "purple";
    }
    if (this.glowing) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(244, 164, 66, 0.2)";
        ctx.arc(this.x, this.y, this.radius + 20, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }

    var x, y, theta, startX, startY;
    theta = this.displayTheta;
    startX = this.radius * Math.cos(theta);
    startY = this.radius * Math.sin(theta);


    if (this.owner) {
        ctx.strokeStyle = "green";
        ctx.lineWidth = 40;
    }
    if (this.fast) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 40;
    }
    ctx.moveTo(this.x + startX, this.y + startY);


    ctx.beginPath();
    for (i = 0; i <= this.thetas.length; i++) {
        theta = this.displayTheta + this.thetas[i];
        radius = this.radii[i];

        x = radius * Math.cos(theta);
        y = radius * Math.sin(theta);
        ctx.lineTo(this.x + x, this.y + y);
    }
    ctx.lineTo(this.x + startX, this.y + startY);
    ctx.stroke();
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
        x: this.radii[l - 1] * Math.cos(this.displayTheta + this.thetas[l - 1]),
        y: this.radii[l - 1] * Math.sin(this.displayTheta + this.thetas[l - 1])
    };

    ctx.fillStyle = this.defaultRGB;

    startX = this.radius * Math.cos(this.displayTheta) + this.x;
    startY = this.radius * Math.sin(this.displayTheta) + this.y;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(this.x + pre.x, this.y + pre.y);
    ctx.lineTo(this.x, this.y);
    ctx.lineTo(this.x + post.x, this.y + post.y);

    ctx.fill();

    ctx.closePath();


    if (this.currPath && 1 === 2) {
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
    if (this.theta && 1 === 2) {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 30;
        var endX = this.x + 100 * Math.cos(this.theta);
        var endY = this.y + 100 * Math.sin(this.theta);

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);

        ctx.stroke();
        ctx.closePath();

    }

    if (this.health && this.maxHealth) { //health bar
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


Asteroid.prototype.addRadii = function () {
    for (var i = 0; i < this.thetas.length; i++) {
        this.radii[i] = this.radius;
    }
};

Asteroid.prototype.addColors = function () {
    var defaultRGB = {};

    if (this.material === "sulfer") {
        defaultRGB = {
            r: 239,
            g: 213,
            b: 123
        };
    }
    else if (this.material === "copper") {
        defaultRGB = {
            r: 120,
            g: 213,
            b: 123
        };
    }

    this.defaultRGB = "rgb(" + defaultRGB.r + "," +
        defaultRGB.g + "," + defaultRGB.b + ")";


    var rgb = {};
    for (var i = 0; i < this.thetas.length; i++) {
        rgb = {
            r: Math.floor(defaultRGB.r + getRandom(-20, 10)),
            g: Math.floor(defaultRGB.g + getRandom(-40, 0)),
            b: Math.floor(defaultRGB.b + getRandom(-20, 50))
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
};


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

    if (!this.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.active = this.active; //probably should change this
        this.client.SELF_PLAYER = this;
    }
}

Controller.prototype.update = function (controllerInfo) {
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

    if (this.id === this.client.SELF_ID) {
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


    if (this.range && this.id === selfId) {
        ctx.beginPath();

        if (this.active) {
            ctx.fillStyle = "rgba(196, 41, 54, 0.2)";
        }
        else {
            ctx.fillStyle = "rgba(66, 108, 175, 0.2)";
        }
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
    
    var radius = this.radius * 5;
    ctx.moveTo(this.x + radius, this.y);
    
    for (i = Math.PI / 4; i <= 2 * Math.PI - Math.PI / 4; i += Math.PI / 4) {
        theta = i;
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
function Rock(rockInfo, client) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.client = client;
}

Rock.prototype.update = function (rockInfo) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.queuePosition = rockInfo.queuePosition;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;

    ctx.fillStyle = "purple";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();

    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Rock;
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
};

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
},{}],11:[function(require,module,exports){
module.exports = {
    Animation: require('./Animation'),
    Controller: require('./Controller'),
    Home: require('./Home'),
    MiniMap: require('./MiniMap'),
    Tile: require('./Tile'),
    Asteroid: require('./Asteroid'),
    Trail: require('./Trail'),
    Rock: require('./Rock')
};
},{"./Animation":3,"./Asteroid":4,"./Controller":5,"./Home":6,"./MiniMap":7,"./Rock":8,"./Tile":9,"./Trail":10}],12:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();
client.start();


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

    if(event.originalEvent.wheelDelta /120 > 0 && client.mainScaleFactor < 2) {
        client.mainScaleFactor += 0.2;
    }
    else if (client.mainScaleFactor > 0.5) {
        client.mainScaleFactor -= 0.2;
    }
});

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":2,"./ui/MainUI":13}],13:[function(require,module,exports){
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
},{"./PlayerNamerUI":14,"./game/GameUI":17}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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
            id: this.parent.client.SELF_ID,
            message: this.textInput.value
        });
        this.textInput.value = "";
    }
    this.close();
};

module.exports = ChatUI;



},{}],16:[function(require,module,exports){
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



},{}],17:[function(require,module,exports){
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
},{"./ChatUI":15,"./GameMsgPrompt":16}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQXN0ZXJvaWQuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9Db250cm9sbGVyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L01pbmlNYXAuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9Sb2NrLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvVGlsZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1RyYWlsLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDellBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEJpbmFyeVJlYWRlcihkYXRhKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgPSAwO1xyXG4gICAgdGhpcy5fYnVmZmVyID0gbmV3IERhdGFWaWV3KGRhdGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmFyeVJlYWRlcjtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDgodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAxO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQzMiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRJbnQzMih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDQ7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5za2lwQnl0ZXMgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gbGVuZ3RoO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGg7XHJcbn07XHJcblxyXG4iLCJ2YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9lbnRpdHknKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcbnZhciBCaW5hcnlSZWFkZXIgPSByZXF1aXJlKCcuL0JpbmFyeVJlYWRlcicpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGX0lEID0gbnVsbDtcclxuICAgIHRoaXMuU0VMRl9QTEFZRVIgPSBudWxsO1xyXG4gICAgdGhpcy5UUkFJTCA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5TTEFTSCA9IFtdO1xyXG4gICAgdGhpcy5TTEFTSF9BUlJBWSA9IFtdO1xyXG4gICAgdGhpcy5tb3VzZU1vdmVUaW1lciA9IDA7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignaW5pdFZlcmlmaWNhdGlvbicsIHRoaXMudmVyaWZ5LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUVudGl0aWVzJywgdGhpcy5oYW5kbGVQYWNrZXQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignY2hhdE1lc3NhZ2UnLCB0aGlzLm1haW5VSSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlTE9MJywgdGhpcy5oYW5kbGVMT0wuYmluZCh0aGlzKSk7XHJcblxyXG5cclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Q2FudmFzZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLm1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5fY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgIzAwMDAwMCc7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB0aGlzLm1haW5DdHggPSB0aGlzLm1haW5DYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibW91c2VEb3duXCIsIHtcclxuICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLkNIQVRfQ0xJQ0spIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLmNoYXRVSS5jbG9zZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm1vdXNlVXBcIiwge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuQ0hBVF9DTElDSyA9IGZhbHNlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC1cclxuICAgICAgICAgICAgdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlKHgpICsgc3F1YXJlKHkpID4gc3F1YXJlKHRoaXMuU0VMRl9QTEFZRVIucmFuZ2UpKSB7IC8vaWYgbm90IGluIHJhbmdlXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKDE9PT0yKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNMQVNILmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3F1YXJlKHRoaXMuU0xBU0hbMF0ueCAtIHRoaXMuU0xBU0hbMV0ueCkgK1xyXG4gICAgICAgICAgICAgICAgICAgIHNxdWFyZSh0aGlzLlNMQVNIWzBdLnkgLSB0aGlzLlNMQVNIWzFdLnkpID4gMTAwMCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLlNMQVNILmlkID0gTWF0aC5yYW5kb20oKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLlNMQVNIX0FSUkFZLnB1c2godGhpcy5TTEFTSCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJzbGFzaFwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6ICh0aGlzLlNMQVNIWzBdLnggKyB0aGlzLlNMQVNIWzFdLngpIC8gMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgeTogKHRoaXMuU0xBU0hbMF0ueSArIHRoaXMuU0xBU0hbMV0ueSkgLyAyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzbGFzaElkOiB0aGlzLlNMQVNILmlkXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLlNMQVNIID0gW107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLlNMQVNILnB1c2goXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmICghdGhpcy5wcmUpIHtcclxuICAgICAgICAgICAgdGhpcy5wcmUgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZSh0aGlzLnByZS54IC0geCkgKyBzcXVhcmUodGhpcy5wcmUueSAtIHkpID4gNDAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge1xyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm1vdXNlTW92ZVwiLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGX0lELFxyXG4gICAgICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgICAgIHk6IHlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMuVFJBSUwudXBkYXRlTGlzdCh4LCB5KTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5DT05UUk9MTEVSX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuVElMRV9MSVNUID0ge307XHJcbiAgICB0aGlzLlJPQ0tfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5BU1RFUk9JRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkFOSU1BVElPTl9MSVNUID0ge307XHJcbn07XHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdFZpZXdlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLmtleXMgPSBbXTtcclxuICAgIHRoaXMuc2NhbGVGYWN0b3IgPSAxO1xyXG4gICAgdGhpcy5tYWluU2NhbGVGYWN0b3IgPSAwLjU7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG4gICAgdGhpcy5tYWluVUkucGxheWVyTmFtZXJVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnZlcmlmeSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc29ja2V0LnZlcmlmaWVkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJWRVJJRklFRCBDTElFTlRcIik7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInZlcmlmeVwiLCB7fSk7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlTE9MID0gIGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcmVhZGVyID0gbmV3IEJpbmFyeVJlYWRlcihkYXRhKTtcclxuXHJcbiAgICBpZiAocmVhZGVyLmxlbmd0aCgpID4gMjApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIllJUEVFRUVcIik7XHJcbiAgICAgICAgY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQ4KCkpO1xyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKHJlYWRlci5yZWFkSW50MzIoKSk7IC8vYXN0ZXJvaWQgaWRcclxuICAgICAgICAvL2NvbnNvbGUubG9nKHJlYWRlci5yZWFkSW50MzIoKSk7IC8vb3duZXIgaWRcclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDMyKCkpOyAvL3JlYWwgeFxyXG4gICAgICAgIC8vY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQzMigpKTsgLy9yZWFsIHlcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcGFja2V0LCBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwYWNrZXQgPSBkYXRhW2ldO1xyXG4gICAgICAgIHN3aXRjaCAocGFja2V0Lm1hc3Rlcikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWxldGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGRhdGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmFkZEVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGFkZEVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGVudGl0eSwgYXJyYXkpIHtcclxuICAgICAgICBpZiAoIXBhY2tldCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxpc3RbcGFja2V0LmlkXSA9IG5ldyBlbnRpdHkocGFja2V0LCB0aGlzKTtcclxuICAgICAgICBpZiAoYXJyYXkgJiYgYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpID09PSAtMSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKHBhY2tldC5pZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIHN3aXRjaCAocGFja2V0LmNsYXNzKSB7XHJcbiAgICAgICAgY2FzZSBcInJvY2tJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuUk9DS19MSVNULCBFbnRpdHkuUm9jayk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCwgRW50aXR5LlRpbGUpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QsIEVudGl0eS5Db250cm9sbGVyKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFzdGVyb2lkSW5mb1wiOlxyXG4gICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFTVEVST0lEX0xJU1QsIEVudGl0eS5Bc3Rlcm9pZCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGlmIChwYWNrZXQuaWQgPT09IHRoaXMuU0VMRl9JRCkge1xyXG4gICAgICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCwgRW50aXR5LkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLm9wZW4ocGFja2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2VsZklkXCI6XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLlNFTEZfSUQgPSBwYWNrZXQuc2VsZklkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuZ2FtZVVJLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuVFJBSUwgPSBuZXcgRW50aXR5LlRyYWlsKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgZnVuY3Rpb24gdXBkYXRlRW50aXR5KHBhY2tldCwgbGlzdCkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbcGFja2V0LmlkXTtcclxuICAgICAgICBpZiAoIWVudGl0eSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudGl0eS51cGRhdGUocGFja2V0KTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhc3Rlcm9pZEluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5BU1RFUk9JRF9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImhvbWVJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuSE9NRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInJvY2tJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuUk9DS19MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQucGxheWVySWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLnVwZGF0ZShwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kZWxldGVFbnRpdGllcyA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcclxuICAgIHZhciBkZWxldGVFbnRpdHkgPSBmdW5jdGlvbiAocGFja2V0LCBsaXN0LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFycmF5KSB7XHJcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFycmF5LmluZGV4T2YocGFja2V0LmlkKTtcclxuICAgICAgICAgICAgYXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVsZXRlIGxpc3RbcGFja2V0LmlkXTtcclxuICAgIH07XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiY29udHJvbGxlckluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5DT05UUk9MTEVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYXN0ZXJvaWRJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQVNURVJPSURfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkuY2xvc2UocGFja2V0LmFjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRyYXdTY2VuZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgaWQ7XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLkNPTlRST0xMRVJfTElTVCxcclxuICAgICAgICB0aGlzLkFTVEVST0lEX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BTklNQVRJT05fTElTVCxcclxuICAgICAgICB0aGlzLlJPQ0tfTElTVFxyXG4gICAgXTtcclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMC43ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB2YXIgdHJhbnNsYXRlU2NlbmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIsIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICB0aGlzLm1haW5DdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSgtdGhpcy5TRUxGX1BMQVlFUi54LCAtdGhpcy5TRUxGX1BMQVlFUi55KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcblxyXG4gICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxTdHlsZSA9IFwiIzFkMWYyMVwiO1xyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxSZWN0KDAsIDAsIDEwMDAwLCAxMDAwMCk7XHJcblxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHModGhpcy5TRUxGX1BMQVlFUiwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLlRSQUlMICYmICF0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIHRoaXMuVFJBSUwuc2hvdygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuZmluZFNsYXNoID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgICB2YXIgaSwgc2xhc2g7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5TTEFTSF9BUlJBWS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHNsYXNoID0gdGhpcy5TTEFTSF9BUlJBWVtpXTtcclxuICAgICAgICBpZiAoc2xhc2guaWQgPT09IGlkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuU0xBU0hfQVJSQVkuc3BsaWNlKDAsIGkpOyAvL2N1dCBhbGwgdGhlIHNsYXNoZXMgYmVmb3JlIGl0XHJcbiAgICAgICAgICAgIHJldHVybiBzbGFzaDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG5cclxuXHJcblxyXG5DbGllbnQucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgc2V0SW50ZXJ2YWwodGhpcy5kcmF3U2NlbmUuYmluZCh0aGlzKSwgMTAwMCAvIDI1KTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGxlcnAoYSwgYiwgcmF0aW8pIHtcclxuICAgIHJldHVybiBhICsgcmF0aW8gKiAoYiAtIGEpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc3F1YXJlKGEpIHtcclxuICAgIHJldHVybiBhICogYTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW1hdGlvbkluZm8sIGNsaWVudCkge1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy50eXBlID0gYW5pbWF0aW9uSW5mby50eXBlO1xyXG4gICAgdGhpcy5pZCA9IGFuaW1hdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBhbmltYXRpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhbmltYXRpb25JbmZvLnk7XHJcbiAgICAvL3RoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICB0aGlzLnNsYXNoSWQgPSBhbmltYXRpb25JbmZvLnNsYXNoSWQ7XHJcbiAgICAgICAgdmFyIHNsYXNoID0gdGhpcy5jbGllbnQuZmluZFNsYXNoKHRoaXMuc2xhc2hJZCk7XHJcbiAgICAgICAgdGhpcy5wcmUgPSBzbGFzaFswXTtcclxuICAgICAgICB0aGlzLnBvc3QgPSBzbGFzaFsxXTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LlNFTEZfUExBWUVSO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIiAmJiBwbGF5ZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNDIsIDMxLCA2NiwgMC42KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuXHJcbiAgICAgICAgY3R4Lm1vdmVUbyhwbGF5ZXIueCArIHRoaXMucHJlLngsIHBsYXllci55ICsgdGhpcy5wcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyhwbGF5ZXIueCArIHRoaXMucG9zdC54LCBwbGF5ZXIueSArIHRoaXMucG9zdC55KTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7IC8vZGVwcmVjYXRlZCBidXQgY291bGQgcHVsbCBzb21lIGdvb2QgY29kZSBmcm9tIGhlcmVcclxuICAgICAgICBjdHguZm9udCA9IDYwIC0gdGhpcy50aW1lciArIFwicHggQXJpYWxcIjtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIGN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIHRoaXMudGhldGEpO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAxNjgsIDg2LCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgdGhpcy50aGV0YSA9IGxlcnAodGhpcy50aGV0YSwgMCwgMC4wOCk7XHJcbiAgICAgICAgdGhpcy54ID0gbGVycCh0aGlzLngsIHRoaXMuZW5kWCwgMC4xKTtcclxuICAgICAgICB0aGlzLnkgPSBsZXJwKHRoaXMueSwgdGhpcy5lbmRZLCAwLjEpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEFzdGVyb2lkKGFzdGVyb2lkSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gYXN0ZXJvaWRJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gYXN0ZXJvaWRJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhc3Rlcm9pZEluZm8ueTtcclxuICAgIHRoaXMucmFkaXVzID0gYXN0ZXJvaWRJbmZvLnJhZGl1cztcclxuICAgIHRoaXMuaGVhbHRoID0gYXN0ZXJvaWRJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gYXN0ZXJvaWRJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMubWF0ZXJpYWwgPSBhc3Rlcm9pZEluZm8ubWF0ZXJpYWw7XHJcbiAgICB0aGlzLmRpc3BsYXlUaGV0YSA9IGFzdGVyb2lkSW5mby5kaXNwbGF5VGhldGE7XHJcbiAgICB0aGlzLnRoZXRhID0gYXN0ZXJvaWRJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy50aGV0YXMgPSBhc3Rlcm9pZEluZm8udGhldGFzO1xyXG4gICAgdGhpcy5yYWRpaSA9IFtdO1xyXG4gICAgdGhpcy5jb2xvcnMgPSBbXTtcclxuICAgIHRoaXMuYWRkUmFkaWkoKTtcclxuICAgIHRoaXMuYWRkQ29sb3JzKCk7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuQXN0ZXJvaWQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChhc3Rlcm9pZEluZm8pIHtcclxuICAgIHRoaXMueCA9IGFzdGVyb2lkSW5mby54O1xyXG4gICAgdGhpcy55ID0gYXN0ZXJvaWRJbmZvLnk7XHJcbiAgICBpZiAodGhpcy5yYWRpdXMgIT09IGFzdGVyb2lkSW5mby5yYWRpdXMpIHtcclxuICAgICAgICB0aGlzLnJhZGl1cyA9IGFzdGVyb2lkSW5mby5yYWRpdXM7XHJcbiAgICAgICAgdGhpcy5hZGRSYWRpaSgpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jdXJyUGF0aCA9IGFzdGVyb2lkSW5mby5jdXJyUGF0aDtcclxuICAgIHRoaXMucXVldWVQb3NpdGlvbiA9IGFzdGVyb2lkSW5mby5xdWV1ZVBvc2l0aW9uO1xyXG4gICAgdGhpcy5kaXNwbGF5VGhldGEgPSBhc3Rlcm9pZEluZm8uZGlzcGxheVRoZXRhO1xyXG4gICAgdGhpcy50YXJnZXRQdCA9IGFzdGVyb2lkSW5mby50YXJnZXRQdDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gYXN0ZXJvaWRJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMuc2hvb3RpbmcgPSBhc3Rlcm9pZEluZm8uc2hvb3Rpbmc7XHJcbiAgICB0aGlzLnRoZXRhID0gYXN0ZXJvaWRJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5vd25lciA9IGFzdGVyb2lkSW5mby5vd25lcjtcclxuICAgIGlmICh0aGlzLmhlYWx0aCAhPT0gYXN0ZXJvaWRJbmZvLmhlYWx0aCkge1xyXG4gICAgICAgIC8vdGhpcy51cGRhdGVSYWRpaSgodGhpcy5oZWFsdGggLSBhc3Rlcm9pZEluZm8uaGVhbHRoKSAvIHRoaXMubWF4SGVhbHRoKTtcclxuICAgICAgICB0aGlzLmhlYWx0aCA9IGFzdGVyb2lkSW5mby5oZWFsdGg7XHJcbiAgICB9XHJcbiAgICB0aGlzLmdsb3dpbmcgPSBhc3Rlcm9pZEluZm8uZ2xvd2luZztcclxuICAgIHRoaXMuZmFzdCA9IGFzdGVyb2lkSW5mby5mYXN0O1xyXG59O1xyXG5cclxuXHJcbkFzdGVyb2lkLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJhZGl1cywgaTtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDI7XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgaWYgKHRoaXMuc2hvb3RpbmcpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJwdXJwbGVcIjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdsb3dpbmcpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyNDQsIDE2NCwgNjYsIDAuMilcIjtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cyArIDIwLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgeCwgeSwgdGhldGEsIHN0YXJ0WCwgc3RhcnRZO1xyXG4gICAgdGhldGEgPSB0aGlzLmRpc3BsYXlUaGV0YTtcclxuICAgIHN0YXJ0WCA9IHRoaXMucmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xyXG4gICAgc3RhcnRZID0gdGhpcy5yYWRpdXMgKiBNYXRoLnNpbih0aGV0YSk7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLm93bmVyKSB7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSA0MDtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmZhc3QpIHtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSA0MDtcclxuICAgIH1cclxuICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG5cclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDw9IHRoaXMudGhldGFzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGhldGEgPSB0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2ldO1xyXG4gICAgICAgIHJhZGl1cyA9IHRoaXMucmFkaWlbaV07XHJcblxyXG4gICAgICAgIHggPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgfVxyXG4gICAgY3R4LmxpbmVUbyh0aGlzLnggKyBzdGFydFgsIHRoaXMueSArIHN0YXJ0WSk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbiAgICB2YXIgbCA9IHRoaXMudGhldGFzLmxlbmd0aDtcclxuICAgIC8vYWRkIGxvdy1wb2x5XHJcbiAgICBmb3IgKGkgPSAxOyBpIDw9IGw7IGkrKykge1xyXG4gICAgICAgIHZhciBpbmQgPSAoKChpIC0gMSkgJSBsKSArIGwpICUgbDtcclxuXHJcbiAgICAgICAgdmFyIHByZSA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5mbG9vcih0aGlzLnJhZGlpW2luZF0gKiBNYXRoLmNvcyh0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2luZF0pKSxcclxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcih0aGlzLnJhZGlpW2luZF0gKiBNYXRoLnNpbih0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2luZF0pKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIHBvc3QgPSB7XHJcbiAgICAgICAgICAgIHg6IE1hdGguZmxvb3IodGhpcy5yYWRpaVtpXSAqIE1hdGguY29zKHRoaXMuZGlzcGxheVRoZXRhICsgdGhpcy50aGV0YXNbaV0pKSxcclxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcih0aGlzLnJhZGlpW2ldICogTWF0aC5zaW4odGhpcy5kaXNwbGF5VGhldGEgKyB0aGlzLnRoZXRhc1tpXSkpXHJcbiAgICAgICAgfTtcclxuXHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcnNbaV07XHJcblxyXG5cclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCArIHByZS54LCB0aGlzLnkgKyBwcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyBwb3N0LngsIHRoaXMueSArIHBvc3QueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyBwcmUueCwgdGhpcy55ICsgcHJlLnkpO1xyXG5cclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIC8vY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJlID0ge1xyXG4gICAgICAgIHg6IHRoaXMucmFkaWlbMF0gKiBNYXRoLmNvcyh0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzWzBdKSxcclxuICAgICAgICB5OiB0aGlzLnJhZGlpWzBdICogTWF0aC5zaW4odGhpcy5kaXNwbGF5VGhldGEgKyB0aGlzLnRoZXRhc1swXSlcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHBvc3QgPSB7XHJcbiAgICAgICAgeDogdGhpcy5yYWRpaVtsIC0gMV0gKiBNYXRoLmNvcyh0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2wgLSAxXSksXHJcbiAgICAgICAgeTogdGhpcy5yYWRpaVtsIC0gMV0gKiBNYXRoLnNpbih0aGlzLmRpc3BsYXlUaGV0YSArIHRoaXMudGhldGFzW2wgLSAxXSlcclxuICAgIH07XHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZGVmYXVsdFJHQjtcclxuXHJcbiAgICBzdGFydFggPSB0aGlzLnJhZGl1cyAqIE1hdGguY29zKHRoaXMuZGlzcGxheVRoZXRhKSArIHRoaXMueDtcclxuICAgIHN0YXJ0WSA9IHRoaXMucmFkaXVzICogTWF0aC5zaW4odGhpcy5kaXNwbGF5VGhldGEpICsgdGhpcy55O1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5tb3ZlVG8oc3RhcnRYLCBzdGFydFkpO1xyXG4gICAgY3R4LmxpbmVUbyh0aGlzLnggKyBwcmUueCwgdGhpcy55ICsgcHJlLnkpO1xyXG4gICAgY3R4LmxpbmVUbyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICBjdHgubGluZVRvKHRoaXMueCArIHBvc3QueCwgdGhpcy55ICsgcG9zdC55KTtcclxuXHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMuY3VyclBhdGggJiYgMSA9PT0gMikge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5hcmModGhpcy5jdXJyUGF0aC54LCB0aGlzLmN1cnJQYXRoLnksIDEwLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMucXVldWVQb3NpdGlvbiAmJiAxID09PSAyKSB7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInllbGxvd1wiO1xyXG4gICAgICAgIGN0eC5hcmModGhpcy5xdWV1ZVBvc2l0aW9uLngsIHRoaXMucXVldWVQb3NpdGlvbi55LCAxMCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnRhcmdldFB0ICYmIDEgPT09IDIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicGlua1wiO1xyXG4gICAgICAgIGN0eC5hcmModGhpcy50YXJnZXRQdC54LCB0aGlzLnRhcmdldFB0LnksIDEwLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMudGhldGEgJiYgMSA9PT0gMikge1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmx1ZVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAzMDtcclxuICAgICAgICB2YXIgZW5kWCA9IHRoaXMueCArIDEwMCAqIE1hdGguY29zKHRoaXMudGhldGEpO1xyXG4gICAgICAgIHZhciBlbmRZID0gdGhpcy55ICsgMTAwICogTWF0aC5zaW4odGhpcy50aGV0YSk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubW92ZVRvKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgubGluZVRvKGVuZFgsIGVuZFkpO1xyXG5cclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGgpIHsgLy9oZWFsdGggYmFyXHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAyMCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcbn07XHJcblxyXG5cclxuQXN0ZXJvaWQucHJvdG90eXBlLmFkZFJhZGlpID0gZnVuY3Rpb24gKCkge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRoZXRhcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRoaXMucmFkaWlbaV0gPSB0aGlzLnJhZGl1cztcclxuICAgIH1cclxufTtcclxuXHJcbkFzdGVyb2lkLnByb3RvdHlwZS5hZGRDb2xvcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZGVmYXVsdFJHQiA9IHt9O1xyXG5cclxuICAgIGlmICh0aGlzLm1hdGVyaWFsID09PSBcInN1bGZlclwiKSB7XHJcbiAgICAgICAgZGVmYXVsdFJHQiA9IHtcclxuICAgICAgICAgICAgcjogMjM5LFxyXG4gICAgICAgICAgICBnOiAyMTMsXHJcbiAgICAgICAgICAgIGI6IDEyM1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLm1hdGVyaWFsID09PSBcImNvcHBlclwiKSB7XHJcbiAgICAgICAgZGVmYXVsdFJHQiA9IHtcclxuICAgICAgICAgICAgcjogMTIwLFxyXG4gICAgICAgICAgICBnOiAyMTMsXHJcbiAgICAgICAgICAgIGI6IDEyM1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5kZWZhdWx0UkdCID0gXCJyZ2IoXCIgKyBkZWZhdWx0UkdCLnIgKyBcIixcIiArXHJcbiAgICAgICAgZGVmYXVsdFJHQi5nICsgXCIsXCIgKyBkZWZhdWx0UkdCLmIgKyBcIilcIjtcclxuXHJcblxyXG4gICAgdmFyIHJnYiA9IHt9O1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRoZXRhcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHJnYiA9IHtcclxuICAgICAgICAgICAgcjogTWF0aC5mbG9vcihkZWZhdWx0UkdCLnIgKyBnZXRSYW5kb20oLTIwLCAxMCkpLFxyXG4gICAgICAgICAgICBnOiBNYXRoLmZsb29yKGRlZmF1bHRSR0IuZyArIGdldFJhbmRvbSgtNDAsIDApKSxcclxuICAgICAgICAgICAgYjogTWF0aC5mbG9vcihkZWZhdWx0UkdCLmIgKyBnZXRSYW5kb20oLTIwLCA1MCkpXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmNvbG9yc1tpXSA9IFwicmdiKFwiICsgcmdiLnIgKyBcIixcIiArXHJcbiAgICAgICAgICAgIHJnYi5nICsgXCIsXCIgKyByZ2IuYiArIFwiKVwiO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkFzdGVyb2lkLnByb3RvdHlwZS51cGRhdGVSYWRpaSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcclxuICAgIHZhciBkZWx0YSA9IGFtb3VudDtcclxuICAgIHZhciByYWRpaSA9IFtdO1xyXG4gICAgdmFyIGkgPSBNYXRoLnJvdW5kKGdldFJhbmRvbSgwLCB0aGlzLnJhZGlpLmxlbmd0aCAtIDEpKTtcclxuXHJcbiAgICB0aGlzLnJhZGlpW2ldID0gdGhpcy5yYWRpaVtpXSAtIGdldFJhbmRvbSgwLCBkZWx0YSk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFzdGVyb2lkOyIsImZ1bmN0aW9uIENvbnRyb2xsZXIoY29udHJvbGxlckluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IGNvbnRyb2xsZXJJbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gY29udHJvbGxlckluZm8ubmFtZTtcclxuICAgIHRoaXMueCA9IGNvbnRyb2xsZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBjb250cm9sbGVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBjb250cm9sbGVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMudGhldGEgPSBjb250cm9sbGVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDsgLy9uZWVkIHRvIGltcGxlbWVudCBhZ2FpblxyXG4gICAgdGhpcy5yYWRpdXMgPSBjb250cm9sbGVySW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLmFjdGl2ZSA9IGNvbnRyb2xsZXJJbmZvLmFjdGl2ZTtcclxuICAgIHRoaXMucmFuZ2UgPSBjb250cm9sbGVySW5mby5yYW5nZTtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG5cclxuICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUiAmJiB0aGlzLmlkID09PSB0aGlzLmNsaWVudC5TRUxGX0lEKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuYWN0aXZlID0gdGhpcy5hY3RpdmU7IC8vcHJvYmFibHkgc2hvdWxkIGNoYW5nZSB0aGlzXHJcbiAgICAgICAgdGhpcy5jbGllbnQuU0VMRl9QTEFZRVIgPSB0aGlzO1xyXG4gICAgfVxyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoY29udHJvbGxlckluZm8pIHtcclxuICAgIHRoaXMueCA9IGNvbnRyb2xsZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBjb250cm9sbGVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBjb250cm9sbGVySW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm1heEhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMudGhldGEgPSBjb250cm9sbGVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBjb250cm9sbGVySW5mby5sZXZlbDtcclxuICAgIHRoaXMuYWN0aXZlID0gY29udHJvbGxlckluZm8uYWN0aXZlO1xyXG4gICAgaWYgKHRoaXMucmFkaXVzICE9PSBjb250cm9sbGVySW5mby5yYWRpdXMpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk5FVyBSQURJVVM6XCIgICsgY29udHJvbGxlckluZm8ucmFkaXVzKTtcclxuICAgIH1cclxuICAgIHRoaXMucmFkaXVzID0gY29udHJvbGxlckluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5yYW5nZSA9IGNvbnRyb2xsZXJJbmZvLnJhbmdlO1xyXG5cclxuICAgIGlmICh0aGlzLmlkID09PSB0aGlzLmNsaWVudC5TRUxGX0lEKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuYWN0aXZlID0gdGhpcy5hY3RpdmU7IC8vcHJvYmFibHkgc2hvdWxkIGNoYW5nZSB0aGlzXHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jbGllbnQuYWN0aXZlKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQuVFJBSUwucmVhbFBhdGggPSBbXTtcclxuICAgIH1cclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIHZhciBzZWxmSWQgPSB0aGlzLmNsaWVudC5TRUxGX0lEO1xyXG4gICAgdmFyIGZpbGxBbHBoYTtcclxuICAgIHZhciBzdHJva2VBbHBoYTtcclxuICAgIHZhciBpO1xyXG5cclxuXHJcbiAgICBmaWxsQWxwaGEgPSB0aGlzLmhlYWx0aCAvICg0ICogdGhpcy5tYXhIZWFsdGgpO1xyXG4gICAgc3Ryb2tlQWxwaGEgPSAxO1xyXG4gICAgXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5yYW5nZSAmJiB0aGlzLmlkID09PSBzZWxmSWQpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDE5NiwgNDEsIDU0LCAwLjIpXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDY2LCAxMDgsIDE3NSwgMC4yKVwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhbmdlLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyMDIsIDEyLCAzNyxcIiArIHN0cm9rZUFscGhhICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIH1cclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEyMywwLDAsXCIgKyBmaWxsQWxwaGEgKyBcIilcIjtcclxuICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgXHJcbiAgICB2YXIgcmFkaXVzID0gdGhpcy5yYWRpdXMgKiA1O1xyXG4gICAgY3R4Lm1vdmVUbyh0aGlzLnggKyByYWRpdXMsIHRoaXMueSk7XHJcbiAgICBcclxuICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICB0aGV0YSA9IGk7XHJcbiAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICB5ID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgIGN0eC5saW5lVG8odGhpcy54ICsgeCwgdGhpcy55ICsgeSk7XHJcbiAgICB9XHJcbiAgICBjdHgubGluZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55ICsgMyk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgXHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcblxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyOyIsImZ1bmN0aW9uIEhvbWUoaG9tZUluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IGhvbWVJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gaG9tZUluZm8ueDtcclxuICAgIHRoaXMueSA9IGhvbWVJbmZvLnk7XHJcbiAgICB0aGlzLm5hbWUgPSBob21lSW5mby5vd25lcjtcclxuICAgIHRoaXMudHlwZSA9IGhvbWVJbmZvLnR5cGU7XHJcbiAgICB0aGlzLnJhZGl1cyA9IGhvbWVJbmZvLnJhZGl1cztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMuaGFzQ29sb3IgPSBob21lSW5mby5oYXNDb2xvcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcblxyXG4gICAgdGhpcy51bml0RG1nID0gaG9tZUluZm8udW5pdERtZztcclxuICAgIHRoaXMudW5pdFNwZWVkID0gaG9tZUluZm8udW5pdFNwZWVkO1xyXG4gICAgdGhpcy51bml0QXJtb3IgPSBob21lSW5mby51bml0QXJtb3I7XHJcbiAgICB0aGlzLnF1ZXVlID0gaG9tZUluZm8ucXVldWU7XHJcbiAgICB0aGlzLmJvdHMgPSBob21lSW5mby5ib3RzO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGhvbWVJbmZvKSB7XHJcbiAgICB0aGlzLmxldmVsID0gaG9tZUluZm8ubGV2ZWw7XHJcbiAgICB0aGlzLnJhZGl1cyA9IGhvbWVJbmZvLnJhZGl1cztcclxuICAgIHRoaXMucG93ZXIgPSBob21lSW5mby5wb3dlcjtcclxuICAgIHRoaXMuaGVhbHRoID0gaG9tZUluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5oYXNDb2xvciA9IGhvbWVJbmZvLmhhc0NvbG9yO1xyXG4gICAgdGhpcy5uZWlnaGJvcnMgPSBob21lSW5mby5uZWlnaGJvcnM7XHJcbiAgICB0aGlzLnVuaXREbWcgPSBob21lSW5mby51bml0RG1nO1xyXG4gICAgdGhpcy51bml0U3BlZWQgPSBob21lSW5mby51bml0U3BlZWQ7XHJcbiAgICB0aGlzLnVuaXRBcm1vciA9IGhvbWVJbmZvLnVuaXRBcm1vcjtcclxuICAgIHRoaXMucXVldWUgPSBob21lSW5mby5xdWV1ZTtcclxuICAgIHRoaXMuYm90cyA9IGhvbWVJbmZvLmJvdHM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhvbWU7XHJcblxyXG5cclxuSG9tZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgaWYgKHRoaXMubmVpZ2hib3JzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzQxNjllMVwiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMzk2YTZkXCI7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZfSURdO1xyXG5cclxuICAgIGlmIChpbkJvdW5kc0Nsb3NlKHNlbGZQbGF5ZXIsIHRoaXMueCwgdGhpcy55KSkge1xyXG4gICAgICAgIGlmICh0aGlzLmZhY3Rpb24pXHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgxMiwgMjU1LCAyMTgsIDAuNylcIjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGluQm91bmRzQ2xvc2UocGxheWVyLCB4LCB5KSB7XHJcbiAgICB2YXIgcmFuZ2UgPSAxNTA7XHJcbiAgICByZXR1cm4geCA8IChwbGF5ZXIueCArIHJhbmdlKSAmJiB4ID4gKHBsYXllci54IC0gNSAvIDQgKiByYW5nZSlcclxuICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSA1IC8gNCAqIHJhbmdlKTtcclxufVxyXG4iLCJmdW5jdGlvbiBNaW5pTWFwKCkgeyAvL2RlcHJlY2F0ZWQsIHBsZWFzZSB1cGRhdGVcclxufVxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChtYXBUaW1lciA8PSAwIHx8IHNlcnZlck1hcCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB0aWxlTGVuZ3RoID0gTWF0aC5zcXJ0KE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGlmICh0aWxlTGVuZ3RoID09PSAwIHx8ICFzZWxmUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGltZ0RhdGEgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlTGVuZ3RoLCB0aWxlTGVuZ3RoKTtcclxuICAgICAgICB2YXIgdGlsZTtcclxuICAgICAgICB2YXIgdGlsZVJHQjtcclxuICAgICAgICB2YXIgaSA9IDA7XHJcblxyXG5cclxuICAgICAgICBmb3IgKHZhciBpZCBpbiBUSUxFX0xJU1QpIHtcclxuICAgICAgICAgICAgdGlsZVJHQiA9IHt9O1xyXG4gICAgICAgICAgICB0aWxlID0gVElMRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKHRpbGUuY29sb3IgJiYgdGlsZS5hbGVydCB8fCBpbkJvdW5kcyhzZWxmUGxheWVyLCB0aWxlLngsIHRpbGUueSkpIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IHRpbGUuY29sb3IucjtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IHRpbGUuY29sb3IuZztcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IHRpbGUuY29sb3IuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2ldID0gdGlsZVJHQi5yO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDFdID0gdGlsZVJHQi5nO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDJdID0gdGlsZVJHQi5iO1xyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaSArIDNdID0gMjU1O1xyXG4gICAgICAgICAgICBpICs9IDQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpO1xyXG4gICAgICAgIGltZ0RhdGEgPSBzY2FsZUltYWdlRGF0YShpbWdEYXRhLCBNYXRoLmZsb29yKDQwMCAvIE9iamVjdC5zaXplKFRJTEVfTElTVCkpLCBtYWluQ3R4KTtcclxuXHJcbiAgICAgICAgbU1hcEN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDkwICogTWF0aC5QSSAvIDE4MCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5kcmF3SW1hZ2UobU1hcCwgMCwgMCk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5zY2FsZSgxLCAtMSk7XHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoMjcwICogTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIHNlcnZlck1hcCA9IG1NYXBSb3Q7XHJcbiAgICAgICAgbWFwVGltZXIgPSAyNTtcclxuICAgIH1cclxuXHJcbiAgICBlbHNlIHtcclxuICAgICAgICBtYXBUaW1lciAtPSAxO1xyXG4gICAgfVxyXG5cclxuICAgIG1haW5DdHguZHJhd0ltYWdlKHNlcnZlck1hcCwgODAwLCA0MDApO1xyXG59OyAvL2RlcHJlY2F0ZWRcclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLnNjYWxlSW1hZ2VEYXRhID0gZnVuY3Rpb24gKGltYWdlRGF0YSwgc2NhbGUsIG1haW5DdHgpIHtcclxuICAgIHZhciBzY2FsZWQgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShpbWFnZURhdGEud2lkdGggKiBzY2FsZSwgaW1hZ2VEYXRhLmhlaWdodCAqIHNjYWxlKTtcclxuICAgIHZhciBzdWJMaW5lID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoc2NhbGUsIDEpLmRhdGE7XHJcbiAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBpbWFnZURhdGEuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IGltYWdlRGF0YS53aWR0aDsgY29sKyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZVBpeGVsID0gaW1hZ2VEYXRhLmRhdGEuc3ViYXJyYXkoXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQsXHJcbiAgICAgICAgICAgICAgICAocm93ICogaW1hZ2VEYXRhLndpZHRoICsgY29sKSAqIDQgKyA0XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgc2NhbGU7IHgrKykgc3ViTGluZS5zZXQoc291cmNlUGl4ZWwsIHggKiA0KVxyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHNjYWxlOyB5KyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Um93ID0gcm93ICogc2NhbGUgKyB5O1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RDb2wgPSBjb2wgKiBzY2FsZTtcclxuICAgICAgICAgICAgICAgIHNjYWxlZC5kYXRhLnNldChzdWJMaW5lLCAoZGVzdFJvdyAqIHNjYWxlZC53aWR0aCArIGRlc3RDb2wpICogNClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc2NhbGVkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5pTWFwOyIsImZ1bmN0aW9uIFJvY2socm9ja0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy54ID0gcm9ja0luZm8ueDtcclxuICAgIHRoaXMueSA9IHJvY2tJbmZvLnk7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuUm9jay5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHJvY2tJbmZvKSB7XHJcbiAgICB0aGlzLnggPSByb2NrSW5mby54O1xyXG4gICAgdGhpcy55ID0gcm9ja0luZm8ueTtcclxuICAgIHRoaXMucXVldWVQb3NpdGlvbiA9IHJvY2tJbmZvLnF1ZXVlUG9zaXRpb247XHJcbn07XHJcblxyXG5cclxuUm9jay5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInB1cnBsZVwiO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgMTAsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUm9jazsiLCJmdW5jdGlvbiBUaWxlKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzSW5mby5sZW5ndGg7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMDBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiKFwiICsgdGhpcy5ib3JkZXJDb2xvci5yICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmcgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuYiArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuXHJcbiAgICB2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KHRoaXMueCArIHRoaXMubGVuZ3RoICogMy80LCB0aGlzLnksIHRoaXMueCArIHRoaXMubGVuZ3RoLzQsIHRoaXMueSArIHRoaXMubGVuZ3RoKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMCwgXCJyZ2IoXCIgKyB0aGlzLnRvcENvbG9yLnIgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuZyArIFwiLFwiICsgdGhpcy50b3BDb2xvci5iICsgXCIpXCIpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgxLCBcInJnYihcIiArIHRoaXMuY29sb3IuciArIFwiLFwiICsgdGhpcy5jb2xvci5nICsgXCIsXCIgKyB0aGlzLmNvbG9yLmIgKyBcIilcIik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG5cclxuXHJcbiAgICBjdHgucmVjdCh0aGlzLnggKyAzMCwgdGhpcy55ICsgMzAsIHRoaXMubGVuZ3RoIC0gMzAsIHRoaXMubGVuZ3RoIC0gMzApO1xyXG5cclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwiZnVuY3Rpb24gVHJhaWwoY2xpZW50KSB7XHJcbiAgICB0aGlzLnJlYWxQYXRoID0gW107XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuVHJhaWwucHJvdG90eXBlLnVwZGF0ZUxpc3QgPSBmdW5jdGlvbiAoeCx5KSB7XHJcbiAgICB2YXIgY3VyclggPSB0aGlzLmNsaWVudC5TRUxGX1BMQVlFUi54ICsgeDtcclxuICAgIHZhciBjdXJyWSA9IHRoaXMuY2xpZW50LlNFTEZfUExBWUVSLnkgKyB5O1xyXG5cclxuICAgIHRoaXMucmVhbFBhdGgucHVzaCh7XHJcbiAgICAgICAgeDogY3VyclgsXHJcbiAgICAgICAgeTogY3VycllcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICh0aGlzLnJlYWxQYXRoLmxlbmd0aCA+IDE4KSB7XHJcbiAgICAgICAgdGhpcy5yZWFsUGF0aC5zcGxpY2UoMCwxKTtcclxuICAgIH1cclxufTtcclxuXHJcblRyYWlsLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMTI2LCAxMzgsIDE1OCwgMC4zKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuICAgIGlmICh0aGlzLnJlYWxQYXRoLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGN0eC5tb3ZlVG8odGhpcy5yZWFsUGF0aFt0aGlzLnJlYWxQYXRoLmxlbmd0aCAtIDFdLngsIFxyXG4gICAgICAgIHRoaXMucmVhbFBhdGhbdGhpcy5yZWFsUGF0aC5sZW5ndGggLSAxXS55KTtcclxuXHJcbiAgICB2YXIgaTtcclxuICAgIGZvciAoaSA9IHRoaXMucmVhbFBhdGgubGVuZ3RoIC0gMjsgaT49MDsgaS0tKSB7XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnJlYWxQYXRoW2ldLngsIHRoaXMucmVhbFBhdGhbaV0ueSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmFpbDtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEFuaW1hdGlvbjogcmVxdWlyZSgnLi9BbmltYXRpb24nKSxcclxuICAgIENvbnRyb2xsZXI6IHJlcXVpcmUoJy4vQ29udHJvbGxlcicpLFxyXG4gICAgSG9tZTogcmVxdWlyZSgnLi9Ib21lJyksXHJcbiAgICBNaW5pTWFwOiByZXF1aXJlKCcuL01pbmlNYXAnKSxcclxuICAgIFRpbGU6IHJlcXVpcmUoJy4vVGlsZScpLFxyXG4gICAgQXN0ZXJvaWQ6IHJlcXVpcmUoJy4vQXN0ZXJvaWQnKSxcclxuICAgIFRyYWlsOiByZXF1aXJlKCcuL1RyYWlsJyksXHJcbiAgICBSb2NrOiByZXF1aXJlKCcuL1JvY2snKVxyXG59OyIsInZhciBDbGllbnQgPSByZXF1aXJlKCcuL0NsaWVudC5qcycpO1xyXG52YXIgTWFpblVJID0gcmVxdWlyZSgnLi91aS9NYWluVUknKTtcclxuXHJcbnZhciBjbGllbnQgPSBuZXcgQ2xpZW50KCk7XHJcbmNsaWVudC5zdGFydCgpO1xyXG5cclxuXHJcbmRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGNsaWVudC5DSEFUX09QRU4pIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IHRydWU7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogdHJ1ZX0pO1xyXG59O1xyXG5cclxuZG9jdW1lbnQub25rZXl1cCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDg0KSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5VSS5nYW1lVUkuY2hhdFVJLnRleHRJbnB1dC5jbGljaygpO1xyXG4gICAgfVxyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSBmYWxzZTtcclxuICAgIGNsaWVudC5zb2NrZXQuZW1pdCgna2V5RXZlbnQnLCB7aWQ6IGV2ZW50LmtleUNvZGUsIHN0YXRlOiBmYWxzZX0pO1xyXG59O1xyXG5cclxuXHJcbiQod2luZG93KS5iaW5kKCdtb3VzZXdoZWVsIERPTU1vdXNlU2Nyb2xsJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQuY3RybEtleSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2xpZW50LkNIQVRfU0NST0xMKSB7XHJcbiAgICAgICAgY2xpZW50LkNIQVRfU0NST0xMID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2ZW50Lm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YSAvMTIwID4gMCAmJiBjbGllbnQubWFpblNjYWxlRmFjdG9yIDwgMikge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgKz0gMC4yO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuNSkge1xyXG4gICAgICAgIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgLT0gMC4yO1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGUpIHsgLy9wcmV2ZW50IHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG59LCBmYWxzZSk7IiwiZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7ICAvLyBmaXJlZm94LCBjaHJvbWVcclxuZG9jdW1lbnQuYm9keS5zY3JvbGwgPSBcIm5vXCI7XHJcblxyXG52YXIgUGxheWVyTmFtZXJVSSA9IHJlcXVpcmUoJy4vUGxheWVyTmFtZXJVSScpO1xyXG52YXIgR2FtZVVJID0gcmVxdWlyZSgnLi9nYW1lL0dhbWVVSScpO1xyXG5cclxuZnVuY3Rpb24gTWFpblVJKGNsaWVudCwgc29ja2V0KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG5cclxuICAgIHRoaXMuZ2FtZVVJID0gbmV3IEdhbWVVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQsIHRoaXMpO1xyXG5cclxuICAgIHRoaXMucGxheWVyTmFtZXJVSSA9IG5ldyBQbGF5ZXJOYW1lclVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCk7XHJcbn1cclxuXHJcbk1haW5VSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChpbmZvKSB7XHJcbiAgICB2YXIgYWN0aW9uID0gaW5mby5hY3Rpb247XHJcbiAgICB2YXIgaG9tZTtcclxuICAgIGlmIChhY3Rpb24gPT09IFwiZ2FtZU1zZ1Byb21wdFwiKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lVUkuZ2FtZU1zZ1Byb21wdC5vcGVuKGluZm8ubWVzc2FnZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChhY3Rpb24pIHtcclxuICAgIGlmIChhY3Rpb24gPT09IFwiZ2FtZU1zZ1Byb21wdFwiKSB7XHJcbiAgICAgICAgdGhpcy5nYW1lVUkuZ2FtZU1zZ1Byb21wdC5jbG9zZSgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUudXBkYXRlTGVhZGVyQm9hcmQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbGVhZGVyYm9hcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYWRlcmJvYXJkXCIpO1xyXG4gICAgdmFyIFBMQVlFUl9BUlJBWSA9IHRoaXMuY2xpZW50LlBMQVlFcl9BUlJBWTtcclxuXHJcblxyXG4gICAgdmFyIHBsYXllclNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgIHZhciBmYWN0aW9uQSA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFthXTtcclxuICAgICAgICB2YXIgZmFjdGlvbkIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbYl07XHJcbiAgICAgICAgcmV0dXJuIGZhY3Rpb25BLnNjb3JlIC0gZmFjdGlvbkIuc2NvcmU7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgUExBWUVSX0FSUkFZLnNvcnQocGxheWVyU29ydCk7XHJcbiAgICBsZWFkZXJib2FyZC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSBQTEFZRVJfQVJSQVkubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgcGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW1BMQVlFUl9BUlJBWVtpXV07XHJcblxyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGxheWVyLm5hbWUgKyBcIiAtIFwiICsgcGxheWVyLnNjb3JlKSk7XHJcbiAgICAgICAgbGVhZGVyYm9hcmQuYXBwZW5kQ2hpbGQoZW50cnkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1haW5VSTsiLCJmdW5jdGlvbiBQbGF5ZXJOYW1lclVJIChjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm5hbWVCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hbWVTdWJtaXRcIik7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyTmFtZUlucHV0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheWVyX25hbWVyXCIpO1xyXG59XHJcblxyXG5QbGF5ZXJOYW1lclVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZUJ0bi5jbGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5uYW1lQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5jbGllbnQubWFpbkNhbnZhcy5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm5ld1BsYXllclwiLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLnBsYXllck5hbWVJbnB1dC52YWx1ZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmZvY3VzKCk7XHJcbiAgICB0aGlzLmxlYWRlcmJvYXJkLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJOYW1lclVJOyIsImZ1bmN0aW9uIENoYXRVSShwYXJlbnQpIHtcclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgdGhpcy50ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLnRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2lucHV0Jyk7XHJcbiAgICB0aGlzLmNoYXRMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXRfbGlzdCcpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC5mb2N1cygpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9PUEVOID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmNoYXRMaXN0LnN0eWxlLmhlaWdodCA9IFwiODAlXCI7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcImF1dG9cIjtcclxuXHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgzNCwgNDgsIDcxLCAxKVwiO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIHRoaXMudGV4dElucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZE1lc3NhZ2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuXHJcbiAgICB0aGlzLnRlbXBsYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfU0NST0xMID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfQ0xJQ0sgPSB0cnVlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufVxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuYmx1cigpO1xyXG4gICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IGZhbHNlO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjMwJVwiO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMDIpXCI7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5zdHlsZS5iYWNrZ3JvdW5kID0gXCJyZ2JhKDE4MiwgMTkzLCAyMTEsIDAuMSlcIjtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5vdmVyZmxvd1kgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcblxyXG5DaGF0VUkucHJvdG90eXBlLmFkZE1lc3NhZ2UgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFja2V0Lm5hbWUgKyBcIiA6IFwiICsgcGFja2V0LmNoYXRNZXNzYWdlKSk7XHJcbiAgICB0aGlzLmNoYXRMaXN0LmFwcGVuZENoaWxkKGVudHJ5KTtcclxuXHJcbiAgICAkKCcjY2hhdF9saXN0JykuYW5pbWF0ZSh7c2Nyb2xsVG9wOiAkKCcjY2hhdF9saXN0JykucHJvcChcInNjcm9sbEhlaWdodFwiKX0sIDEwMCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzb2NrZXQgPSB0aGlzLnBhcmVudC5zb2NrZXQ7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLnRleHRJbnB1dC52YWx1ZSAmJiB0aGlzLnRleHRJbnB1dC52YWx1ZSAhPT0gXCJcIikge1xyXG4gICAgICAgIHNvY2tldC5lbWl0KCdjaGF0TWVzc2FnZScsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMucGFyZW50LmNsaWVudC5TRUxGX0lELFxyXG4gICAgICAgICAgICBtZXNzYWdlOiB0aGlzLnRleHRJbnB1dC52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhdFVJO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEdhbWVNc2dQcm9tcHQocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb21wdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZV9tc2dfcHJvbXB0Jyk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lTXNnUHJvbXB0O1xyXG5cclxuXHJcbiIsInZhciBHYW1lTXNnUHJvbXB0ID0gcmVxdWlyZSgnLi9HYW1lTXNnUHJvbXB0Jyk7XHJcbnZhciBDaGF0VUkgPSByZXF1aXJlKCcuL0NoYXRVSScpO1xyXG5cclxuZnVuY3Rpb24gR2FtZVVJKGNsaWVudCwgc29ja2V0LCBwYXJlbnQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZ2FtZU1zZ1Byb21wdCA9IG5ldyBHYW1lTXNnUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuY2hhdFVJLm9wZW4oKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiXX0=

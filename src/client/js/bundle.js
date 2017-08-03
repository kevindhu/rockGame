(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Entity = require('./entity');
var MainUI = require('./ui/MainUI');

function Client() {
    this.SELFID = null;
    this.ARROW = null;
    this.BRACKET = null;

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
        if (this.CONTROLLER_LIST[this.SELFID]) {
            var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
            var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

            this.socket.emit("mouseDown", {
                id: this.SELFID,
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
            id: this.SELFID,
            x: x,
            y: y
        });
        
        this.ARROW = null;
        this.CHAT_CLICK = false;
    }.bind(this));

    document.addEventListener("mousemove", function (event) {
        if (this.mouseMoveTimer > 0) {
            this.mouseMoveTimer -= 1;
            return;
        } 
        else {
            if (this.active) {
                this.mouseMoveTimer = 2;
            }
            else {
                this.mouseMoveTimer = 20;
            }
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

        this.socket.emit("mouseMove", {
            id: this.SELFID,
            x: x,
            y: y
        });
    }.bind(this));
};



Client.prototype.initLists = function () {
    this.FACTION_LIST = {};
    this.FACTION_ARRAY = [];

    this.CONTROLLER_LIST = {};
    this.TILE_LIST = {};
    this.SHARD_LIST = {};
    this.ASTEROID_LIST = {};
    this.LASER_LIST = {};
    this.HOME_LIST = {};
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
            if (this.SELFID === packet.playerId) {
                this.mainUI.open(packet);
            }
            break;
        case "selfId":
            this.SELFID = packet.selfId;
            this.mainUI.gameUI.open();
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
            if (this.SELFID === packet.playerId) {
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
            if (this.SELFID === packet.id) {
                this.mainUI.close(packet.action);
            }
            break;
    }
};

Client.prototype.drawScene = function (data) {
    var id;
    var selfPlayer = this.CONTROLLER_LIST[this.SELFID];
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
    var drawConnectors = function () {
        for (var id in this.HOME_LIST) {
            this.mainCtx.beginPath();
            var home = this.HOME_LIST[id];
            if (home.neighbors) {
                for (var i = 0; i < home.neighbors.length; i++) {
                    var neighbor = this.HOME_LIST[home.neighbors[i]];
                    this.mainCtx.moveTo(home.x, home.y);

                    this.mainCtx.strokeStyle = "#912381";
                    this.mainCtx.lineWidth = 10;

                    this.mainCtx.lineTo(neighbor.x, neighbor.y);
                    this.mainCtx.stroke();
                }
            }
        }
    }.bind(this);
    var translateScene = function () {
        this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.scaleFactor = lerp(this.scaleFactor, this.mainScaleFactor, 0.3);

        this.mainCtx.translate(this.mainCanvas.width / 2, this.mainCanvas.height / 2);
        this.mainCtx.scale(this.scaleFactor, this.scaleFactor);
        this.mainCtx.translate(-selfPlayer.x, -selfPlayer.y);
    }.bind(this);


    if (!selfPlayer) {
        return;
    }

    this.mainCtx.clearRect(0, 0, 11000, 11000);

    this.mainCtx.fillStyle = "#1d1f21";
    this.mainCtx.fillRect(0, 0, 10000, 10000);


    for (var i = 0; i < entityList.length; i++) {
        var list = entityList[i];
        for (id in list) {
            var entity = list[id];
            if (inBounds(selfPlayer, entity.x, entity.y)) {
                entity.show();
            }
        }
    }
    if (this.BRACKET) {
        this.BRACKET.show();
    }
    if (this.ARROW) {
        this.ARROW.show();
    }
    drawConnectors(); //fix this, as right now buildings are drawn first
    translateScene();
};


function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


module.exports = Client;
},{"./entity":9,"./ui/MainUI":11}],2:[function(require,module,exports){
function Animation(animationInfo, client) {
    this.type = animationInfo.type;
    this.id = animationInfo.id;
    this.name = animationInfo.name;
    this.x = animationInfo.x;
    this.y = animationInfo.y;
    this.theta = 15;
    this.timer = getRandom(10, 14);

    if (this.x) {
        this.endX = this.x + getRandom(-100, 100);
        this.endY = this.y + getRandom(-100, 100);
    }

    this.client = client;
}


Animation.prototype.show = function () {
    var home;
    var ctx = this.client.mainCtx;
    if (this.type === "addShard") {
        console.log("DRAWING ADD SHARD ANIMATION");
        home = this.client.HOME_LIST[this.id];
        if (!home) {
            return;
        }
        ctx.beginPath();
        ctx.lineWidth = 3 * this.timer;
        ctx.strokeStyle = "#012CCC";
        ctx.arc(home.x, home.y, home.radius, 0, this.timer / 1.2, true);
        ctx.stroke();
        ctx.closePath();
    }

    if (this.type === "removeShard") {
        home = this.client.HOME_LIST[this.id];
        if (!home) {
            delete this.client.ANIMATION_LIST[id];
            return;
        }
        ctx.beginPath();
        ctx.lineWidth = 15 - this.timer;
        ctx.strokeStyle = "rgba(255, 0, 0, " + this.timer * 10 / 100 + ")";
        ctx.arc(home.x, home.y, home.radius, 0, 2 * Math.PI, false);
        ctx.stroke();
        ctx.closePath();
    }

    if (this.type === "shardDeath") {
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
    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELFID];
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

    this.client = client;
}

Asteroid.prototype.update = function (asteroidInfo) {
    this.x = asteroidInfo.x;
    this.y = asteroidInfo.y;
    this.radius = asteroidInfo.radius;
    this.currPath = asteroidInfo.currPath;
    this.queuePosition = asteroidInfo.queuePosition;
    this.targetPt = asteroidInfo.targetPt;
    this.health = asteroidInfo.health;
    this.maxHealth = asteroidInfo.maxHealth;
};


Asteroid.prototype.show = function () {
    var ctx = this.client.mainCtx;
    ctx.lineWidth = 2;

    ctx.beginPath();

    if (this.material === "sulfer") {
        ctx.fillStyle = "#33251c";
    }
    else if (this.material === "copper") {
        ctx.fillStyle = "#ba6a37";
    }
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.closePath();

    if (this.currPath) {
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


    if (this.health && this.maxHealth) {
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 100, 20);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.fillStyle = "green";
        ctx.rect(this.x, this.y, 100 * this.health/this.maxHealth, 20);
        ctx.fill();
        ctx.closePath();
    }

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
    this.owner = controllerInfo.owner;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level; //need to implement again
    this.radius = controllerInfo.radius;
    this.active = controllerInfo.active;
    this.slash = controllerInfo.slash;
    this.client = client;
}

Controller.prototype.update = function (controllerInfo) {
    this.x = controllerInfo.x;
    this.y = controllerInfo.y;
    this.health = controllerInfo.health;
    this.maxHealth = controllerInfo.maxHealth;
    this.theta = controllerInfo.theta;
    this.level = controllerInfo.level;
    this.active = controllerInfo.active;
    this.slash = controllerInfo.slash;


    this.client.active = this.active; //probably should change this
    
};

Controller.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var selfId = this.client.SELFID;
    var fillAlpha;
    var strokeAlpha;
    var i;


    fillAlpha = this.health / (4 * this.maxHealth);
    strokeAlpha = 1;
    
    ctx.font = "20px Arial";

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
    if (1===1) {
        var radius = 30;
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
    }
    else { //bot
        var x, y, theta, startX, startY;
        var smallRadius = 12;
        var bigRadius = this.radius;

        theta = this.theta;
        startX = bigRadius * Math.cos(theta);
        startY = bigRadius * Math.sin(theta);
        ctx.moveTo(this.x + startX, this.y + startY);
        for (i = 1; i <= 2; i++) {
            theta = this.theta + 2 * Math.PI / 3 * i +
                getRandom(-this.maxHealth / this.health / 7, this.maxHealth / this.health / 7);
            x = smallRadius * Math.cos(theta);
            y = smallRadius * Math.sin(theta);
            ctx.lineTo(this.x + x, this.y + y);
        }
        ctx.lineTo(this.x + startX, this.y + startY);
        ctx.fill();
    }

    if (this.slash) {
        ctx.beginPath();
        ctx.fillStyle = "orange";
        for (var i = 0; i<this.slash.length; i++) {
            ctx.arc(this.slash[i].x, this.slash[i].y, 10, 0, 2 * Math.PI, false);
            ctx.fill();
        }
        ctx.closePath();
    }

    ctx.fillStyle = "#ff9d60";
    ctx.fillText(this.name, this.x, this.y + 70);
    if (this.selected && this.owner === this.client.SELFID) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#1d55af";
        ctx.stroke();
    }
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

    var selfPlayer = this.client.CONTROLLER_LIST[this.client.SELFID];

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
module.exports = {
    Animation: require('./Animation'),
    Arrow: require('./Arrow'),
    Controller: require('./Controller'),
    Home: require('./Home'),
    MiniMap: require('./MiniMap'),
    Tile: require('./Tile'),
    Asteroid: require('./Asteroid')
};
},{"./Animation":2,"./Arrow":3,"./Asteroid":4,"./Controller":5,"./Home":6,"./MiniMap":7,"./Tile":8}],10:[function(require,module,exports){
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
},{"./Client.js":1,"./ui/MainUI":11}],11:[function(require,module,exports){
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
},{"./PlayerNamerUI":12,"./game/GameUI":15}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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



},{}],14:[function(require,module,exports){
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



},{}],15:[function(require,module,exports){
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
},{"./ChatUI":13,"./GameMsgPrompt":14}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0NsaWVudC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0FuaW1hdGlvbi5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L0Fycm93LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQXN0ZXJvaWQuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9Db250cm9sbGVyLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvSG9tZS5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L01pbmlNYXAuanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9lbnRpdHknKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcblxyXG5mdW5jdGlvbiBDbGllbnQoKSB7XHJcbiAgICB0aGlzLlNFTEZJRCA9IG51bGw7XHJcbiAgICB0aGlzLkFSUk9XID0gbnVsbDtcclxuICAgIHRoaXMuQlJBQ0tFVCA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5tb3VzZU1vdmVUaW1lciA9IDA7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignaW5pdFZlcmlmaWNhdGlvbicsIHRoaXMudmVyaWZ5LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUVudGl0aWVzJywgdGhpcy5oYW5kbGVQYWNrZXQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignZHJhd1NjZW5lJywgdGhpcy5kcmF3U2NlbmUuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignY2hhdE1lc3NhZ2UnLCB0aGlzLm1haW5VSSlcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Q2FudmFzZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLm1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5fY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgIzAwMDAwMCc7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4ID0gdGhpcy5tYWluQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAodGhpcy5DT05UUk9MTEVSX0xJU1RbdGhpcy5TRUxGSURdKSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcIm1vdXNlRG93blwiLCB7XHJcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5TRUxGSUQsXHJcbiAgICAgICAgICAgICAgICB4OiB4LFxyXG4gICAgICAgICAgICAgICAgeTogeVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuQ0hBVF9DTElDSykge1xyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC0gdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLSB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwibW91c2VVcFwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZJRCxcclxuICAgICAgICAgICAgeDogeCxcclxuICAgICAgICAgICAgeTogeVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuQVJST1cgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuQ0hBVF9DTElDSyA9IGZhbHNlO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1vdXNlTW92ZVRpbWVyID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1vdXNlTW92ZVRpbWVyIC09IDE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IFxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW91c2VNb3ZlVGltZXIgPSAyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3VzZU1vdmVUaW1lciA9IDIwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB4ID0gKChldmVudC54IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldFdpZHRoICogMTAwMCkgLSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHkgPSAoKGV2ZW50LnkgLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0SGVpZ2h0ICogNTAwKSAtIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKSAvIHRoaXMuc2NhbGVGYWN0b3I7XHJcblxyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJtb3VzZU1vdmVcIiwge1xyXG4gICAgICAgICAgICBpZDogdGhpcy5TRUxGSUQsXHJcbiAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgIHk6IHlcclxuICAgICAgICB9KTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5GQUNUSU9OX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuRkFDVElPTl9BUlJBWSA9IFtdO1xyXG5cclxuICAgIHRoaXMuQ09OVFJPTExFUl9MSVNUID0ge307XHJcbiAgICB0aGlzLlRJTEVfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5TSEFSRF9MSVNUID0ge307XHJcbiAgICB0aGlzLkFTVEVST0lEX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuTEFTRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5IT01FX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QgPSB7fTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Vmlld2VycyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMua2V5cyA9IFtdO1xyXG4gICAgdGhpcy5zY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5TY2FsZUZhY3RvciA9IDE7XHJcbiAgICB0aGlzLm1haW5VSSA9IG5ldyBNYWluVUkodGhpcywgdGhpcy5zb2NrZXQpO1xyXG5cclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS52ZXJpZnkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRUQgQ0xJRU5UXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxufTsgXHJcblxyXG5DbGllbnQucHJvdG90eXBlLmhhbmRsZVBhY2tldCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICB2YXIgcGFja2V0LCBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBwYWNrZXQgPSBkYXRhW2ldO1xyXG4gICAgICAgIHN3aXRjaCAocGFja2V0Lm1hc3Rlcikge1xyXG4gICAgICAgICAgICBjYXNlIFwiYWRkXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWxldGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGRhdGVcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgYWRkRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgZW50aXR5LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdFtwYWNrZXQuaWRdID0gbmV3IGVudGl0eShwYWNrZXQsIHRoaXMpO1xyXG4gICAgICAgIGlmIChhcnJheSAmJiBhcnJheS5pbmRleE9mKHBhY2tldC5pZCkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2gocGFja2V0LmlkKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QsIEVudGl0eS5UaWxlKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImNvbnRyb2xsZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuQ09OVFJPTExFUl9MSVNULCBFbnRpdHkuQ29udHJvbGxlcik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhc3Rlcm9pZEluZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5BU1RFUk9JRF9MSVNULCBFbnRpdHkuQXN0ZXJvaWQpO1xyXG4gICAgICAgIGNhc2UgXCJhbmltYXRpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuQU5JTUFUSU9OX0xJU1QsIEVudGl0eS5BbmltYXRpb24pO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZJRCA9PT0gcGFja2V0LnBsYXllcklkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5vcGVuKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNlbGZJZFwiOlxyXG4gICAgICAgICAgICB0aGlzLlNFTEZJRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgIHRoaXMubWFpblVJLmdhbWVVSS5vcGVuKCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgZnVuY3Rpb24gdXBkYXRlRW50aXR5KHBhY2tldCwgbGlzdCkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbcGFja2V0LmlkXTtcclxuICAgICAgICBpZiAoIWVudGl0eSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudGl0eS51cGRhdGUocGFja2V0KTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICB1cGRhdGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhc3Rlcm9pZEluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5BU1RFUk9JRF9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImhvbWVJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuSE9NRV9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZhY3Rpb25JbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuRkFDVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjb250cm9sbGVySW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkNPTlRST0xMRVJfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJhc3Rlcm9pZEluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5BU1RFUk9JRF9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5BTklNQVRJT05fTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJVSUluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHRoaXMuU0VMRklEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIGlkO1xyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLkNPTlRST0xMRVJfTElTVFt0aGlzLlNFTEZJRF07XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLkNPTlRST0xMRVJfTElTVCxcclxuICAgICAgICB0aGlzLkFTVEVST0lEX0xJU1QsXHJcbiAgICAgICAgdGhpcy5BTklNQVRJT05fTElTVFxyXG4gICAgXTtcclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMC43ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB2YXIgZHJhd0Nvbm5lY3RvcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5IT01FX0xJU1QpIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluQ3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICB2YXIgaG9tZSA9IHRoaXMuSE9NRV9MSVNUW2lkXTtcclxuICAgICAgICAgICAgaWYgKGhvbWUubmVpZ2hib3JzKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvbWUubmVpZ2hib3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5laWdoYm9yID0gdGhpcy5IT01FX0xJU1RbaG9tZS5uZWlnaGJvcnNbaV1dO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFpbkN0eC5tb3ZlVG8oaG9tZS54LCBob21lLnkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW5DdHguc3Ryb2tlU3R5bGUgPSBcIiM5MTIzODFcIjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1haW5DdHgubGluZVdpZHRoID0gMTA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFpbkN0eC5saW5lVG8obmVpZ2hib3IueCwgbmVpZ2hib3IueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWluQ3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgdmFyIHRyYW5zbGF0ZVNjZW5lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XHJcbiAgICAgICAgdGhpcy5zY2FsZUZhY3RvciA9IGxlcnAodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5tYWluU2NhbGVGYWN0b3IsIDAuMyk7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbkN0eC50cmFuc2xhdGUodGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMiwgdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpO1xyXG4gICAgICAgIHRoaXMubWFpbkN0eC5zY2FsZSh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLnNjYWxlRmFjdG9yKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKC1zZWxmUGxheWVyLngsIC1zZWxmUGxheWVyLnkpO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuXHJcbiAgICBpZiAoIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmNsZWFyUmVjdCgwLCAwLCAxMTAwMCwgMTEwMDApO1xyXG5cclxuICAgIHRoaXMubWFpbkN0eC5maWxsU3R5bGUgPSBcIiMxZDFmMjFcIjtcclxuICAgIHRoaXMubWFpbkN0eC5maWxsUmVjdCgwLCAwLCAxMDAwMCwgMTAwMDApO1xyXG5cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVudGl0eUxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbGlzdCA9IGVudGl0eUxpc3RbaV07XHJcbiAgICAgICAgZm9yIChpZCBpbiBsaXN0KSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRpdHkgPSBsaXN0W2lkXTtcclxuICAgICAgICAgICAgaWYgKGluQm91bmRzKHNlbGZQbGF5ZXIsIGVudGl0eS54LCBlbnRpdHkueSkpIHtcclxuICAgICAgICAgICAgICAgIGVudGl0eS5zaG93KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5CUkFDS0VUKSB7XHJcbiAgICAgICAgdGhpcy5CUkFDS0VULnNob3coKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLkFSUk9XKSB7XHJcbiAgICAgICAgdGhpcy5BUlJPVy5zaG93KCk7XHJcbiAgICB9XHJcbiAgICBkcmF3Q29ubmVjdG9ycygpOyAvL2ZpeCB0aGlzLCBhcyByaWdodCBub3cgYnVpbGRpbmdzIGFyZSBkcmF3biBmaXJzdFxyXG4gICAgdHJhbnNsYXRlU2NlbmUoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50OyIsImZ1bmN0aW9uIEFuaW1hdGlvbihhbmltYXRpb25JbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMudHlwZSA9IGFuaW1hdGlvbkluZm8udHlwZTtcclxuICAgIHRoaXMuaWQgPSBhbmltYXRpb25JbmZvLmlkO1xyXG4gICAgdGhpcy5uYW1lID0gYW5pbWF0aW9uSW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gYW5pbWF0aW9uSW5mby54O1xyXG4gICAgdGhpcy55ID0gYW5pbWF0aW9uSW5mby55O1xyXG4gICAgdGhpcy50aGV0YSA9IDE1O1xyXG4gICAgdGhpcy50aW1lciA9IGdldFJhbmRvbSgxMCwgMTQpO1xyXG5cclxuICAgIGlmICh0aGlzLngpIHtcclxuICAgICAgICB0aGlzLmVuZFggPSB0aGlzLnggKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgICAgICB0aGlzLmVuZFkgPSB0aGlzLnkgKyBnZXRSYW5kb20oLTEwMCwgMTAwKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBob21lO1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcImFkZFNoYXJkXCIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkRSQVdJTkcgQUREIFNIQVJEIEFOSU1BVElPTlwiKTtcclxuICAgICAgICBob21lID0gdGhpcy5jbGllbnQuSE9NRV9MSVNUW3RoaXMuaWRdO1xyXG4gICAgICAgIGlmICghaG9tZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMyAqIHRoaXMudGltZXI7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMDEyQ0NDXCI7XHJcbiAgICAgICAgY3R4LmFyYyhob21lLngsIGhvbWUueSwgaG9tZS5yYWRpdXMsIDAsIHRoaXMudGltZXIgLyAxLjIsIHRydWUpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJyZW1vdmVTaGFyZFwiKSB7XHJcbiAgICAgICAgaG9tZSA9IHRoaXMuY2xpZW50LkhPTUVfTElTVFt0aGlzLmlkXTtcclxuICAgICAgICBpZiAoIWhvbWUpIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW2lkXTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE1IC0gdGhpcy50aW1lcjtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LCAwLCAwLCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5hcmMoaG9tZS54LCBob21lLnksIGhvbWUucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gXCJzaGFyZERlYXRoXCIpIHtcclxuICAgICAgICBjdHguZm9udCA9IDYwIC0gdGhpcy50aW1lciArIFwicHggQXJpYWxcIjtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIGN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIHRoaXMudGhldGEpO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAxNjgsIDg2LCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgdGhpcy50aGV0YSA9IGxlcnAodGhpcy50aGV0YSwgMCwgMC4wOCk7XHJcbiAgICAgICAgdGhpcy54ID0gbGVycCh0aGlzLngsIHRoaXMuZW5kWCwgMC4xKTtcclxuICAgICAgICB0aGlzLnkgPSBsZXJwKHRoaXMueSwgdGhpcy5lbmRZLCAwLjEpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudGltZXItLTtcclxuICAgIGlmICh0aGlzLnRpbWVyIDw9IDApIHtcclxuICAgICAgICBkZWxldGUgdGhpcy5jbGllbnQuQU5JTUFUSU9OX0xJU1RbdGhpcy5pZF07XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHJhdGlvKSB7XHJcbiAgICByZXR1cm4gYSArIHJhdGlvICogKGIgLSBhKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb247IiwiZnVuY3Rpb24gQXJyb3coeCwgeSwgY2xpZW50KSB7XHJcbiAgICB0aGlzLnByZVggPSB4O1xyXG4gICAgdGhpcy5wcmVZID0geTtcclxuICAgIHRoaXMucG9zdFggPSB4O1xyXG4gICAgdGhpcy5wb3N0WSA9IHk7XHJcbiAgICB0aGlzLmRlbHRhWCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3N0WCAtIG1haW5DYW52YXMud2lkdGggLyAyO1xyXG4gICAgfTtcclxuICAgIHRoaXMuZGVsdGFZID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc3RZIC0gbWFpbkNhbnZhcy5oZWlnaHQgLyAyO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuQXJyb3cucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgY2FudmFzID0gdGhpcy5jbGllbnQuZHJhZnRDYW52YXM7XHJcbiAgICB2YXIgY3R4ID0gdGhpcy5jbGllbnQubWFpbkN0eDtcclxuICAgIHZhciBzZWxmUGxheWVyID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW3RoaXMuY2xpZW50LlNFTEZJRF07XHJcbiAgICB2YXIgc2NhbGVGYWN0b3IgPSB0aGlzLmNsaWVudC5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICBpZiAodGhpcy5wb3N0WCkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM1MjE1MjJcIjtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDUyLCAxNzUsIDIxNiwgMC4zKVwiO1xyXG5cclxuICAgICAgICB2YXIgcHJlWCA9IHNlbGZQbGF5ZXIueCArICh0aGlzLnByZVggLSBjYW52YXMud2lkdGggLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciBwcmVZID0gc2VsZlBsYXllci55ICsgKHRoaXMucHJlWSAtIGNhbnZhcy5oZWlnaHQgLyAyKSAvIHNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICB2YXIgcG9zdFggPSBzZWxmUGxheWVyLnggKyAodGhpcy5wb3N0WCAtIGNhbnZhcy53aWR0aCAvIDIpIC8gc2NhbGVGYWN0b3I7XHJcbiAgICAgICAgdmFyIHBvc3RZID0gc2VsZlBsYXllci55ICsgKHRoaXMucG9zdFkgLSBjYW52YXMuaGVpZ2h0IC8gMikgLyBzY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHByZVgsIHByZVksIHBvc3RYIC0gcHJlWCwgcG9zdFkgLSBwcmVZKTtcclxuXHJcbiAgICAgICAgY3R4LmFyYyhwb3N0WCwgcG9zdFksIDMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFycm93OyIsImZ1bmN0aW9uIEFzdGVyb2lkKGFzdGVyb2lkSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gYXN0ZXJvaWRJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gYXN0ZXJvaWRJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhc3Rlcm9pZEluZm8ueTtcclxuICAgIHRoaXMucmFkaXVzID0gYXN0ZXJvaWRJbmZvLnJhZGl1cztcclxuICAgIHRoaXMuaGVhbHRoID0gYXN0ZXJvaWRJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gYXN0ZXJvaWRJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMubWF0ZXJpYWwgPSBhc3Rlcm9pZEluZm8ubWF0ZXJpYWw7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcbkFzdGVyb2lkLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoYXN0ZXJvaWRJbmZvKSB7XHJcbiAgICB0aGlzLnggPSBhc3Rlcm9pZEluZm8ueDtcclxuICAgIHRoaXMueSA9IGFzdGVyb2lkSW5mby55O1xyXG4gICAgdGhpcy5yYWRpdXMgPSBhc3Rlcm9pZEluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5jdXJyUGF0aCA9IGFzdGVyb2lkSW5mby5jdXJyUGF0aDtcclxuICAgIHRoaXMucXVldWVQb3NpdGlvbiA9IGFzdGVyb2lkSW5mby5xdWV1ZVBvc2l0aW9uO1xyXG4gICAgdGhpcy50YXJnZXRQdCA9IGFzdGVyb2lkSW5mby50YXJnZXRQdDtcclxuICAgIHRoaXMuaGVhbHRoID0gYXN0ZXJvaWRJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gYXN0ZXJvaWRJbmZvLm1heEhlYWx0aDtcclxufTtcclxuXHJcblxyXG5Bc3Rlcm9pZC5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDI7XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGlmICh0aGlzLm1hdGVyaWFsID09PSBcInN1bGZlclwiKSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzMzMjUxY1wiO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodGhpcy5tYXRlcmlhbCA9PT0gXCJjb3BwZXJcIikge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNiYTZhMzdcIjtcclxuICAgIH1cclxuICAgIGN0eC5hcmModGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICBpZiAodGhpcy5jdXJyUGF0aCkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5hcmModGhpcy5jdXJyUGF0aC54LCB0aGlzLmN1cnJQYXRoLnksIDEwLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnF1ZXVlUG9zaXRpb24gJiYgMT09PTIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwieWVsbG93XCI7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLnF1ZXVlUG9zaXRpb24ueCwgdGhpcy5xdWV1ZVBvc2l0aW9uLnksIDEwLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBpZiAodGhpcy50YXJnZXRQdCAmJiAxPT09Mikge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJwaW5rXCI7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLnRhcmdldFB0LngsIHRoaXMudGFyZ2V0UHQueSwgMTAsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGlmICh0aGlzLmhlYWx0aCAmJiB0aGlzLm1heEhlYWx0aCkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aC90aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXN0ZXJvaWQ7IiwiZnVuY3Rpb24gQ29udHJvbGxlcihjb250cm9sbGVySW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gY29udHJvbGxlckluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBjb250cm9sbGVySW5mby5uYW1lO1xyXG4gICAgdGhpcy54ID0gY29udHJvbGxlckluZm8ueDtcclxuICAgIHRoaXMueSA9IGNvbnRyb2xsZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gY29udHJvbGxlckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy5vd25lciA9IGNvbnRyb2xsZXJJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50aGV0YSA9IGNvbnRyb2xsZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsOyAvL25lZWQgdG8gaW1wbGVtZW50IGFnYWluXHJcbiAgICB0aGlzLnJhZGl1cyA9IGNvbnRyb2xsZXJJbmZvLnJhZGl1cztcclxuICAgIHRoaXMuYWN0aXZlID0gY29udHJvbGxlckluZm8uYWN0aXZlO1xyXG4gICAgdGhpcy5zbGFzaCA9IGNvbnRyb2xsZXJJbmZvLnNsYXNoO1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChjb250cm9sbGVySW5mbykge1xyXG4gICAgdGhpcy54ID0gY29udHJvbGxlckluZm8ueDtcclxuICAgIHRoaXMueSA9IGNvbnRyb2xsZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IGNvbnRyb2xsZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gY29udHJvbGxlckluZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy50aGV0YSA9IGNvbnRyb2xsZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5sZXZlbCA9IGNvbnRyb2xsZXJJbmZvLmxldmVsO1xyXG4gICAgdGhpcy5hY3RpdmUgPSBjb250cm9sbGVySW5mby5hY3RpdmU7XHJcbiAgICB0aGlzLnNsYXNoID0gY29udHJvbGxlckluZm8uc2xhc2g7XHJcblxyXG5cclxuICAgIHRoaXMuY2xpZW50LmFjdGl2ZSA9IHRoaXMuYWN0aXZlOyAvL3Byb2JhYmx5IHNob3VsZCBjaGFuZ2UgdGhpc1xyXG4gICAgXHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgc2VsZklkID0gdGhpcy5jbGllbnQuU0VMRklEO1xyXG4gICAgdmFyIGZpbGxBbHBoYTtcclxuICAgIHZhciBzdHJva2VBbHBoYTtcclxuICAgIHZhciBpO1xyXG5cclxuXHJcbiAgICBmaWxsQWxwaGEgPSB0aGlzLmhlYWx0aCAvICg0ICogdGhpcy5tYXhIZWFsdGgpO1xyXG4gICAgc3Ryb2tlQWxwaGEgPSAxO1xyXG4gICAgXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuICAgIGlmICh0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyMDIsIDEyLCAzNyxcIiArIHN0cm9rZUFscGhhICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjUyLCAxMDIsIDM3LFwiICsgc3Ryb2tlQWxwaGEgKyBcIilcIjtcclxuICAgIH1cclxuXHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEyMywwLDAsXCIgKyBmaWxsQWxwaGEgKyBcIilcIjtcclxuICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAvL2RyYXcgcGxheWVyIG9iamVjdFxyXG4gICAgaWYgKDE9PT0xKSB7XHJcbiAgICAgICAgdmFyIHJhZGl1cyA9IDMwO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgcmFkaXVzLCB0aGlzLnkpO1xyXG4gICAgICAgIGZvciAoaSA9IE1hdGguUEkgLyA0OyBpIDw9IDIgKiBNYXRoLlBJIC0gTWF0aC5QSSAvIDQ7IGkgKz0gTWF0aC5QSSAvIDQpIHtcclxuICAgICAgICAgICAgdGhldGEgPSBpICsgZ2V0UmFuZG9tKC0odGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3LCAodGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCkgLyA3KTtcclxuICAgICAgICAgICAgeCA9IHJhZGl1cyAqIE1hdGguY29zKHRoZXRhKTtcclxuICAgICAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyByYWRpdXMsIHRoaXMueSArIDMpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7IC8vYm90XHJcbiAgICAgICAgdmFyIHgsIHksIHRoZXRhLCBzdGFydFgsIHN0YXJ0WTtcclxuICAgICAgICB2YXIgc21hbGxSYWRpdXMgPSAxMjtcclxuICAgICAgICB2YXIgYmlnUmFkaXVzID0gdGhpcy5yYWRpdXM7XHJcblxyXG4gICAgICAgIHRoZXRhID0gdGhpcy50aGV0YTtcclxuICAgICAgICBzdGFydFggPSBiaWdSYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgc3RhcnRZID0gYmlnUmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odGhpcy54ICsgc3RhcnRYLCB0aGlzLnkgKyBzdGFydFkpO1xyXG4gICAgICAgIGZvciAoaSA9IDE7IGkgPD0gMjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRoZXRhID0gdGhpcy50aGV0YSArIDIgKiBNYXRoLlBJIC8gMyAqIGkgK1xyXG4gICAgICAgICAgICAgICAgZ2V0UmFuZG9tKC10aGlzLm1heEhlYWx0aCAvIHRoaXMuaGVhbHRoIC8gNywgdGhpcy5tYXhIZWFsdGggLyB0aGlzLmhlYWx0aCAvIDcpO1xyXG4gICAgICAgICAgICB4ID0gc21hbGxSYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgICAgIHkgPSBzbWFsbFJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnggKyBzdGFydFgsIHRoaXMueSArIHN0YXJ0WSk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5zbGFzaCkge1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJvcmFuZ2VcIjtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLnNsYXNoLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGN0eC5hcmModGhpcy5zbGFzaFtpXS54LCB0aGlzLnNsYXNoW2ldLnksIDEwLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xyXG4gICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcbiAgICBpZiAodGhpcy5zZWxlY3RlZCAmJiB0aGlzLm93bmVyID09PSB0aGlzLmNsaWVudC5TRUxGSUQpIHtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gNTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMxZDU1YWZcIjtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7IiwiZnVuY3Rpb24gSG9tZShob21lSW5mbywgY2xpZW50KSB7XHJcbiAgICB0aGlzLmlkID0gaG9tZUluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBob21lSW5mby54O1xyXG4gICAgdGhpcy55ID0gaG9tZUluZm8ueTtcclxuICAgIHRoaXMubmFtZSA9IGhvbWVJbmZvLm93bmVyO1xyXG4gICAgdGhpcy50eXBlID0gaG9tZUluZm8udHlwZTtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5sZXZlbCA9IGhvbWVJbmZvLmxldmVsO1xyXG4gICAgdGhpcy5oYXNDb2xvciA9IGhvbWVJbmZvLmhhc0NvbG9yO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuXHJcbiAgICB0aGlzLnVuaXREbWcgPSBob21lSW5mby51bml0RG1nO1xyXG4gICAgdGhpcy51bml0U3BlZWQgPSBob21lSW5mby51bml0U3BlZWQ7XHJcbiAgICB0aGlzLnVuaXRBcm1vciA9IGhvbWVJbmZvLnVuaXRBcm1vcjtcclxuICAgIHRoaXMucXVldWUgPSBob21lSW5mby5xdWV1ZTtcclxuICAgIHRoaXMuYm90cyA9IGhvbWVJbmZvLmJvdHM7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoaG9tZUluZm8pIHtcclxuICAgIHRoaXMubGV2ZWwgPSBob21lSW5mby5sZXZlbDtcclxuICAgIHRoaXMucmFkaXVzID0gaG9tZUluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy5wb3dlciA9IGhvbWVJbmZvLnBvd2VyO1xyXG4gICAgdGhpcy5oZWFsdGggPSBob21lSW5mby5oZWFsdGg7XHJcbiAgICB0aGlzLmhhc0NvbG9yID0gaG9tZUluZm8uaGFzQ29sb3I7XHJcbiAgICB0aGlzLm5laWdoYm9ycyA9IGhvbWVJbmZvLm5laWdoYm9ycztcclxuICAgIHRoaXMudW5pdERtZyA9IGhvbWVJbmZvLnVuaXREbWc7XHJcbiAgICB0aGlzLnVuaXRTcGVlZCA9IGhvbWVJbmZvLnVuaXRTcGVlZDtcclxuICAgIHRoaXMudW5pdEFybW9yID0gaG9tZUluZm8udW5pdEFybW9yO1xyXG4gICAgdGhpcy5xdWV1ZSA9IGhvbWVJbmZvLnF1ZXVlO1xyXG4gICAgdGhpcy5ib3RzID0gaG9tZUluZm8uYm90cztcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSG9tZTtcclxuXHJcblxyXG5Ib21lLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBpZiAodGhpcy5uZWlnaGJvcnMubGVuZ3RoID49IDQpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjNDE2OWUxXCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMzOTZhNmRcIjtcclxuICAgIH1cclxuXHJcbiAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgdmFyIHNlbGZQbGF5ZXIgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbdGhpcy5jbGllbnQuU0VMRklEXTtcclxuXHJcbiAgICBpZiAoaW5Cb3VuZHNDbG9zZShzZWxmUGxheWVyLCB0aGlzLngsIHRoaXMueSkpIHtcclxuICAgICAgICBpZiAodGhpcy5mYWN0aW9uKVxyXG4gICAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMTIsIDI1NSwgMjE4LCAwLjcpXCI7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBpbkJvdW5kc0Nsb3NlKHBsYXllciwgeCwgeSkge1xyXG4gICAgdmFyIHJhbmdlID0gMTUwO1xyXG4gICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIDUgLyA0ICogcmFuZ2UpXHJcbiAgICAgICAgJiYgeSA8IChwbGF5ZXIueSArIHJhbmdlKSAmJiB5ID4gKHBsYXllci55IC0gNSAvIDQgKiByYW5nZSk7XHJcbn1cclxuIiwiZnVuY3Rpb24gTWluaU1hcCgpIHsgLy9kZXByZWNhdGVkLCBwbGVhc2UgdXBkYXRlXHJcbn1cclxuXHJcbk1pbmlNYXAucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAobWFwVGltZXIgPD0gMCB8fCBzZXJ2ZXJNYXAgPT09IG51bGwpIHtcclxuICAgICAgICB2YXIgdGlsZUxlbmd0aCA9IE1hdGguc3FydChPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpZiAodGlsZUxlbmd0aCA9PT0gMCB8fCAhc2VsZlBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpbWdEYXRhID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEodGlsZUxlbmd0aCwgdGlsZUxlbmd0aCk7XHJcbiAgICAgICAgdmFyIHRpbGU7XHJcbiAgICAgICAgdmFyIHRpbGVSR0I7XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaWQgaW4gVElMRV9MSVNUKSB7XHJcbiAgICAgICAgICAgIHRpbGVSR0IgPSB7fTtcclxuICAgICAgICAgICAgdGlsZSA9IFRJTEVfTElTVFtpZF07XHJcbiAgICAgICAgICAgIGlmICh0aWxlLmNvbG9yICYmIHRpbGUuYWxlcnQgfHwgaW5Cb3VuZHMoc2VsZlBsYXllciwgdGlsZS54LCB0aWxlLnkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSB0aWxlLmNvbG9yLnI7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmcgPSB0aWxlLmNvbG9yLmc7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSB0aWxlLmNvbG9yLmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLnIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuYiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpXSA9IHRpbGVSR0IucjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAxXSA9IHRpbGVSR0IuZztcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAyXSA9IHRpbGVSR0IuYjtcclxuICAgICAgICAgICAgaW1nRGF0YS5kYXRhW2kgKyAzXSA9IDI1NTtcclxuICAgICAgICAgICAgaSArPSA0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyg0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKTtcclxuICAgICAgICBpbWdEYXRhID0gc2NhbGVJbWFnZURhdGEoaW1nRGF0YSwgTWF0aC5mbG9vcig0MDAgLyBPYmplY3Quc2l6ZShUSUxFX0xJU1QpKSwgbWFpbkN0eCk7XHJcblxyXG4gICAgICAgIG1NYXBDdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xyXG5cclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSg5MCAqIE1hdGguUEkgLyAxODApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3QuZHJhd0ltYWdlKG1NYXAsIDAsIDApO1xyXG4gICAgICAgIG1NYXBDdHhSb3Quc2NhbGUoMSwgLTEpO1xyXG4gICAgICAgIG1NYXBDdHhSb3Qucm90YXRlKDI3MCAqIE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBzZXJ2ZXJNYXAgPSBtTWFwUm90O1xyXG4gICAgICAgIG1hcFRpbWVyID0gMjU7XHJcbiAgICB9XHJcblxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgbWFwVGltZXIgLT0gMTtcclxuICAgIH1cclxuXHJcbiAgICBtYWluQ3R4LmRyYXdJbWFnZShzZXJ2ZXJNYXAsIDgwMCwgNDAwKTtcclxufTsgLy9kZXByZWNhdGVkXHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5zY2FsZUltYWdlRGF0YSA9IGZ1bmN0aW9uIChpbWFnZURhdGEsIHNjYWxlLCBtYWluQ3R4KSB7XHJcbiAgICB2YXIgc2NhbGVkID0gbWFpbkN0eC5jcmVhdGVJbWFnZURhdGEoaW1hZ2VEYXRhLndpZHRoICogc2NhbGUsIGltYWdlRGF0YS5oZWlnaHQgKiBzY2FsZSk7XHJcbiAgICB2YXIgc3ViTGluZSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHNjYWxlLCAxKS5kYXRhO1xyXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgaW1hZ2VEYXRhLmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBpbWFnZURhdGEud2lkdGg7IGNvbCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2VQaXhlbCA9IGltYWdlRGF0YS5kYXRhLnN1YmFycmF5KFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0LFxyXG4gICAgICAgICAgICAgICAgKHJvdyAqIGltYWdlRGF0YS53aWR0aCArIGNvbCkgKiA0ICsgNFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHNjYWxlOyB4KyspIHN1YkxpbmUuc2V0KHNvdXJjZVBpeGVsLCB4ICogNClcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCBzY2FsZTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdFJvdyA9IHJvdyAqIHNjYWxlICsgeTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXN0Q29sID0gY29sICogc2NhbGU7XHJcbiAgICAgICAgICAgICAgICBzY2FsZWQuZGF0YS5zZXQoc3ViTGluZSwgKGRlc3RSb3cgKiBzY2FsZWQud2lkdGggKyBkZXN0Q29sKSAqIDQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNjYWxlZDtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluaU1hcDsiLCJmdW5jdGlvbiBUaWxlKHRoaXNJbmZvLCBjbGllbnQpIHtcclxuICAgIHRoaXMuaWQgPSB0aGlzSW5mby5pZDtcclxuICAgIHRoaXMueCA9IHRoaXNJbmZvLng7XHJcbiAgICB0aGlzLnkgPSB0aGlzSW5mby55O1xyXG4gICAgdGhpcy5sZW5ndGggPSB0aGlzSW5mby5sZW5ndGg7XHJcbiAgICB0aGlzLmNvbG9yID0gdGhpc0luZm8uY29sb3I7XHJcbiAgICB0aGlzLnRvcENvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciArIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5ib3JkZXJDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgLSAxMCxcclxuICAgICAgICBnOiB0aGlzLmNvbG9yLmcgLSAxMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgLSAxMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYWxlcnQgPSB0aGlzSW5mby5hbGVydDtcclxuICAgIHRoaXMucmFuZG9tID0gTWF0aC5mbG9vcihnZXRSYW5kb20oMCwgMykpO1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5UaWxlLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodGhpc0luZm8pIHtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyArIDEwMCxcclxuICAgICAgICBiOiB0aGlzLmNvbG9yLmIgKyAxMDBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG59O1xyXG5cclxuVGlsZS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiKFwiICsgdGhpcy5ib3JkZXJDb2xvci5yICsgXCIsXCIgKyB0aGlzLmJvcmRlckNvbG9yLmcgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuYiArIFwiKVwiO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IDIwO1xyXG5cclxuXHJcbiAgICB2YXIgZ3JkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KHRoaXMueCArIHRoaXMubGVuZ3RoICogMy80LCB0aGlzLnksIHRoaXMueCArIHRoaXMubGVuZ3RoLzQsIHRoaXMueSArIHRoaXMubGVuZ3RoKTtcclxuICAgIGdyZC5hZGRDb2xvclN0b3AoMCwgXCJyZ2IoXCIgKyB0aGlzLnRvcENvbG9yLnIgKyBcIixcIiArIHRoaXMudG9wQ29sb3IuZyArIFwiLFwiICsgdGhpcy50b3BDb2xvci5iICsgXCIpXCIpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgxLCBcInJnYihcIiArIHRoaXMuY29sb3IuciArIFwiLFwiICsgdGhpcy5jb2xvci5nICsgXCIsXCIgKyB0aGlzLmNvbG9yLmIgKyBcIilcIik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JkO1xyXG5cclxuXHJcbiAgICBjdHgucmVjdCh0aGlzLnggKyAzMCwgdGhpcy55ICsgMzAsIHRoaXMubGVuZ3RoIC0gMzAsIHRoaXMubGVuZ3RoIC0gMzApO1xyXG5cclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG5cclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbGU7XHJcblxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tKG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBBbmltYXRpb246IHJlcXVpcmUoJy4vQW5pbWF0aW9uJyksXHJcbiAgICBBcnJvdzogcmVxdWlyZSgnLi9BcnJvdycpLFxyXG4gICAgQ29udHJvbGxlcjogcmVxdWlyZSgnLi9Db250cm9sbGVyJyksXHJcbiAgICBIb21lOiByZXF1aXJlKCcuL0hvbWUnKSxcclxuICAgIE1pbmlNYXA6IHJlcXVpcmUoJy4vTWluaU1hcCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJyksXHJcbiAgICBBc3Rlcm9pZDogcmVxdWlyZSgnLi9Bc3Rlcm9pZCcpXHJcbn07IiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50LmpzJyk7XHJcbnZhciBNYWluVUkgPSByZXF1aXJlKCcuL3VpL01haW5VSScpO1xyXG5cclxudmFyIGNsaWVudCA9IG5ldyBDbGllbnQoKTtcclxuXHJcblxyXG5kb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChjbGllbnQuQ0hBVF9PUEVOKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY2xpZW50LmtleXNbZXZlbnQua2V5Q29kZV0gPSB0cnVlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IHRydWV9KTtcclxufTtcclxuXHJcbmRvY3VtZW50Lm9ua2V5dXAgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSA4NCkge1xyXG4gICAgICAgIGNsaWVudC5tYWluVUkuZ2FtZVVJLmNoYXRVSS50ZXh0SW5wdXQuY2xpY2soKTtcclxuICAgIH1cclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gZmFsc2U7XHJcbiAgICBjbGllbnQuc29ja2V0LmVtaXQoJ2tleUV2ZW50Jywge2lkOiBldmVudC5rZXlDb2RlLCBzdGF0ZTogZmFsc2V9KTtcclxufTtcclxuXHJcblxyXG4kKHdpbmRvdykuYmluZCgnbW91c2V3aGVlbCBET01Nb3VzZVNjcm9sbCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmN0cmxLZXkgPT09IHRydWUpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNsaWVudC5DSEFUX1NDUk9MTCkge1xyXG4gICAgICAgIGNsaWVudC5DSEFUX1NDUk9MTCA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZihldmVudC5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGEgLzEyMCA+IDAgJiYgY2xpZW50Lm1haW5TY2FsZUZhY3RvciA8IDQpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yICs9IDAuMjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPiAwLjQpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMjtcclxuICAgIH1cclxufSk7XHJcblxyXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChlKSB7IC8vcHJldmVudCByaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxufSwgZmFsc2UpOyIsImRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nOyAgLy8gZmlyZWZveCwgY2hyb21lXHJcbmRvY3VtZW50LmJvZHkuc2Nyb2xsID0gXCJub1wiO1xyXG5cclxudmFyIFBsYXllck5hbWVyVUkgPSByZXF1aXJlKCcuL1BsYXllck5hbWVyVUknKTtcclxudmFyIEdhbWVVSSA9IHJlcXVpcmUoJy4vZ2FtZS9HYW1lVUknKTtcclxuXHJcbmZ1bmN0aW9uIE1haW5VSShjbGllbnQsIHNvY2tldCkge1xyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuXHJcbiAgICB0aGlzLmdhbWVVSSA9IG5ldyBHYW1lVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0LCB0aGlzKTtcclxuXHJcbiAgICB0aGlzLnBsYXllck5hbWVyVUkgPSBuZXcgUGxheWVyTmFtZXJVSSh0aGlzLmNsaWVudCwgdGhpcy5zb2NrZXQpO1xyXG59XHJcblxyXG5NYWluVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoaW5mbykge1xyXG4gICAgdmFyIGFjdGlvbiA9IGluZm8uYWN0aW9uO1xyXG4gICAgdmFyIGhvbWU7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImdhbWVNc2dQcm9tcHRcIikge1xyXG4gICAgICAgIHRoaXMuZ2FtZVVJLmdhbWVNc2dQcm9tcHQub3BlbihpbmZvLm1lc3NhZ2UpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbk1haW5VSS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoYWN0aW9uKSB7XHJcbiAgICBpZiAoYWN0aW9uID09PSBcImdhbWVNc2dQcm9tcHRcIikge1xyXG4gICAgICAgIHRoaXMuZ2FtZVVJLmdhbWVNc2dQcm9tcHQuY2xvc2UoKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLnVwZGF0ZUxlYWRlckJvYXJkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGxlYWRlcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFkZXJib2FyZFwiKTtcclxuICAgIHZhciBQTEFZRVJfQVJSQVkgPSB0aGlzLmNsaWVudC5QTEFZRXJfQVJSQVk7XHJcblxyXG5cclxuICAgIHZhciBwbGF5ZXJTb3J0ID0gZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICB2YXIgZmFjdGlvbkEgPSB0aGlzLmNsaWVudC5DT05UUk9MTEVSX0xJU1RbYV07XHJcbiAgICAgICAgdmFyIGZhY3Rpb25CID0gdGhpcy5jbGllbnQuQ09OVFJPTExFUl9MSVNUW2JdO1xyXG4gICAgICAgIHJldHVybiBmYWN0aW9uQS5zY29yZSAtIGZhY3Rpb25CLnNjb3JlO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIFBMQVlFUl9BUlJBWS5zb3J0KHBsYXllclNvcnQpO1xyXG4gICAgbGVhZGVyYm9hcmQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gUExBWUVSX0FSUkFZLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LkNPTlRST0xMRVJfTElTVFtQTEFZRVJfQVJSQVlbaV1dO1xyXG5cclxuICAgICAgICB2YXIgZW50cnkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBsYXllci5uYW1lICsgXCIgLSBcIiArIHBsYXllci5zY29yZSkpO1xyXG4gICAgICAgIGxlYWRlcmJvYXJkLmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYWluVUk7IiwiZnVuY3Rpb24gUGxheWVyTmFtZXJVSSAoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5sZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5uYW1lQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU3VibWl0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllcl9uYW1lclwiKTtcclxufVxyXG5cclxuUGxheWVyTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyTmFtZXJVSTsiLCJmdW5jdGlvbiBDaGF0VUkocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYXRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9pbnB1dCcpO1xyXG4gICAgdGhpcy5jaGF0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2xpc3QnKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjgwJVwiO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJhdXRvXCI7XHJcblxyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMzQsIDQ4LCA3MSwgMSlcIjtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLnNlbmRNZXNzYWdlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX0NMSUNLID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGV4dElucHV0LmJsdXIoKTtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSBmYWxzZTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCIzMCVcIjtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjAyKVwiO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjEpXCI7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5hZGRNZXNzYWdlID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhY2tldC5uYW1lICsgXCIgOiBcIiArIHBhY2tldC5jaGF0TWVzc2FnZSkpO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcblxyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc29ja2V0ID0gdGhpcy5wYXJlbnQuc29ja2V0O1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy50ZXh0SW5wdXQudmFsdWUgJiYgdGhpcy50ZXh0SW5wdXQudmFsdWUgIT09IFwiXCIpIHtcclxuICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdE1lc3NhZ2UnLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnBhcmVudC5jbGllbnQuU0VMRklELFxyXG4gICAgICAgICAgICBtZXNzYWdlOiB0aGlzLnRleHRJbnB1dC52YWx1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIH1cclxuICAgIHRoaXMuY2xvc2UoKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhdFVJO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIEdhbWVNc2dQcm9tcHQocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInByb21wdF9jb250YWluZXJcIik7XHJcbiAgICB0aGlzLm1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZV9tc2dfcHJvbXB0Jyk7XHJcbn1cclxuXHJcbkdhbWVNc2dQcm9tcHQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy50ZW1wbGF0ZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG4gICAgdGhpcy5tZXNzYWdlLmlubmVySFRNTCA9IG1lc3NhZ2U7XHJcbn07XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lTXNnUHJvbXB0O1xyXG5cclxuXHJcbiIsInZhciBHYW1lTXNnUHJvbXB0ID0gcmVxdWlyZSgnLi9HYW1lTXNnUHJvbXB0Jyk7XHJcbnZhciBDaGF0VUkgPSByZXF1aXJlKCcuL0NoYXRVSScpO1xyXG5cclxuZnVuY3Rpb24gR2FtZVVJKGNsaWVudCwgc29ja2V0LCBwYXJlbnQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuZ2FtZU1zZ1Byb21wdCA9IG5ldyBHYW1lTXNnUHJvbXB0KHRoaXMpO1xyXG4gICAgdGhpcy5jaGF0VUkgPSBuZXcgQ2hhdFVJKHRoaXMpO1xyXG59XHJcblxyXG5HYW1lVUkucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk9QRU5JTkcgR0FNRSBVSVwiKTtcclxuICAgIHRoaXMuY2hhdFVJLm9wZW4oKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gIEdhbWVVSTsiXX0=

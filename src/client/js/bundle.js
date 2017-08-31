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
    this.socket.on('ping', this.sendPong.bind(this));


};

Client.prototype.sendPong = function (message) {
    this.socket.emit("pong123", message);
};


Client.prototype.initCanvases = function () {
    this.mainCanvas = document.getElementById("main_canvas");
    this.mainCanvas.style.border = '1px solid #000000';
    this.mainCanvas.style.visibility = "hidden";
    this.mainCtx = this.mainCanvas.getContext("2d");


    document.addEventListener("mousedown", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;


        if (Math.abs(x) + Math.abs(y) < 200) {
            this.playerClicked = true;
            this.circleConstruct = [];
            this.circleStageCount = 0;
        }
        else {
            this.clickTemp = true;
            this.clickTimer = 0;
        }
    }.bind(this));
    document.addEventListener("mouseup", function (event) {
        if (!this.SELF_ID) {
            return;
        }
        var x = ((event.x / this.mainCanvas.offsetWidth * 1000) - this.mainCanvas.width / 2) / this.scaleFactor;
        var y = ((event.y / this.mainCanvas.offsetHeight * 500) - this.mainCanvas.height / 2) / this.scaleFactor;

        this.socket.emit("shootSelf", {
            id: this.SELF_ID,
            x: x,
            y: y
        });

        this.clickTemp = false;
        this.clickTimer = 0;

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

        if (this.clickTemp) { //see if shooting or mining
            this.clickTimer += 1;
            if (this.clickTimer > 3) {
                this.clickTimer = 0;
                this.clickTemp = false;
                this.mining = true;
            }
        }

        if (!this.pre) {
            this.pre = {x: x, y: y}
        }
        else if (square(this.pre.x - x) + square(this.pre.y - y) > 80) {
            this.pre = {x: x, y: y};

            if (Math.abs(x) < 50 && Math.abs(y) < 50) {
                x = 0;
                y = 0;
            }
            this.socket.emit('move', {
                id: this.SELF_ID,
                x: x,
                y: y
            });
        }
    }.bind(this));
};


Client.prototype.sendCircle = function (construct) {

    var radiiNormal = function (vector) {
        if (!vector) {
            return 0;
        }
        return (vector.x * vector.x + vector.y * vector.y);
    };

    var maxRadius = Math.sqrt(Math.max(
        radiiNormal(construct[0]),
        radiiNormal(construct[1]),
        radiiNormal(construct[2]),
        radiiNormal(construct[3])));

    if (maxRadius) {
        this.socket.emit("createCircle", {
            id: this.SELF_ID,
            radius: maxRadius
        });
    }
};

Client.prototype.initLists = function () {
    this.PLAYER_LIST = {};
    this.TILE_LIST = {};
    this.ROCK_LIST = {};
    this.ASTEROID_LIST = {};
    this.ANIMATION_LIST = {};

    this.PLAYER_ARRAY = [];
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



Client.prototype.handleLOL = function (data) {
    var reader = new BinaryReader(data);

    if (reader.length() > 20) {
        //console.log(reader.readInt8());

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
        case "playerInfo":
            addEntity(packet, this.PLAYER_LIST, Entity.Player, this.PLAYER_ARRAY);
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
        case "playerInfo":
            updateEntity(packet, this.PLAYER_LIST);
            break;
        case "tileInfo":
            updateEntity(packet, this.TILE_LIST);
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
        case "playerInfo":
            deleteEntity(packet, this.PLAYER_LIST, this.PLAYER_ARRAY);
            break;
        case "asteroidInfo":
            deleteEntity(packet, this.ASTEROID_LIST);
            break;
        case "rockInfo":
            deleteEntity(packet, this.ROCK_LIST);
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
    this.mainUI.updateLeaderBoard();

    var id;
    var entityList = [
        this.TILE_LIST,
        this.PLAYER_LIST,
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
    this.mainCtx.fillRect(0, 0, 20000, 20000);


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


Client.prototype.start = function () {
    setInterval(this.drawScene.bind(this), 1000 / 25);
};

function lerp(a, b, ratio) {
    return a + ratio * (b - a);
}


function square(a) {
    return a * a;
}

function vectorNormal(a) {
    return a.x * a.x + a.y * a.y;
}

module.exports = Client;
},{"./BinaryReader":1,"./entity":8,"./ui/MainUI":10}],3:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
function Player(playerInfo, client) {
    this.id = playerInfo.id;
    this.name = playerInfo.name;
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
    this.maxHealth = playerInfo.maxHealth;
    this.theta = playerInfo.theta;
    this.level = playerInfo.level; //need to implement again
    this.radius = playerInfo.radius;
    this.client = client;

    if (!this.SELF_PLAYER && this.id === this.client.SELF_ID) {
        this.client.active = this.active; //probably should change this
        this.client.SELF_PLAYER = this;
    }
}

Player.prototype.update = function (playerInfo) {
    this.x = playerInfo.x;
    this.y = playerInfo.y;
    this.health = playerInfo.health;
    this.maxHealth = playerInfo.maxHealth;
    this.theta = playerInfo.theta;
    this.level = playerInfo.level;
    this.shooting = playerInfo.shooting;
    this.radius = playerInfo.radius;
    this.vulnerable = playerInfo.vulnerable;
};

Player.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var selfId = this.client.SELF_ID;
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
    if (this.vulnerable) {
        ctx.fillStyle = "red";
    }
    else {
        ctx.fillStyle = "rgba(123,0,0," + fillAlpha + ")";
    }
    ctx.lineWidth = 10;


    var radius = this.radius;

    ctx.beginPath();
    ctx.moveTo(this.x + radius, this.y);

    var theta, x, y;
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


    if (this.health && this.maxHealth && this.health > 0) { //health bar
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


    ctx.closePath();
};


function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = Player;
},{}],6:[function(require,module,exports){
function Rock(rockInfo, client) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.vertices = rockInfo.vertices;
    this.theta = rockInfo.theta;
    this.texture = rockInfo.texture;
    this.neutral = rockInfo.neutral;
    this.client = client;
}

Rock.prototype.update = function (rockInfo) {
    this.x = rockInfo.x;
    this.y = rockInfo.y;
    this.queuePosition = rockInfo.queuePosition; //delete
    this.theta = rockInfo.theta;
    this.owner = rockInfo.owner;
    this.neutral = rockInfo.neutral;
    this.health = rockInfo.health;
    this.maxHealth = rockInfo.maxHealth;
    this.fast = rockInfo.fast;
};


Rock.prototype.show = function () {
    var ctx = this.client.mainCtx;
    var SCALE = 100;


    ctx.fillStyle = "pink"; //default color
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


    ctx.strokeStyle = !this.owner ? "blue" : "green";
    ctx.strokeStyle = this.fast ? "red" : ctx.strokeStyle;
    ctx.strokeStyle = this.neutral ? "pink" : ctx.strokeStyle;


    if (!this.vertices) {
        //console.log(this.x, this.y);
    }

    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.rotate(this.theta);

    if (this.vertices) {
        var v = this.vertices;
        ctx.moveTo(v[0][0] * SCALE, v[0][1] * SCALE);

        for (var i = 1; i < v.length; i++) {
            ctx.lineTo(v[i][0] * SCALE, v[i][1] * SCALE);
        }
        ctx.lineTo(v[0][0] * SCALE, v[0][1] * SCALE);
    }
    else {
        ctx.fillRect(0, 0, 30, 30);
    }

    ctx.rotate(2 * Math.PI - this.theta);
    ctx.fill();
    ctx.stroke();

    ctx.closePath();
    ctx.translate(-this.x, -this.y);


    if (this.health && this.maxHealth && this.health > 0) { //health bar
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
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
module.exports = {
    Animation: require('./Animation'),
    Player: require('./Player'),
    MiniMap: require('./MiniMap'),
    Tile: require('./Tile'),
    Rock: require('./Rock')
};
},{"./Animation":3,"./MiniMap":4,"./Player":5,"./Rock":6,"./Tile":7}],9:[function(require,module,exports){
var Client = require('./Client.js');
var MainUI = require('./ui/MainUI');

var client = new Client();
client.start();



document.onkeydown = function (event) {
    client.keys[event.keyCode] = true;

    if (event.keyCode === 32) {
        console.log("SPACE");
        client.socket.emit("shootSelf", {
            id: client.SELF_ID
        });
    }
}.bind(this);

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
        client.mainScaleFactor += 0.05;
    }
    else if (client.mainScaleFactor > 0.25) {
        client.mainScaleFactor -= 0.05;
    }
});

document.addEventListener('contextmenu', function (e) { //prevent right-click context menu
    e.preventDefault();
}, false);
},{"./Client.js":2,"./ui/MainUI":10}],10:[function(require,module,exports){
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
    var PLAYER_ARRAY = this.client.PLAYER_ARRAY;


    var playerSort = function (a, b) {
        var playerA = this.client.PLAYER_LIST[a];
        var playerB = this.client.PLAYER_LIST[b];
        return playerA.radius - playerB.radius;
    }.bind(this);

    PLAYER_ARRAY.sort(playerSort);


    leaderboard.innerHTML = "";
    for (var i = PLAYER_ARRAY.length - 1; i >= 0; i--) {
        var player = this.client.PLAYER_LIST[PLAYER_ARRAY[i]];
        var entry = document.createElement('li');
        entry.appendChild(document.createTextNode(player.name + " - " + player.radius));
        leaderboard.appendChild(entry);
    }
};



module.exports = MainUI;
},{"./PlayerNamerUI":11,"./game/GameUI":14}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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



},{}],13:[function(require,module,exports){
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



},{}],14:[function(require,module,exports){
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
},{"./ChatUI":12,"./GameMsgPrompt":13}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpZW50L2pzL0JpbmFyeVJlYWRlci5qcyIsInNyYy9jbGllbnQvanMvQ2xpZW50LmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvQW5pbWF0aW9uLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvTWluaU1hcC5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1BsYXllci5qcyIsInNyYy9jbGllbnQvanMvZW50aXR5L1JvY2suanMiLCJzcmMvY2xpZW50L2pzL2VudGl0eS9UaWxlLmpzIiwic3JjL2NsaWVudC9qcy9lbnRpdHkvaW5kZXguanMiLCJzcmMvY2xpZW50L2pzL2luZGV4LmpzIiwic3JjL2NsaWVudC9qcy91aS9NYWluVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL1BsYXllck5hbWVyVUkuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvQ2hhdFVJLmpzIiwic3JjL2NsaWVudC9qcy91aS9nYW1lL0dhbWVNc2dQcm9tcHQuanMiLCJzcmMvY2xpZW50L2pzL3VpL2dhbWUvR2FtZVVJLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEJpbmFyeVJlYWRlcihkYXRhKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgPSAwO1xyXG4gICAgdGhpcy5fYnVmZmVyID0gbmV3IERhdGFWaWV3KGRhdGEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpbmFyeVJlYWRlcjtcclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy5fYnVmZmVyLmdldEludDgodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAxO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5yZWFkSW50MTYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSB0aGlzLl9idWZmZXIuZ2V0SW50MTYodGhpcy5fb2Zmc2V0KTtcclxuICAgIHRoaXMuX29mZnNldCArPSAyO1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuXHJcblxyXG5CaW5hcnlSZWFkZXIucHJvdG90eXBlLnJlYWRJbnQzMiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2J1ZmZlci5nZXRJbnQzMih0aGlzLl9vZmZzZXQpO1xyXG4gICAgdGhpcy5fb2Zmc2V0ICs9IDQ7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcblxyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5za2lwQnl0ZXMgPSBmdW5jdGlvbiAobGVuZ3RoKSB7XHJcbiAgICB0aGlzLl9vZmZzZXQgKz0gbGVuZ3RoO1xyXG59O1xyXG5cclxuQmluYXJ5UmVhZGVyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fYnVmZmVyLmJ5dGVMZW5ndGg7XHJcbn07XHJcblxyXG4iLCJ2YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9lbnRpdHknKTtcclxudmFyIE1haW5VSSA9IHJlcXVpcmUoJy4vdWkvTWFpblVJJyk7XHJcbnZhciBCaW5hcnlSZWFkZXIgPSByZXF1aXJlKCcuL0JpbmFyeVJlYWRlcicpO1xyXG5cclxuZnVuY3Rpb24gQ2xpZW50KCkge1xyXG4gICAgdGhpcy5TRUxGX0lEID0gbnVsbDtcclxuICAgIHRoaXMuU0VMRl9QTEFZRVIgPSBudWxsO1xyXG4gICAgdGhpcy5UUkFJTCA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5TTEFTSCA9IFtdO1xyXG4gICAgdGhpcy5TTEFTSF9BUlJBWSA9IFtdO1xyXG4gICAgdGhpcy5tb3VzZU1vdmVUaW1lciA9IDA7XHJcbiAgICB0aGlzLmluaXQoKTtcclxufVxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5pbml0U29ja2V0KCk7XHJcbiAgICB0aGlzLmluaXRDYW52YXNlcygpO1xyXG4gICAgdGhpcy5pbml0TGlzdHMoKTtcclxuICAgIHRoaXMuaW5pdFZpZXdlcnMoKTtcclxufTtcclxuQ2xpZW50LnByb3RvdHlwZS5pbml0U29ja2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5zb2NrZXQgPSBpbygpO1xyXG4gICAgdGhpcy5zb2NrZXQudmVyaWZpZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnNvY2tldC5vbignaW5pdFZlcmlmaWNhdGlvbicsIHRoaXMudmVyaWZ5LmJpbmQodGhpcykpO1xyXG4gICAgdGhpcy5zb2NrZXQub24oJ3VwZGF0ZUVudGl0aWVzJywgdGhpcy5oYW5kbGVQYWNrZXQuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbignY2hhdE1lc3NhZ2UnLCB0aGlzLm1haW5VSSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigndXBkYXRlTE9MJywgdGhpcy5oYW5kbGVMT0wuYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnNvY2tldC5vbigncGluZycsIHRoaXMuc2VuZFBvbmcuYmluZCh0aGlzKSk7XHJcblxyXG5cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc2VuZFBvbmcgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgdGhpcy5zb2NrZXQuZW1pdChcInBvbmcxMjNcIiwgbWVzc2FnZSk7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5pbml0Q2FudmFzZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLm1haW5DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5fY2FudmFzXCIpO1xyXG4gICAgdGhpcy5tYWluQ2FudmFzLnN0eWxlLmJvcmRlciA9ICcxcHggc29saWQgIzAwMDAwMCc7XHJcbiAgICB0aGlzLm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB0aGlzLm1haW5DdHggPSB0aGlzLm1haW5DYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcblxyXG4gICAgICAgIGlmIChNYXRoLmFicyh4KSArIE1hdGguYWJzKHkpIDwgMjAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGxheWVyQ2xpY2tlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2lyY2xlQ29uc3RydWN0ID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuY2lyY2xlU3RhZ2VDb3VudCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrVGVtcCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpY2tUaW1lciA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHggPSAoKGV2ZW50LnggLyB0aGlzLm1haW5DYW52YXMub2Zmc2V0V2lkdGggKiAxMDAwKSAtIHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuICAgICAgICB2YXIgeSA9ICgoZXZlbnQueSAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRIZWlnaHQgKiA1MDApIC0gdGhpcy5tYWluQ2FudmFzLmhlaWdodCAvIDIpIC8gdGhpcy5zY2FsZUZhY3RvcjtcclxuXHJcbiAgICAgICAgdGhpcy5zb2NrZXQuZW1pdChcInNob290U2VsZlwiLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLlNFTEZfSUQsXHJcbiAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgIHk6IHlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5jbGlja1RlbXAgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNsaWNrVGltZXIgPSAwO1xyXG5cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG5cclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIGlmICghdGhpcy5TRUxGX1BMQVlFUikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgeCA9ICgoZXZlbnQueCAvIHRoaXMubWFpbkNhbnZhcy5vZmZzZXRXaWR0aCAqIDEwMDApIC1cclxuICAgICAgICAgICAgdGhpcy5tYWluQ2FudmFzLndpZHRoIC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG4gICAgICAgIHZhciB5ID0gKChldmVudC55IC8gdGhpcy5tYWluQ2FudmFzLm9mZnNldEhlaWdodCAqIDUwMCkgLVxyXG4gICAgICAgICAgICB0aGlzLm1haW5DYW52YXMuaGVpZ2h0IC8gMikgLyB0aGlzLnNjYWxlRmFjdG9yO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlKHgpICsgc3F1YXJlKHkpID4gc3F1YXJlKHRoaXMuU0VMRl9QTEFZRVIucmFuZ2UpKSB7IC8vaWYgbm90IGluIHJhbmdlXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNsaWNrVGVtcCkgeyAvL3NlZSBpZiBzaG9vdGluZyBvciBtaW5pbmdcclxuICAgICAgICAgICAgdGhpcy5jbGlja1RpbWVyICs9IDE7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNsaWNrVGltZXIgPiAzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWNrVGltZXIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGlja1RlbXAgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubWluaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnByZSkge1xyXG4gICAgICAgICAgICB0aGlzLnByZSA9IHt4OiB4LCB5OiB5fVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChzcXVhcmUodGhpcy5wcmUueCAtIHgpICsgc3F1YXJlKHRoaXMucHJlLnkgLSB5KSA+IDgwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlID0ge3g6IHgsIHk6IHl9O1xyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHgpIDwgNTAgJiYgTWF0aC5hYnMoeSkgPCA1MCkge1xyXG4gICAgICAgICAgICAgICAgeCA9IDA7XHJcbiAgICAgICAgICAgICAgICB5ID0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5lbWl0KCdtb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgICAgIHg6IHgsXHJcbiAgICAgICAgICAgICAgICB5OiB5XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5zZW5kQ2lyY2xlID0gZnVuY3Rpb24gKGNvbnN0cnVjdCkge1xyXG5cclxuICAgIHZhciByYWRpaU5vcm1hbCA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICBpZiAoIXZlY3Rvcikge1xyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICh2ZWN0b3IueCAqIHZlY3Rvci54ICsgdmVjdG9yLnkgKiB2ZWN0b3IueSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBtYXhSYWRpdXMgPSBNYXRoLnNxcnQoTWF0aC5tYXgoXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzBdKSxcclxuICAgICAgICByYWRpaU5vcm1hbChjb25zdHJ1Y3RbMV0pLFxyXG4gICAgICAgIHJhZGlpTm9ybWFsKGNvbnN0cnVjdFsyXSksXHJcbiAgICAgICAgcmFkaWlOb3JtYWwoY29uc3RydWN0WzNdKSkpO1xyXG5cclxuICAgIGlmIChtYXhSYWRpdXMpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5lbWl0KFwiY3JlYXRlQ2lyY2xlXCIsIHtcclxuICAgICAgICAgICAgaWQ6IHRoaXMuU0VMRl9JRCxcclxuICAgICAgICAgICAgcmFkaXVzOiBtYXhSYWRpdXNcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaW5pdExpc3RzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5QTEFZRVJfTElTVCA9IHt9O1xyXG4gICAgdGhpcy5USUxFX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuUk9DS19MSVNUID0ge307XHJcbiAgICB0aGlzLkFTVEVST0lEX0xJU1QgPSB7fTtcclxuICAgIHRoaXMuQU5JTUFUSU9OX0xJU1QgPSB7fTtcclxuXHJcbiAgICB0aGlzLlBMQVlFUl9BUlJBWSA9IFtdO1xyXG59O1xyXG5DbGllbnQucHJvdG90eXBlLmluaXRWaWV3ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5rZXlzID0gW107XHJcbiAgICB0aGlzLnNjYWxlRmFjdG9yID0gMTtcclxuICAgIHRoaXMubWFpblNjYWxlRmFjdG9yID0gMC41O1xyXG4gICAgdGhpcy5tYWluVUkgPSBuZXcgTWFpblVJKHRoaXMsIHRoaXMuc29ja2V0KTtcclxuICAgIHRoaXMubWFpblVJLnBsYXllck5hbWVyVUkub3BlbigpO1xyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS52ZXJpZnkgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaWYgKCF0aGlzLnNvY2tldC52ZXJpZmllZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVkVSSUZJRUQgQ0xJRU5UXCIpO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJ2ZXJpZnlcIiwge30pO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LnZlcmlmaWVkID0gdHJ1ZTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5oYW5kbGVMT0wgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdmFyIHJlYWRlciA9IG5ldyBCaW5hcnlSZWFkZXIoZGF0YSk7XHJcblxyXG4gICAgaWYgKHJlYWRlci5sZW5ndGgoKSA+IDIwKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDgoKSk7XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQzMigpKTsgLy9hc3Rlcm9pZCBpZFxyXG4gICAgICAgIC8vY29uc29sZS5sb2cocmVhZGVyLnJlYWRJbnQzMigpKTsgLy9vd25lciBpZFxyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKHJlYWRlci5yZWFkSW50MzIoKSk7IC8vcmVhbCB4XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhyZWFkZXIucmVhZEludDMyKCkpOyAvL3JlYWwgeVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuaGFuZGxlUGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIHZhciBwYWNrZXQsIGk7XHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHBhY2tldCA9IGRhdGFbaV07XHJcbiAgICAgICAgc3dpdGNoIChwYWNrZXQubWFzdGVyKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCJhZGRcIjpcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkRW50aXRpZXMocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbGV0ZUVudGl0aWVzKHBhY2tldCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcInVwZGF0ZVwiOlxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFbnRpdGllcyhwYWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuYWRkRW50aXRpZXMgPSBmdW5jdGlvbiAocGFja2V0KSB7XHJcbiAgICB2YXIgYWRkRW50aXR5ID0gZnVuY3Rpb24gKHBhY2tldCwgbGlzdCwgZW50aXR5LCBhcnJheSkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGlzdFtwYWNrZXQuaWRdID0gbmV3IGVudGl0eShwYWNrZXQsIHRoaXMpO1xyXG4gICAgICAgIGlmIChhcnJheSAmJiBhcnJheS5pbmRleE9mKHBhY2tldC5pZCkgPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2gocGFja2V0LmlkKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgc3dpdGNoIChwYWNrZXQuY2xhc3MpIHtcclxuICAgICAgICBjYXNlIFwicm9ja0luZm9cIjpcclxuICAgICAgICAgICAgYWRkRW50aXR5KHBhY2tldCwgdGhpcy5ST0NLX0xJU1QsIEVudGl0eS5Sb2NrKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInRpbGVJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuVElMRV9MSVNULCBFbnRpdHkuVGlsZSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGFkZEVudGl0eShwYWNrZXQsIHRoaXMuUExBWUVSX0xJU1QsIEVudGl0eS5QbGF5ZXIsIHRoaXMuUExBWUVSX0FSUkFZKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFuaW1hdGlvbkluZm9cIjpcclxuICAgICAgICAgICAgaWYgKHBhY2tldC5pZCA9PT0gdGhpcy5TRUxGX0lEKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNULCBFbnRpdHkuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkub3BlbihwYWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzZWxmSWRcIjpcclxuICAgICAgICAgICAgaWYgKCF0aGlzLlNFTEZfSUQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuU0VMRl9JRCA9IHBhY2tldC5zZWxmSWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkub3BlbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJjaGF0SW5mb1wiOlxyXG4gICAgICAgICAgICB0aGlzLm1haW5VSS5nYW1lVUkuY2hhdFVJLmFkZE1lc3NhZ2UocGFja2V0KTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLnVwZGF0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgZnVuY3Rpb24gdXBkYXRlRW50aXR5KHBhY2tldCwgbGlzdCkge1xyXG4gICAgICAgIGlmICghcGFja2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbcGFja2V0LmlkXTtcclxuICAgICAgICBpZiAoIWVudGl0eSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVudGl0eS51cGRhdGUocGFja2V0KTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIHVwZGF0ZUVudGl0eShwYWNrZXQsIHRoaXMuUExBWUVSX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidGlsZUluZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5USUxFX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwicm9ja0luZm9cIjpcclxuICAgICAgICAgICAgdXBkYXRlRW50aXR5KHBhY2tldCwgdGhpcy5ST0NLX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiVUlJbmZvXCI6XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNFTEZfSUQgPT09IHBhY2tldC5wbGF5ZXJJZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluVUkudXBkYXRlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DbGllbnQucHJvdG90eXBlLmRlbGV0ZUVudGl0aWVzID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGRlbGV0ZUVudGl0eSA9IGZ1bmN0aW9uIChwYWNrZXQsIGxpc3QsIGFycmF5KSB7XHJcbiAgICAgICAgaWYgKCFwYWNrZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgdmFyIGluZGV4ID0gYXJyYXkuaW5kZXhPZihwYWNrZXQuaWQpO1xyXG4gICAgICAgICAgICBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgbGlzdFtwYWNrZXQuaWRdO1xyXG4gICAgfTtcclxuXHJcbiAgICBzd2l0Y2ggKHBhY2tldC5jbGFzcykge1xyXG4gICAgICAgIGNhc2UgXCJ0aWxlSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLlRJTEVfTElTVCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJwbGF5ZXJJbmZvXCI6XHJcbiAgICAgICAgICAgIGRlbGV0ZUVudGl0eShwYWNrZXQsIHRoaXMuUExBWUVSX0xJU1QsIHRoaXMuUExBWUVSX0FSUkFZKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImFzdGVyb2lkSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFTVEVST0lEX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwicm9ja0luZm9cIjpcclxuICAgICAgICAgICAgZGVsZXRlRW50aXR5KHBhY2tldCwgdGhpcy5ST0NLX0xJU1QpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiYW5pbWF0aW9uSW5mb1wiOlxyXG4gICAgICAgICAgICBkZWxldGVFbnRpdHkocGFja2V0LCB0aGlzLkFOSU1BVElPTl9MSVNUKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIlVJSW5mb1wiOlxyXG4gICAgICAgICAgICBpZiAodGhpcy5TRUxGX0lEID09PSBwYWNrZXQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFpblVJLmNsb3NlKHBhY2tldC5hY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2xpZW50LnByb3RvdHlwZS5kcmF3U2NlbmUgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgdGhpcy5tYWluVUkudXBkYXRlTGVhZGVyQm9hcmQoKTtcclxuXHJcbiAgICB2YXIgaWQ7XHJcbiAgICB2YXIgZW50aXR5TGlzdCA9IFtcclxuICAgICAgICB0aGlzLlRJTEVfTElTVCxcclxuICAgICAgICB0aGlzLlBMQVlFUl9MSVNULFxyXG4gICAgICAgIHRoaXMuQVNURVJPSURfTElTVCxcclxuICAgICAgICB0aGlzLkFOSU1BVElPTl9MSVNULFxyXG4gICAgICAgIHRoaXMuUk9DS19MSVNUXHJcbiAgICBdO1xyXG5cclxuICAgIHZhciBpbkJvdW5kcyA9IGZ1bmN0aW9uIChwbGF5ZXIsIHgsIHkpIHtcclxuICAgICAgICB2YXIgcmFuZ2UgPSB0aGlzLm1haW5DYW52YXMud2lkdGggLyAoMC43ICogdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIHggPCAocGxheWVyLnggKyByYW5nZSkgJiYgeCA+IChwbGF5ZXIueCAtIHJhbmdlKVxyXG4gICAgICAgICAgICAmJiB5IDwgKHBsYXllci55ICsgcmFuZ2UpICYmIHkgPiAocGxheWVyLnkgLSByYW5nZSk7XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB2YXIgdHJhbnNsYXRlU2NlbmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcclxuICAgICAgICB0aGlzLnNjYWxlRmFjdG9yID0gbGVycCh0aGlzLnNjYWxlRmFjdG9yLCB0aGlzLm1haW5TY2FsZUZhY3RvciwgMC4zKTtcclxuICAgICAgICB0aGlzLm1haW5DdHgudHJhbnNsYXRlKHRoaXMubWFpbkNhbnZhcy53aWR0aCAvIDIsIHRoaXMubWFpbkNhbnZhcy5oZWlnaHQgLyAyKTtcclxuICAgICAgICB0aGlzLm1haW5DdHguc2NhbGUodGhpcy5zY2FsZUZhY3RvciwgdGhpcy5zY2FsZUZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5tYWluQ3R4LnRyYW5zbGF0ZSgtdGhpcy5TRUxGX1BMQVlFUi54LCAtdGhpcy5TRUxGX1BMQVlFUi55KTtcclxuICAgIH0uYmluZCh0aGlzKTtcclxuXHJcblxyXG4gICAgaWYgKCF0aGlzLlNFTEZfUExBWUVSKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRyYW5zbGF0ZVNjZW5lKCk7XHJcbiAgICB0aGlzLm1haW5DdHguY2xlYXJSZWN0KDAsIDAsIDExMDAwLCAxMTAwMCk7XHJcblxyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxTdHlsZSA9IFwiIzFkMWYyMVwiO1xyXG4gICAgdGhpcy5tYWluQ3R4LmZpbGxSZWN0KDAsIDAsIDIwMDAwLCAyMDAwMCk7XHJcblxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50aXR5TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBsaXN0ID0gZW50aXR5TGlzdFtpXTtcclxuICAgICAgICBmb3IgKGlkIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgdmFyIGVudGl0eSA9IGxpc3RbaWRdO1xyXG4gICAgICAgICAgICBpZiAoaW5Cb3VuZHModGhpcy5TRUxGX1BMQVlFUiwgZW50aXR5LngsIGVudGl0eS55KSkge1xyXG4gICAgICAgICAgICAgICAgZW50aXR5LnNob3coKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLlRSQUlMICYmICF0aGlzLmFjdGl2ZSkge1xyXG4gICAgICAgIHRoaXMuVFJBSUwuc2hvdygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbkNsaWVudC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBzZXRJbnRlcnZhbCh0aGlzLmRyYXdTY2VuZS5iaW5kKHRoaXMpLCAxMDAwIC8gMjUpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzcXVhcmUoYSkge1xyXG4gICAgcmV0dXJuIGEgKiBhO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2ZWN0b3JOb3JtYWwoYSkge1xyXG4gICAgcmV0dXJuIGEueCAqIGEueCArIGEueSAqIGEueTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDbGllbnQ7IiwiZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW1hdGlvbkluZm8sIGNsaWVudCkge1xyXG5cclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy50eXBlID0gYW5pbWF0aW9uSW5mby50eXBlO1xyXG4gICAgdGhpcy5pZCA9IGFuaW1hdGlvbkluZm8uaWQ7XHJcbiAgICB0aGlzLnggPSBhbmltYXRpb25JbmZvLng7XHJcbiAgICB0aGlzLnkgPSBhbmltYXRpb25JbmZvLnk7XHJcbiAgICAvL3RoaXMudGhldGEgPSAxNTtcclxuICAgIHRoaXMudGltZXIgPSBnZXRSYW5kb20oMTAsIDE0KTtcclxuXHJcbiAgICBpZiAodGhpcy50eXBlID09PSBcInNsYXNoXCIpIHtcclxuICAgICAgICB0aGlzLnNsYXNoSWQgPSBhbmltYXRpb25JbmZvLnNsYXNoSWQ7XHJcbiAgICAgICAgdmFyIHNsYXNoID0gdGhpcy5jbGllbnQuZmluZFNsYXNoKHRoaXMuc2xhc2hJZCk7XHJcbiAgICAgICAgdGhpcy5wcmUgPSBzbGFzaFswXTtcclxuICAgICAgICB0aGlzLnBvc3QgPSBzbGFzaFsxXTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbkFuaW1hdGlvbi5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBjdHggPSB0aGlzLmNsaWVudC5tYWluQ3R4O1xyXG4gICAgdmFyIHBsYXllciA9IHRoaXMuY2xpZW50LlNFTEZfUExBWUVSO1xyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2xhc2hcIiAmJiBwbGF5ZXIpIHtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNDIsIDMxLCA2NiwgMC42KVwiO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxNTtcclxuXHJcbiAgICAgICAgY3R4Lm1vdmVUbyhwbGF5ZXIueCArIHRoaXMucHJlLngsIHBsYXllci55ICsgdGhpcy5wcmUueSk7XHJcbiAgICAgICAgY3R4LmxpbmVUbyhwbGF5ZXIueCArIHRoaXMucG9zdC54LCBwbGF5ZXIueSArIHRoaXMucG9zdC55KTtcclxuXHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIGlmICh0aGlzLnR5cGUgPT09IFwic2hhcmREZWF0aFwiKSB7IC8vZGVwcmVjYXRlZCBidXQgY291bGQgcHVsbCBzb21lIGdvb2QgY29kZSBmcm9tIGhlcmVcclxuICAgICAgICBjdHguZm9udCA9IDYwIC0gdGhpcy50aW1lciArIFwicHggQXJpYWxcIjtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgIGN0eC5yb3RhdGUoLU1hdGguUEkgLyA1MCAqIHRoaXMudGhldGEpO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAxNjgsIDg2LCBcIiArIHRoaXMudGltZXIgKiAxMCAvIDEwMCArIFwiKVwiO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLm5hbWUsIDAsIDE1KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG5cclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgdGhpcy50aGV0YSA9IGxlcnAodGhpcy50aGV0YSwgMCwgMC4wOCk7XHJcbiAgICAgICAgdGhpcy54ID0gbGVycCh0aGlzLngsIHRoaXMuZW5kWCwgMC4xKTtcclxuICAgICAgICB0aGlzLnkgPSBsZXJwKHRoaXMueSwgdGhpcy5lbmRZLCAwLjEpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB0aGlzLnRpbWVyLS07XHJcbiAgICBpZiAodGhpcy50aW1lciA8PSAwKSB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMuY2xpZW50LkFOSU1BVElPTl9MSVNUW3RoaXMuaWRdO1xyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbGVycChhLCBiLCByYXRpbykge1xyXG4gICAgcmV0dXJuIGEgKyByYXRpbyAqIChiIC0gYSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQW5pbWF0aW9uO1xyXG5cclxuXHJcbiIsImZ1bmN0aW9uIE1pbmlNYXAoKSB7IC8vZGVwcmVjYXRlZCwgcGxlYXNlIHVwZGF0ZVxyXG59XHJcblxyXG5NaW5pTWFwLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKG1hcFRpbWVyIDw9IDAgfHwgc2VydmVyTWFwID09PSBudWxsKSB7XHJcbiAgICAgICAgdmFyIHRpbGVMZW5ndGggPSBNYXRoLnNxcnQoT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaWYgKHRpbGVMZW5ndGggPT09IDAgfHwgIXNlbGZQbGF5ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgaW1nRGF0YSA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKHRpbGVMZW5ndGgsIHRpbGVMZW5ndGgpO1xyXG4gICAgICAgIHZhciB0aWxlO1xyXG4gICAgICAgIHZhciB0aWxlUkdCO1xyXG4gICAgICAgIHZhciBpID0gMDtcclxuXHJcblxyXG4gICAgICAgIGZvciAodmFyIGlkIGluIFRJTEVfTElTVCkge1xyXG4gICAgICAgICAgICB0aWxlUkdCID0ge307XHJcbiAgICAgICAgICAgIHRpbGUgPSBUSUxFX0xJU1RbaWRdO1xyXG4gICAgICAgICAgICBpZiAodGlsZS5jb2xvciAmJiB0aWxlLmFsZXJ0IHx8IGluQm91bmRzKHNlbGZQbGF5ZXIsIHRpbGUueCwgdGlsZS55KSkge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gdGlsZS5jb2xvci5yO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5nID0gdGlsZS5jb2xvci5nO1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5iID0gdGlsZS5jb2xvci5iO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGlsZVJHQi5yID0gMDtcclxuICAgICAgICAgICAgICAgIHRpbGVSR0IuZyA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aWxlUkdCLmIgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpbWdEYXRhLmRhdGFbaV0gPSB0aWxlUkdCLnI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMV0gPSB0aWxlUkdCLmc7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgMl0gPSB0aWxlUkdCLmI7XHJcbiAgICAgICAgICAgIGltZ0RhdGEuZGF0YVtpICsgM10gPSAyNTU7XHJcbiAgICAgICAgICAgIGkgKz0gNDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSk7XHJcbiAgICAgICAgaW1nRGF0YSA9IHNjYWxlSW1hZ2VEYXRhKGltZ0RhdGEsIE1hdGguZmxvb3IoNDAwIC8gT2JqZWN0LnNpemUoVElMRV9MSVNUKSksIG1haW5DdHgpO1xyXG5cclxuICAgICAgICBtTWFwQ3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcclxuXHJcbiAgICAgICAgbU1hcEN0eFJvdC5yb3RhdGUoOTAgKiBNYXRoLlBJIC8gMTgwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LmRyYXdJbWFnZShtTWFwLCAwLCAwKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnNjYWxlKDEsIC0xKTtcclxuICAgICAgICBtTWFwQ3R4Um90LnJvdGF0ZSgyNzAgKiBNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgc2VydmVyTWFwID0gbU1hcFJvdDtcclxuICAgICAgICBtYXBUaW1lciA9IDI1O1xyXG4gICAgfVxyXG5cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIG1hcFRpbWVyIC09IDE7XHJcbiAgICB9XHJcblxyXG4gICAgbWFpbkN0eC5kcmF3SW1hZ2Uoc2VydmVyTWFwLCA4MDAsIDQwMCk7XHJcbn07IC8vZGVwcmVjYXRlZFxyXG5cclxuTWluaU1hcC5wcm90b3R5cGUuc2NhbGVJbWFnZURhdGEgPSBmdW5jdGlvbiAoaW1hZ2VEYXRhLCBzY2FsZSwgbWFpbkN0eCkge1xyXG4gICAgdmFyIHNjYWxlZCA9IG1haW5DdHguY3JlYXRlSW1hZ2VEYXRhKGltYWdlRGF0YS53aWR0aCAqIHNjYWxlLCBpbWFnZURhdGEuaGVpZ2h0ICogc2NhbGUpO1xyXG4gICAgdmFyIHN1YkxpbmUgPSBtYWluQ3R4LmNyZWF0ZUltYWdlRGF0YShzY2FsZSwgMSkuZGF0YTtcclxuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IGltYWdlRGF0YS5oZWlnaHQ7IHJvdysrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgaW1hZ2VEYXRhLndpZHRoOyBjb2wrKykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlUGl4ZWwgPSBpbWFnZURhdGEuZGF0YS5zdWJhcnJheShcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCxcclxuICAgICAgICAgICAgICAgIChyb3cgKiBpbWFnZURhdGEud2lkdGggKyBjb2wpICogNCArIDRcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBzY2FsZTsgeCsrKSBzdWJMaW5lLnNldChzb3VyY2VQaXhlbCwgeCAqIDQpXHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgc2NhbGU7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlc3RSb3cgPSByb3cgKiBzY2FsZSArIHk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVzdENvbCA9IGNvbCAqIHNjYWxlO1xyXG4gICAgICAgICAgICAgICAgc2NhbGVkLmRhdGEuc2V0KHN1YkxpbmUsIChkZXN0Um93ICogc2NhbGVkLndpZHRoICsgZGVzdENvbCkgKiA0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzY2FsZWQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmlNYXA7IiwiZnVuY3Rpb24gUGxheWVyKHBsYXllckluZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHBsYXllckluZm8uaWQ7XHJcbiAgICB0aGlzLm5hbWUgPSBwbGF5ZXJJbmZvLm5hbWU7XHJcbiAgICB0aGlzLnggPSBwbGF5ZXJJbmZvLng7XHJcbiAgICB0aGlzLnkgPSBwbGF5ZXJJbmZvLnk7XHJcbiAgICB0aGlzLmhlYWx0aCA9IHBsYXllckluZm8uaGVhbHRoO1xyXG4gICAgdGhpcy5tYXhIZWFsdGggPSBwbGF5ZXJJbmZvLm1heEhlYWx0aDtcclxuICAgIHRoaXMudGhldGEgPSBwbGF5ZXJJbmZvLnRoZXRhO1xyXG4gICAgdGhpcy5sZXZlbCA9IHBsYXllckluZm8ubGV2ZWw7IC8vbmVlZCB0byBpbXBsZW1lbnQgYWdhaW5cclxuICAgIHRoaXMucmFkaXVzID0gcGxheWVySW5mby5yYWRpdXM7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuXHJcbiAgICBpZiAoIXRoaXMuU0VMRl9QTEFZRVIgJiYgdGhpcy5pZCA9PT0gdGhpcy5jbGllbnQuU0VMRl9JRCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50LmFjdGl2ZSA9IHRoaXMuYWN0aXZlOyAvL3Byb2JhYmx5IHNob3VsZCBjaGFuZ2UgdGhpc1xyXG4gICAgICAgIHRoaXMuY2xpZW50LlNFTEZfUExBWUVSID0gdGhpcztcclxuICAgIH1cclxufVxyXG5cclxuUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocGxheWVySW5mbykge1xyXG4gICAgdGhpcy54ID0gcGxheWVySW5mby54O1xyXG4gICAgdGhpcy55ID0gcGxheWVySW5mby55O1xyXG4gICAgdGhpcy5oZWFsdGggPSBwbGF5ZXJJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcGxheWVySW5mby5tYXhIZWFsdGg7XHJcbiAgICB0aGlzLnRoZXRhID0gcGxheWVySW5mby50aGV0YTtcclxuICAgIHRoaXMubGV2ZWwgPSBwbGF5ZXJJbmZvLmxldmVsO1xyXG4gICAgdGhpcy5zaG9vdGluZyA9IHBsYXllckluZm8uc2hvb3Rpbmc7XHJcbiAgICB0aGlzLnJhZGl1cyA9IHBsYXllckluZm8ucmFkaXVzO1xyXG4gICAgdGhpcy52dWxuZXJhYmxlID0gcGxheWVySW5mby52dWxuZXJhYmxlO1xyXG59O1xyXG5cclxuUGxheWVyLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgc2VsZklkID0gdGhpcy5jbGllbnQuU0VMRl9JRDtcclxuICAgIHZhciBmaWxsQWxwaGE7XHJcbiAgICB2YXIgc3Ryb2tlQWxwaGE7XHJcbiAgICB2YXIgaTtcclxuXHJcblxyXG4gICAgZmlsbEFscGhhID0gdGhpcy5oZWFsdGggLyAoNCAqIHRoaXMubWF4SGVhbHRoKTtcclxuICAgIHN0cm9rZUFscGhhID0gMTtcclxuXHJcbiAgICBjdHguZm9udCA9IFwiMjBweCBBcmlhbFwiO1xyXG5cclxuXHJcblxyXG5cclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTIsIDEwMiwgMzcsXCIgKyBzdHJva2VBbHBoYSArIFwiKVwiO1xyXG4gICAgaWYgKHRoaXMuc2hvb3RpbmcpIHtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMudnVsbmVyYWJsZSkge1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInJlZFwiO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgxMjMsMCwwLFwiICsgZmlsbEFscGhhICsgXCIpXCI7XHJcbiAgICB9XHJcbiAgICBjdHgubGluZVdpZHRoID0gMTA7XHJcblxyXG5cclxuICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cztcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHgubW92ZVRvKHRoaXMueCArIHJhZGl1cywgdGhpcy55KTtcclxuXHJcbiAgICB2YXIgdGhldGEsIHgsIHk7XHJcbiAgICBmb3IgKGkgPSBNYXRoLlBJIC8gNDsgaSA8PSAyICogTWF0aC5QSSAtIE1hdGguUEkgLyA0OyBpICs9IE1hdGguUEkgLyA0KSB7XHJcbiAgICAgICAgdGhldGEgPSBpO1xyXG4gICAgICAgIHggPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XHJcbiAgICAgICAgeSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKTtcclxuICAgICAgICBjdHgubGluZVRvKHRoaXMueCArIHgsIHRoaXMueSArIHkpO1xyXG4gICAgfVxyXG4gICAgY3R4LmxpbmVUbyh0aGlzLnggKyByYWRpdXMsIHRoaXMueSArIDMpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcblxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmOWQ2MFwiO1xyXG4gICAgY3R4LmZpbGxUZXh0KHRoaXMubmFtZSwgdGhpcy54LCB0aGlzLnkgKyA3MCk7XHJcblxyXG5cclxuICAgIGlmICh0aGlzLmhlYWx0aCAmJiB0aGlzLm1heEhlYWx0aCAmJiB0aGlzLmhlYWx0aCA+IDApIHsgLy9oZWFsdGggYmFyXHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDEwO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XHJcbiAgICAgICAgY3R4LnJlY3QodGhpcy54LCB0aGlzLnksIDEwMCwgMjApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmVlblwiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAgKiB0aGlzLmhlYWx0aCAvIHRoaXMubWF4SGVhbHRoLCAyMCk7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9IC8vZGlzcGxheSBoZWFsdGggYmFyXHJcblxyXG5cclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyOyIsImZ1bmN0aW9uIFJvY2socm9ja0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy54ID0gcm9ja0luZm8ueDtcclxuICAgIHRoaXMueSA9IHJvY2tJbmZvLnk7XHJcbiAgICB0aGlzLnZlcnRpY2VzID0gcm9ja0luZm8udmVydGljZXM7XHJcbiAgICB0aGlzLnRoZXRhID0gcm9ja0luZm8udGhldGE7XHJcbiAgICB0aGlzLnRleHR1cmUgPSByb2NrSW5mby50ZXh0dXJlO1xyXG4gICAgdGhpcy5uZXV0cmFsID0gcm9ja0luZm8ubmV1dHJhbDtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG59XHJcblxyXG5Sb2NrLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocm9ja0luZm8pIHtcclxuICAgIHRoaXMueCA9IHJvY2tJbmZvLng7XHJcbiAgICB0aGlzLnkgPSByb2NrSW5mby55O1xyXG4gICAgdGhpcy5xdWV1ZVBvc2l0aW9uID0gcm9ja0luZm8ucXVldWVQb3NpdGlvbjsgLy9kZWxldGVcclxuICAgIHRoaXMudGhldGEgPSByb2NrSW5mby50aGV0YTtcclxuICAgIHRoaXMub3duZXIgPSByb2NrSW5mby5vd25lcjtcclxuICAgIHRoaXMubmV1dHJhbCA9IHJvY2tJbmZvLm5ldXRyYWw7XHJcbiAgICB0aGlzLmhlYWx0aCA9IHJvY2tJbmZvLmhlYWx0aDtcclxuICAgIHRoaXMubWF4SGVhbHRoID0gcm9ja0luZm8ubWF4SGVhbHRoO1xyXG4gICAgdGhpcy5mYXN0ID0gcm9ja0luZm8uZmFzdDtcclxufTtcclxuXHJcblxyXG5Sb2NrLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICB2YXIgU0NBTEUgPSAxMDA7XHJcblxyXG5cclxuICAgIGN0eC5maWxsU3R5bGUgPSBcInBpbmtcIjsgLy9kZWZhdWx0IGNvbG9yXHJcbiAgICBzd2l0Y2ggKHRoaXMudGV4dHVyZSkge1xyXG4gICAgICAgIGNhc2UgXCJicm9uemVcIjpcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiYnJvd25cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNpbHZlclwiOlxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJncmV5XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJnb2xkXCI6XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBcInllbGxvd1wiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gIXRoaXMub3duZXIgPyBcImJsdWVcIiA6IFwiZ3JlZW5cIjtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuZmFzdCA/IFwicmVkXCIgOiBjdHguc3Ryb2tlU3R5bGU7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLm5ldXRyYWwgPyBcInBpbmtcIiA6IGN0eC5zdHJva2VTdHlsZTtcclxuXHJcblxyXG4gICAgaWYgKCF0aGlzLnZlcnRpY2VzKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnRyYW5zbGF0ZSh0aGlzLngsIHRoaXMueSk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHgucm90YXRlKHRoaXMudGhldGEpO1xyXG5cclxuICAgIGlmICh0aGlzLnZlcnRpY2VzKSB7XHJcbiAgICAgICAgdmFyIHYgPSB0aGlzLnZlcnRpY2VzO1xyXG4gICAgICAgIGN0eC5tb3ZlVG8odlswXVswXSAqIFNDQUxFLCB2WzBdWzFdICogU0NBTEUpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHYubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY3R4LmxpbmVUbyh2W2ldWzBdICogU0NBTEUsIHZbaV1bMV0gKiBTQ0FMRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN0eC5saW5lVG8odlswXVswXSAqIFNDQUxFLCB2WzBdWzFdICogU0NBTEUpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIDMwLCAzMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnJvdGF0ZSgyICogTWF0aC5QSSAtIHRoaXMudGhldGEpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuXHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICBjdHgudHJhbnNsYXRlKC10aGlzLngsIC10aGlzLnkpO1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy5oZWFsdGggJiYgdGhpcy5tYXhIZWFsdGggJiYgdGhpcy5oZWFsdGggPiAwKSB7IC8vaGVhbHRoIGJhclxyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxMDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJibGFja1wiO1xyXG4gICAgICAgIGN0eC5yZWN0KHRoaXMueCwgdGhpcy55LCAxMDAsIDIwKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuICAgICAgICBjdHgucmVjdCh0aGlzLngsIHRoaXMueSwgMTAwICogdGhpcy5oZWFsdGggLyB0aGlzLm1heEhlYWx0aCwgMjApO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfSAvL2Rpc3BsYXkgaGVhbHRoIGJhclxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbShtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIG1pbjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSb2NrOyIsImZ1bmN0aW9uIFRpbGUodGhpc0luZm8sIGNsaWVudCkge1xyXG4gICAgdGhpcy5pZCA9IHRoaXNJbmZvLmlkO1xyXG4gICAgdGhpcy54ID0gdGhpc0luZm8ueDtcclxuICAgIHRoaXMueSA9IHRoaXNJbmZvLnk7XHJcbiAgICB0aGlzLmxlbmd0aCA9IHRoaXNJbmZvLmxlbmd0aDtcclxuICAgIHRoaXMuY29sb3IgPSB0aGlzSW5mby5jb2xvcjtcclxuICAgIHRoaXMudG9wQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yICsgMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nICsgMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iICsgMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmJvcmRlckNvbG9yID0ge1xyXG4gICAgICAgIHI6IHRoaXMuY29sb3IuciAtIDEwLFxyXG4gICAgICAgIGc6IHRoaXMuY29sb3IuZyAtIDEwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiAtIDEwXHJcbiAgICB9O1xyXG4gICAgdGhpcy5hbGVydCA9IHRoaXNJbmZvLmFsZXJ0O1xyXG4gICAgdGhpcy5yYW5kb20gPSBNYXRoLmZsb29yKGdldFJhbmRvbSgwLCAzKSk7XHJcblxyXG4gICAgdGhpcy5jbGllbnQgPSBjbGllbnQ7XHJcbn1cclxuXHJcblRpbGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aGlzSW5mbykge1xyXG4gICAgdGhpcy5jb2xvciA9IHRoaXNJbmZvLmNvbG9yO1xyXG4gICAgdGhpcy50b3BDb2xvciA9IHtcclxuICAgICAgICByOiB0aGlzLmNvbG9yLnIgKyAxMDAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nICsgMTAwLFxyXG4gICAgICAgIGI6IHRoaXMuY29sb3IuYiArIDEwMFxyXG4gICAgfTtcclxuICAgIHRoaXMuYm9yZGVyQ29sb3IgPSB7XHJcbiAgICAgICAgcjogdGhpcy5jb2xvci5yIC0gMTAsXHJcbiAgICAgICAgZzogdGhpcy5jb2xvci5nIC0gMTAsXHJcbiAgICAgICAgYjogdGhpcy5jb2xvci5iIC0gMTBcclxuICAgIH07XHJcbiAgICB0aGlzLmFsZXJ0ID0gdGhpc0luZm8uYWxlcnQ7XHJcbn07XHJcblxyXG5UaWxlLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGN0eCA9IHRoaXMuY2xpZW50Lm1haW5DdHg7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2IoXCIgKyB0aGlzLmJvcmRlckNvbG9yLnIgKyBcIixcIiArIHRoaXMuYm9yZGVyQ29sb3IuZyArIFwiLFwiICsgdGhpcy5ib3JkZXJDb2xvci5iICsgXCIpXCI7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMjA7XHJcblxyXG5cclxuICAgIHZhciBncmQgPSBjdHguY3JlYXRlTGluZWFyR3JhZGllbnQodGhpcy54ICsgdGhpcy5sZW5ndGggKiAzLzQsIHRoaXMueSwgdGhpcy54ICsgdGhpcy5sZW5ndGgvNCwgdGhpcy55ICsgdGhpcy5sZW5ndGgpO1xyXG4gICAgZ3JkLmFkZENvbG9yU3RvcCgwLCBcInJnYihcIiArIHRoaXMudG9wQ29sb3IuciArIFwiLFwiICsgdGhpcy50b3BDb2xvci5nICsgXCIsXCIgKyB0aGlzLnRvcENvbG9yLmIgKyBcIilcIik7XHJcbiAgICBncmQuYWRkQ29sb3JTdG9wKDEsIFwicmdiKFwiICsgdGhpcy5jb2xvci5yICsgXCIsXCIgKyB0aGlzLmNvbG9yLmcgKyBcIixcIiArIHRoaXMuY29sb3IuYiArIFwiKVwiKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBncmQ7XHJcblxyXG5cclxuICAgIGN0eC5yZWN0KHRoaXMueCArIDMwLCB0aGlzLnkgKyAzMCwgdGhpcy5sZW5ndGggLSAzMCwgdGhpcy5sZW5ndGggLSAzMCk7XHJcblxyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcblxyXG59O1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGlsZTtcclxuXHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb20obWluLCBtYXgpIHtcclxuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikgKyBtaW47XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEFuaW1hdGlvbjogcmVxdWlyZSgnLi9BbmltYXRpb24nKSxcclxuICAgIFBsYXllcjogcmVxdWlyZSgnLi9QbGF5ZXInKSxcclxuICAgIE1pbmlNYXA6IHJlcXVpcmUoJy4vTWluaU1hcCcpLFxyXG4gICAgVGlsZTogcmVxdWlyZSgnLi9UaWxlJyksXHJcbiAgICBSb2NrOiByZXF1aXJlKCcuL1JvY2snKVxyXG59OyIsInZhciBDbGllbnQgPSByZXF1aXJlKCcuL0NsaWVudC5qcycpO1xyXG52YXIgTWFpblVJID0gcmVxdWlyZSgnLi91aS9NYWluVUknKTtcclxuXHJcbnZhciBjbGllbnQgPSBuZXcgQ2xpZW50KCk7XHJcbmNsaWVudC5zdGFydCgpO1xyXG5cclxuXHJcblxyXG5kb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGNsaWVudC5rZXlzW2V2ZW50LmtleUNvZGVdID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNQQUNFXCIpO1xyXG4gICAgICAgIGNsaWVudC5zb2NrZXQuZW1pdChcInNob290U2VsZlwiLCB7XHJcbiAgICAgICAgICAgIGlkOiBjbGllbnQuU0VMRl9JRFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59LmJpbmQodGhpcyk7XHJcblxyXG5kb2N1bWVudC5vbmtleXVwID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODQpIHtcclxuICAgICAgICBjbGllbnQubWFpblVJLmdhbWVVSS5jaGF0VUkudGV4dElucHV0LmNsaWNrKCk7XHJcbiAgICB9XHJcbiAgICBjbGllbnQua2V5c1tldmVudC5rZXlDb2RlXSA9IGZhbHNlO1xyXG4gICAgY2xpZW50LnNvY2tldC5lbWl0KCdrZXlFdmVudCcsIHtpZDogZXZlbnQua2V5Q29kZSwgc3RhdGU6IGZhbHNlfSk7XHJcbn07XHJcblxyXG5cclxuJCh3aW5kb3cpLmJpbmQoJ21vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGlmIChldmVudC5jdHJsS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuICAgIGlmIChjbGllbnQuQ0hBVF9TQ1JPTEwpIHtcclxuICAgICAgICBjbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXZlbnQub3JpZ2luYWxFdmVudC53aGVlbERlbHRhIC8xMjAgPiAwICYmIGNsaWVudC5tYWluU2NhbGVGYWN0b3IgPCAyKSB7XHJcbiAgICAgICAgY2xpZW50Lm1haW5TY2FsZUZhY3RvciArPSAwLjA1O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoY2xpZW50Lm1haW5TY2FsZUZhY3RvciA+IDAuMjUpIHtcclxuICAgICAgICBjbGllbnQubWFpblNjYWxlRmFjdG9yIC09IDAuMDU7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkgeyAvL3ByZXZlbnQgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbn0sIGZhbHNlKTsiLCJkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJzsgIC8vIGZpcmVmb3gsIGNocm9tZVxyXG5kb2N1bWVudC5ib2R5LnNjcm9sbCA9IFwibm9cIjtcclxuXHJcbnZhciBQbGF5ZXJOYW1lclVJID0gcmVxdWlyZSgnLi9QbGF5ZXJOYW1lclVJJyk7XHJcbnZhciBHYW1lVUkgPSByZXF1aXJlKCcuL2dhbWUvR2FtZVVJJyk7XHJcblxyXG5mdW5jdGlvbiBNYWluVUkoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5nYW1lVUkgPSBuZXcgR2FtZVVJKHRoaXMuY2xpZW50LCB0aGlzLnNvY2tldCwgdGhpcyk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lclVJID0gbmV3IFBsYXllck5hbWVyVUkodGhpcy5jbGllbnQsIHRoaXMuc29ja2V0KTtcclxufVxyXG5cclxuTWFpblVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKGluZm8pIHtcclxuICAgIHZhciBhY3Rpb24gPSBpbmZvLmFjdGlvbjtcclxuICAgIHZhciBob21lO1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0Lm9wZW4oaW5mby5tZXNzYWdlKTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5NYWluVUkucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKGFjdGlvbikge1xyXG4gICAgaWYgKGFjdGlvbiA9PT0gXCJnYW1lTXNnUHJvbXB0XCIpIHtcclxuICAgICAgICB0aGlzLmdhbWVVSS5nYW1lTXNnUHJvbXB0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuTWFpblVJLnByb3RvdHlwZS51cGRhdGVMZWFkZXJCb2FyZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBsZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRcIik7XHJcbiAgICB2YXIgUExBWUVSX0FSUkFZID0gdGhpcy5jbGllbnQuUExBWUVSX0FSUkFZO1xyXG5cclxuXHJcbiAgICB2YXIgcGxheWVyU29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgdmFyIHBsYXllckEgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFthXTtcclxuICAgICAgICB2YXIgcGxheWVyQiA9IHRoaXMuY2xpZW50LlBMQVlFUl9MSVNUW2JdO1xyXG4gICAgICAgIHJldHVybiBwbGF5ZXJBLnJhZGl1cyAtIHBsYXllckIucmFkaXVzO1xyXG4gICAgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIFBMQVlFUl9BUlJBWS5zb3J0KHBsYXllclNvcnQpO1xyXG5cclxuXHJcbiAgICBsZWFkZXJib2FyZC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgZm9yICh2YXIgaSA9IFBMQVlFUl9BUlJBWS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBwbGF5ZXIgPSB0aGlzLmNsaWVudC5QTEFZRVJfTElTVFtQTEFZRVJfQVJSQVlbaV1dO1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICAgICAgZW50cnkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGxheWVyLm5hbWUgKyBcIiAtIFwiICsgcGxheWVyLnJhZGl1cykpO1xyXG4gICAgICAgIGxlYWRlcmJvYXJkLmFwcGVuZENoaWxkKGVudHJ5KTtcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNYWluVUk7IiwiZnVuY3Rpb24gUGxheWVyTmFtZXJVSSAoY2xpZW50LCBzb2NrZXQpIHtcclxuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xyXG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG4gICAgdGhpcy5sZWFkZXJib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhZGVyYm9hcmRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5uYW1lQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYW1lU3VibWl0XCIpO1xyXG4gICAgdGhpcy5wbGF5ZXJOYW1lSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllck5hbWVJbnB1dFwiKTtcclxuICAgIHRoaXMucGxheWVyTmFtZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXllcl9uYW1lclwiKTtcclxufVxyXG5cclxuUGxheWVyTmFtZXJVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMucGxheWVyTmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWVCdG4uY2xpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMubmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuY2xpZW50Lm1haW5DYW52YXMuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMubGVhZGVyYm9hcmQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmVtaXQoXCJuZXdQbGF5ZXJcIixcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5wbGF5ZXJOYW1lSW5wdXQudmFsdWUsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMucGxheWVyTmFtZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5wbGF5ZXJOYW1lci5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICB0aGlzLnBsYXllck5hbWVJbnB1dC5mb2N1cygpO1xyXG4gICAgdGhpcy5sZWFkZXJib2FyZC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyTmFtZXJVSTsiLCJmdW5jdGlvbiBDaGF0VUkocGFyZW50KSB7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMudGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYXRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhdF9pbnB1dCcpO1xyXG4gICAgdGhpcy5jaGF0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF0X2xpc3QnKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZXh0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy50ZXh0SW5wdXQuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5wYXJlbnQuY2xpZW50LkNIQVRfT1BFTiA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5jaGF0TGlzdC5zdHlsZS5oZWlnaHQgPSBcIjgwJVwiO1xyXG4gICAgICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJhdXRvXCI7XHJcblxyXG4gICAgICAgIHRoaXMudGV4dElucHV0LnN0eWxlLmJhY2tncm91bmQgPSBcInJnYmEoMzQsIDQ4LCA3MSwgMSlcIjtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICB0aGlzLnRleHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICB0aGlzLnNlbmRNZXNzYWdlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcblxyXG4gICAgdGhpcy50ZW1wbGF0ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX1NDUk9MTCA9IHRydWU7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIHRoaXMudGVtcGxhdGUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX0NMSUNLID0gdHJ1ZTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn1cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMudGV4dElucHV0LmJsdXIoKTtcclxuICAgIHRoaXMucGFyZW50LmNsaWVudC5DSEFUX09QRU4gPSBmYWxzZTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuaGVpZ2h0ID0gXCIzMCVcIjtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjAyKVwiO1xyXG4gICAgdGhpcy50ZXh0SW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFwicmdiYSgxODIsIDE5MywgMjExLCAwLjEpXCI7XHJcbiAgICB0aGlzLnBhcmVudC5jbGllbnQuQ0hBVF9TQ1JPTEwgPSBmYWxzZTtcclxuICAgICQoJyNjaGF0X2xpc3QnKS5hbmltYXRlKHtzY3JvbGxUb3A6ICQoJyNjaGF0X2xpc3QnKS5wcm9wKFwic2Nyb2xsSGVpZ2h0XCIpfSwgMTAwKTtcclxuICAgIHRoaXMuY2hhdExpc3Quc3R5bGUub3ZlcmZsb3dZID0gXCJub25lXCI7XHJcbn07XHJcblxyXG5cclxuQ2hhdFVJLnByb3RvdHlwZS5hZGRNZXNzYWdlID0gZnVuY3Rpb24gKHBhY2tldCkge1xyXG4gICAgdmFyIGVudHJ5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgIGVudHJ5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhY2tldC5uYW1lICsgXCIgOiBcIiArIHBhY2tldC5jaGF0TWVzc2FnZSkpO1xyXG4gICAgdGhpcy5jaGF0TGlzdC5hcHBlbmRDaGlsZChlbnRyeSk7XHJcblxyXG4gICAgJCgnI2NoYXRfbGlzdCcpLmFuaW1hdGUoe3Njcm9sbFRvcDogJCgnI2NoYXRfbGlzdCcpLnByb3AoXCJzY3JvbGxIZWlnaHRcIil9LCAxMDApO1xyXG59O1xyXG5cclxuXHJcbkNoYXRVSS5wcm90b3R5cGUuc2VuZE1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc29ja2V0ID0gdGhpcy5wYXJlbnQuc29ja2V0O1xyXG5cclxuXHJcbiAgICBpZiAodGhpcy50ZXh0SW5wdXQudmFsdWUgJiYgdGhpcy50ZXh0SW5wdXQudmFsdWUgIT09IFwiXCIpIHtcclxuICAgICAgICBzb2NrZXQuZW1pdCgnY2hhdE1lc3NhZ2UnLCB7XHJcbiAgICAgICAgICAgIGlkOiB0aGlzLnBhcmVudC5jbGllbnQuU0VMRl9JRCxcclxuICAgICAgICAgICAgbWVzc2FnZTogdGhpcy50ZXh0SW5wdXQudmFsdWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLnRleHRJbnB1dC52YWx1ZSA9IFwiXCI7XHJcbiAgICB9XHJcbiAgICB0aGlzLmNsb3NlKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRVSTtcclxuXHJcblxyXG4iLCJmdW5jdGlvbiBHYW1lTXNnUHJvbXB0KHBhcmVudCkge1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwcm9tcHRfY29udGFpbmVyXCIpO1xyXG4gICAgdGhpcy5tZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWVfbXNnX3Byb21wdCcpO1xyXG59XHJcblxyXG5HYW1lTXNnUHJvbXB0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcclxuICAgIHRoaXMudGVtcGxhdGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuICAgIHRoaXMubWVzc2FnZS5pbm5lckhUTUwgPSBtZXNzYWdlO1xyXG59O1xyXG5cclxuR2FtZU1zZ1Byb21wdC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZU1zZ1Byb21wdDtcclxuXHJcblxyXG4iLCJ2YXIgR2FtZU1zZ1Byb21wdCA9IHJlcXVpcmUoJy4vR2FtZU1zZ1Byb21wdCcpO1xyXG52YXIgQ2hhdFVJID0gcmVxdWlyZSgnLi9DaGF0VUknKTtcclxuXHJcbmZ1bmN0aW9uIEdhbWVVSShjbGllbnQsIHNvY2tldCwgcGFyZW50KSB7XHJcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcclxuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLmdhbWVNc2dQcm9tcHQgPSBuZXcgR2FtZU1zZ1Byb21wdCh0aGlzKTtcclxuICAgIHRoaXMuY2hhdFVJID0gbmV3IENoYXRVSSh0aGlzKTtcclxufVxyXG5cclxuR2FtZVVJLnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJPUEVOSU5HIEdBTUUgVUlcIik7XHJcbiAgICB0aGlzLmNoYXRVSS5vcGVuKCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9ICBHYW1lVUk7Il19

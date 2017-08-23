var B2 = require('./B2');

module.exports = {
    createBox: createBox,
    createRandomPolygon: createRandomPolygon,
    createPolygonSplit: createPolygonSplit
};


function createBox(world, user, x, y, width, height) {
    var options = {
        'density': 1.0,
        'friction': 0.1,
        'restitution': 0.0,

        'linearDamping': 0.0,
        'angularDamping': 0.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false,
        'userData': user
    };

    var body_def = new B2.b2BodyDef();
    body_def.position.Set(x, y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;
    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;


    var fix_def = new B2.b2FixtureDef();
    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;
    fix_def.shape = new B2.b2PolygonShape();

    fix_def.userData = options.userData;
    //fix_def.filter.maskBits = 0x0000; //nothing can collide with this

    fix_def.shape.SetAsBox(width / 2, height / 2);

    var b = world.CreateBody(body_def);
    b.CreateFixture(fix_def);


    return b;

}


function createRandomPolygon(world, user, vertices, x, y, angle) {
    var options = {
        'density': 1.0,
        'friction': 0.0,
        'restitution': 0.5,

        'linearDamping': 0.0,
        'angularDamping': 1.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false,
        'userData': user
    };

    var body_def = new B2.b2BodyDef();
    body_def.position.Set(x, y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;
    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;

    var fix_def = new B2.b2FixtureDef();
    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;


    var b2Vertices = [];
    for (var i = 0; i < vertices.length; i++) {
        var b2Vertex = new B2.b2Vec2();
        b2Vertex.Set(vertices[i][0], vertices[i][1]);
        b2Vertices[i] = b2Vertex;
    }

    var polygon = new B2.b2PolygonShape();
    polygon.SetAsArray(b2Vertices, b2Vertices.length);

    fix_def.shape = polygon;
    fix_def.userData = options.userData;
    //fix_def.filter.maskBits = 0x0000; //nothing can collide with this
    var body = world.CreateBody(body_def);
    body.CreateFixture(fix_def);
    if (angle) {
        body.SetAngle(angle);
    }
    return body;
}

function createPolygonSplit(world, body, v1, v2) {
    var options = {
        'density': 1.0,
        'friction': 0.0,
        'restitution': 0.5,

        'linearDamping': 0.0,
        'angularDamping': 1.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false,
    };

    var body_def = new B2.b2BodyDef();
    body_def.position.Set(body.GetPosition().x, body.GetPosition().y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;
    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;

    var fix_def = new B2.b2FixtureDef();
    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;


    var b2V1 = [];
    for (var i = 0; i < v1.length; i++) {
        var b2Vertex = new B2.b2Vec2();
        b2Vertex.Set(v1[i][0], v1[i][1]);
        b2V1[i] = b2Vertex;
    }

    var b2V2 = [];
    for (var i = 0; i < v2.length; i++) {
        var b2Vertex = new B2.b2Vec2();
        b2Vertex.Set(v2[i][0], v2[i][1]);
        b2V2[i] = b2Vertex;
    }


    var pol1 = new B2.b2PolygonShape();
    pol1.SetAsArray(b2V1, b2V1.length);

    var pol2 = new B2.b2PolygonShape();
    pol2.SetAsArray(b2V2, b2V2.length);




    world.DestroyBody(body);

    fix_def.shape = pol1;
    var b1 = world.CreateBody(body_def);
    b1.SetAngle(body.GetAngle());
    b1.CreateFixture(fix_def);

    fix_def.shape = pol2;
    var b2 = world.CreateBody(body_def);
    b2.SetAngle(body.GetAngle());
    b2.CreateFixture(fix_def);

    return [b1,b2];

}

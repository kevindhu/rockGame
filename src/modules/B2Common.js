const B2 = require('./B2');


module.exports = {
    createBox: createBox
};


function createBox(world, x, y, width, height) {
    var options = {
        'density': 1.0,
        'friction': 1.0,
        'restitution': 0.0,

        'linearDamping': 0.0,
        'angularDamping': 0.0,

        'gravityScale': 1.0,
        'type': B2.b2Body.b2_dynamicBody,
        'fixedRotation': false,
        'userData': null
    };

    var body_def = new B2.b2BodyDef();
    var fix_def = new B2.b2FixtureDef;

    fix_def.density = options.density;
    fix_def.friction = options.friction;
    fix_def.restitution = options.restitution;

    fix_def.shape = new B2.b2PolygonShape();

    //user specific data
    fix_def.userData = options.userData;

    //important! this takes half the width
    fix_def.shape.SetAsBox(width / 2, height / 2);

    body_def.position.Set(x, y);
    body_def.linearDamping = options.linearDamping;
    body_def.angularDamping = options.angularDamping;

    body_def.type = options.type;
    body_def.fixedRotation = options.fixedRotation;

    var b = world.CreateBody(body_def);
    b.CreateFixture(fix_def);

    return b;
}

var physics = function() {

};

physics.prototype.update = function(drones) {
    for (var i = 0; i < drones.length; i++) {

        var current = drones[i];

        //if (current.isTarget) continue;

        current.x += current.speed * Math.cos(current.theta);
        current.y += current.speed * Math.sin(current.theta);

        current.x = constrainValue(current.x, 0, XBOUND);
        current.y = constrainValue(current.y, 0, YBOUND);
    }
};

function constrainValue(value, min, max) {
    if (value < min) value = min;
    if (value > max) value = max;
    return value;
}


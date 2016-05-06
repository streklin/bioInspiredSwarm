
var sensorReading = function(r, theta) {
    sensorReading.r = r;
    sensorReading.theta = theta;
};

var genomeTemplate = {
    speedDelta: 1,
    orientationDelta: 0.3,
    collisionThreshold: 5,
    wanderSpeedProb: 0.05,
    wanderOrientationProb: 0.10
};

var actionTemplate = {
    actionType: '',
    data: {}
};

var drone = function(x,y, theta, speed, genome) {
    this.x = x;
    this.y = y;
    this.theta = theta;
    this.speed = speed;
    this.grapple = false;
    this.genome = genome;

    this.backupCounter = 0;
};

drone.prototype.update = function(sensoryInput) {

    var actions = wander.call(this, sensoryInput, []);
    actions = avoid.call(this, sensoryInput, actions);
    actions = backup.call(this, sensoryInput, actions);

    executeActions.call(this, actions);
};


function wander(sensoryInput, actions) {

    var actions = [];

    //change direction?
    if (Math.random() <= this.genome.wanderOrientationProb) {
        var angleDelta = Math.random() * this.genome.orientationDelta * 2;
        angleDelta -= this.genome.orientationDelta;
        actions.push({
            actionType: ACTION_ROTATE,
            data: angleDelta
        });
    }

    //change speed?
    if (Math.random() <= this.genome.wanderSpeedProb) {

        var speedDelta = Math.random() * this.genome.speedDelta * 2;
        speedDelta -= this.genome.speedDelta;

        if (this.speed < 0 && speedDelta < 0) speedDelta *= -1;

        actions.push({
            actionType: ACTION_SPEED,
            data: speedDelta
        });
    }

    return actions;
}

function avoid(sensoryInput, actions) {

    if (sensoryInput.length == 0) return actions;

    //find minimum distance
    var closestInput = null;

    for(var i = 0; i < sensoryInput.length; i++) {
        if (_.isNull(closestInput)) {
            closestInput = sensoryInput[i];
            continue;
        }

        if (sensoryInput[i].distance < closestInput.distance) closestInput = sensoryInput[i];
    }

    //is this an obstacle?
    var distance = closestInput.distance;

    var theta1 = this.theta;
    var theta2 = closestInput.angle;


    var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));

    if (Math.abs(angleDiff) > THRESHOLD_ANGLE) return actions;

    if (distance < THRESHOLD_DISTANCE && distance > THRESHOLD_EMERGENCY_STOP) {
        var da = 0.2;

        if (this.speed < 0) da *= -1;

        if (angleDiff < 0) da *=-1;

        var newAction = {
            actionType: ACTION_ROTATE,
            data: da
        };

        actions = subsume(newAction, actions);

    } else if (distance < THRESHOLD_EMERGENCY_STOP) {

        newAction = {
            actionType: ACTION_SPEED,
            data: -1 * this.speed
        };

        actions = subsume(newAction, actions);
    }

    return actions;
}

function backup(sensoryInput, actions) {
    if(this.speed != 0) {
        this.backupCounter = 0;
        return actions;
    }

    this.backupCounter++;

    if(this.backupCounter > BACKWARDS_WAIT) {
        var newAction = {
            actionType: ACTION_SPEED,
            data: -2 * (MAXIMUM_SPEED)
        };

        actions = subsume(newAction, actions);
    }

    return actions;
}


function subsume(newAction, actionList) {
    //get rid of any other actions of this type
    actionList = _.reject(actionList, function(element) { element.actionType = newAction.actionType; });
    actionList.push(newAction);

    return actionList;
}

function executeActions(actions) {

    var self = this;

    _.each(actions, function(element) {
        switch(element.actionType) {
            case ACTION_ROTATE:
                self.theta += element.data;
                break;
            case ACTION_SPEED:
                self.speed += element.data;
                break;
        }
    });

    //lock values within constraints
    if (self.theta < 0) self.theta += 2*Math.PI;
    if (self.theta > 2*Math.PI) self.theta -= 2*Math.PI;

    if (self.speed < -MAXIMUM_SPEED) self.speed = -MAXIMUM_SPEED;
    if (self.speed > MAXIMUM_SPEED) self.speed = MAXIMUM_SPEED;


}


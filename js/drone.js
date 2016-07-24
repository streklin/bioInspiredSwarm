
var sensorReading = function(r, theta) {
    sensorReading.r = r;
    sensorReading.theta = theta;
};

var genomeTemplate = {
    speedDelta: 1,
    orientationDelta: 0.15,
    wanderSpeedProb: 0.05,
    wanderOrientationProb: 0.05,
    radioThreshold: 800,
    thresholdDistance: 25,
    emergencyStop: 5,
    thresholdAngle:  Math.PI,
    maximumSpeed: 5,
    backwardsWait: 5
};

var actionTemplate = {
    actionType: '',
    data: {}
};

var drone = function(x,y, theta, speed, genome, radio) {
    this.id = 0;
    this.x = x;
    this.y = y;
    this.theta = theta;
    this.speed = speed;
    this.genome = genome;
    this.radio = radio;
    this.heartBeatInterval = 50;
    this.heartBeatCounter = 50;
    this.signalSent = false;

};

drone.prototype.update = function(sensoryInput) {

    updateTicker.call(this);

    var actions = [];
    actions = wander.call(this, sensoryInput, actions);
    actions = processSignals.call(this, sensoryInput, actions);
    actions = signalGoal.call(this,sensoryInput, actions);
    actions = avoid.call(this, sensoryInput, actions);

    executeActions.call(this, actions);
};

//the heart beat
function updateTicker() {

    if (!this.signalSent && this.heartBeatInterval < 50)
        this.heartBeatInterval++;
    else if(this.signalSent)
        increaseHeartBeat.call(this);

    this.heartBeatCounter--;
    if (this.heartBeatCounter < 0) this.heartBeatCounter = this.heartBeatInterval;

}

//quicken the heartbeat
function increaseHeartBeat() {
    //force a heart beat
    this.heartBeatCounter = 0;

    //decrease the size of beaconMax, to a minumum of 1
    if (this.heartBeatInterval > 1)
        this.heartBeatInterval--;
}

function wander(sensoryInput, actions) {
    //keep doing what we are doing until the next heartbeat
    if (this.heartBeatCounter !== 0) return actions;

    //choose a random direction change
    var delta = this.genome.orientationDelta;
    var flip = Math.random() > Math.random();
    if (flip) {
        delta *= -1;
    }

    var action = {
        actionType: ACTION_ROTATE ,
        data: delta
    };

    actions = subsume(action, actions);

    return actions;
}

function signalGoal(sensoryInput, actions) {

    this.signalSent = false;

    //scan the sensory input
    var goals = _.filter(sensoryInput, function(element) {
        return element.isGoal;
    });

    var sortedGoals = _.sortBy(goals, "distance");

    if (sortedGoals.length === 0) return actions;

    var currentGoal = sortedGoals[0];
    var signalAction = createSignalAction.call(this, {direction: currentGoal.angle});

    actions = subsume(signalAction, actions);

    //  change orientation var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));
    var theta1 = this.theta;
    var theta2 = currentGoal.angle;
    var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));

    var delta = this.genome.orientationDelta;
    if(angleDiff > 0) delta *= -1;

    var action = {
        actionType: ACTION_ROTATE ,
        data: delta
    };

    actions = subsume(action, actions);

    return actions;
}

function processSignals(sensoryInput, actions) {
    var signals = this.radio.getSignals(this.x, this.y, this.genome.radioThreshold);

    if (signals.length === 0) return actions;

    if (!this.signalSent) increaseHeartBeat();

    var self = this;

    var signalsSorted = _.sortBy(signals, function(element) {
        return distanceMetric(self, element);
    });

    var closestSignal = signalsSorted[0];

    var theta1 = this.theta;
    var theta2 = closestSignal.data.direction;
    var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));

    var delta = this.genome.orientationDelta;
    if(angleDiff > 0) delta *= -1;

    var action = {
        actionType: ACTION_ROTATE ,
        data: delta
    };

    actions = subsume(action, actions);

    return actions;
}

function avoid(sensoryInput, actions) {

    if (sensoryInput.length == 0) return actions;

    var obstacles = _.filter(sensoryInput, function(element) {
        return !element.isGoal || element.goalType === GOAL_OBSTACLE
    });

    if (obstacles.length === 0) return actions;

    var sortedObstacles = _.sortBy(obstacles, function(element) {
       return element.distance;
    });

    var closestInput = sortedObstacles[0];

    var distance = closestInput.distance;

    var theta1 = this.theta;
    var theta2 = closestInput.angle;

    var angleDiff = Math.atan2(Math.sin(theta1-theta2), Math.cos(theta1-theta2));

    if (Math.abs(angleDiff) > this.genome.thresholdAngle) return actions;

    if (distance < this.genome.thresholdDistance) {

        var delta = this.genome.orientationDelta;
        //if(angleDiff > 0) delta *= -1;

        var newAction = {
            actionType: ACTION_ROTATE ,
            data: delta
        };

        actions = subsume(newAction, actions);
    }

    return actions;
}

function createSignalAction(data) {
    this.signalSent = true;

    var signalAction = {
        actionType: ACTION_SIGNAL,
        data: data
    };

    return signalAction;

}

function subsume(newAction, actionList) {
    //get rid of any other actions of this type
    actionList = _.reject(actionList, function(element) { return element.actionType == newAction.actionType; });
    actionList.push(newAction);

    return actionList;
}

function executeActions(actions) {

    var self = this;

    this.radio.clearDroneSignals(this.id);

    _.each(actions, function(element) {
        switch(element.actionType) {
            case ACTION_ROTATE:
                self.theta += element.data;
                break;
            case ACTION_SPEED:
                self.speed += element.data;
                break;
            case ACTION_SIGNAL:
                self.radio.addSignal(self.id, self.x, self.y, element.data);
                break;
            case ACTION_STOP:
                //self.speed = 0;
                break;
        }
    });

    //lock values within constraints
    if (self.theta < 0) self.theta += 2*Math.PI;
    if (self.theta > 2*Math.PI) self.theta -= 2*Math.PI;

    if (self.speed < -self.genome.maximumSpeed) self.speed = -self.genome.maximumSpeed;
    if (self.speed > self.genome.maximumSpeed) self.speed = self.genome.maximumSpeed;
}


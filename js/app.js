
var __id = 0;

var app = function() {

    var self = this;

    this.graphicsEngine = new graphicsEngine('boidUI', YBOUND, XBOUND);
    this.goals = [];
    this.drones = [];
    this.obstacles = [];
    this.goalType = null;
    this.physics = new physics(XBOUND,YBOUND);
    this.started = false;
    this.signalManager = new signalManager();

    PubSub.subscribe(CANVAS_MOUSE_DOWN, function(msg, data) {
        self.addGoal(data.x, data.y);
    });

};

app.prototype.start = function() {
    setupUIEvents.call(this);
    buildMap.call(this);
};

app.prototype.simulate = function(droneCount) {
    this.drones = [];
    this.started = true;
    //create drones
    createDrones.call(this,droneCount);

    this.signalManager.clearSignals();

    var self = this;

    this.iterations = 0;

    this.intervalToken = setInterval(function () {
        self.iterations++;

        _.each(self.drones, function(element) {
            var sensorReadings = checkSensorReadings.call(self,element);
            element.update(sensorReadings);
        });

        self.physics.update(self.drones);
        
        render.call(self);

        var goalsLeft = _.find(self.goals, function(element) { return element.goalType != GOAL_OBSTACLE});

        if(_.isUndefined(goalsLeft)) {
            PubSub.publish(END_SIMULATION, {});
        }


    }, 25);


    this.handle = PubSub.subscribe(END_SIMULATION, function(msg, data) {
        $('#results').append("<div>Iterations: " + self.iterations + "</div>");
        self.started = false;
        clearInterval(self.intervalToken);
        PubSub.unsubscribe(self.handle);
    });

};

function setupUIEvents() {
    var self = this;

    $('#goal-collect').click(function() {
        setGoalType.call(self, GOAL_COLLECT);
    });

    $('#goal-deposit').click(function() {
        setGoalType.call(self, GOAL_DEPOSIT);
    });

    $('#goal-map').click(function() {
        setGoalType.call(self, GOAL_MAP);
    });

    $('#goal-tag').click(function() {
        setGoalType.call(self, GOAL_TAG);
    });

    $('#add-obstacle').click(function() {
        addObstacle.call(self);
    });

    $('#cancel-goals').click(function() {
        self.goals = [];
        self.goalType = null;
        setGoalType.call(self, '');
        render.call(self);
    });

    $('#startLink').click(function() {

        if (!self.started) {
            var droneCount = parseInt($('#droneCountTxt').val());
            $('#startLink').text('End Simulation');
            self.simulate(droneCount);
        } else {
            $('#startLink').text("Start Simulation");
            PubSub.publish(END_SIMULATION, {});
        }


    });
}

function setGoalType(goalType) {
    this.goalType = goalType;

    $('.goal-options-container .button').removeClass('active');

    var buttonId = null;

    switch(goalType) {
        case GOAL_COLLECT:
            buttonId = "#goal-collect";
            break;
        case GOAL_DEPOSIT:
            buttonId = "#goal-deposit";
            break;
        case GOAL_MAP:
            buttonId = "#goal-map";
            break;
        case GOAL_TAG:
            buttonId = "#goal-tag";
            break;
    }

    if (buttonId == null) return;

    $(buttonId).addClass('active');
}

app.prototype.addGoal = function(xPos, yPos) {
    if(this.goalType == null) return;

    __id++;

    var self = this;

    this.goals.push({
        id: __id,
        goalType: self.goalType,
        x: xPos,
        y: yPos
    });

    render.call(this);
};

function render() {
    var geometry = [];

    //generate the geometry
    geometry = getGoalGeometry.call(this,geometry);
    geometry = getDroneGeometry.call(this,geometry);

    //pass geometry objects to graphics engine
    this.graphicsEngine.render(geometry);
}

function buildMap() {
    this.goalType = GOAL_OBSTACLE;
    for(var i = 0; i < 500; i+=10) {
        this.addGoal(i, 400);
    }
    for(i=0;i < 300; i+= 10) {
        this.addGoal(350, i);
    }

    this.goalType = GOAL_COLLECT;
    this.addGoal(670, 102);
    this.addGoal(681, 176);
    this.addGoal(689, 501);
    this.addGoal(102, 548);
    this.addGoal(179, 541);
    this.addGoal(721, 147);
    this.addGoal(719, 481);
    this.addGoal(737, 537);
    this.addGoal(75, 560);
}

function getGoalGeometry(geometry) {

    var releaseGeo = {
        x: 50,
        y: 50,
        geometry: GEO_SQUARE,
        radius: 150,
        fillColour: '#d1d1d1'
    };

    geometry.push(releaseGeo);

    _.each(this.goals, function(element) {
        var goalColour = "#000";
        var radius = 5;

        switch(element.goalType) {
            case GOAL_COLLECT: goalColour = GOAL_COLLECT_COLOUR; break;
            case GOAL_DEPOSIT: goalColour = GOAL_DEPOSIT_COLOUR; break;
            case GOAL_MAP: goalColour = GOAL_MAP_COLOUR; break;
            case GOAL_TAG: goalColour = GOAL_TAG_COLOUR; break;
            case GOAL_OBSTACLE: radius = OBSTACLE_RADIUS; break;
        }

        var goalGeo = {
            x: element.x,
            y: element.y,
            geometry: GEO_SQUARE,
            radius: radius,
            fillColour: goalColour
        };

        geometry.push(goalGeo);

    });

    return geometry;
}

function getDroneGeometry(geometry) {
    _.each(this.drones, function(element) {

        var color = "#000";
        if (element.hasGoal) color = "#0F0";

        var droneGeo = {
            x: element.x,
            y: element.y,
            orientation: element.theta,
            geometry: GEO_TRIANGLE,
            radius: 5,
            fillColour: color
        };

        geometry.push(droneGeo);

    });

    return geometry;
}

function createDrones(droneCount) {

    for(var i = 0; i < droneCount; i++) {
        var x = Math.floor(Math.random() * 200-25) + 50;
        var y = Math.floor(Math.random() * 200-25) + 50;
        var orientation = Math.random() * 2 * Math.PI;
        var speed = 1;

        __id++;

        var genomeTemplate = {
            speedDelta: Math.random(),
            orientationDelta: Math.random(),
            wanderSpeedProb: Math.random(),
            wanderOrientationProb: Math.random(),
            radioThreshold: RADIO_THRESHOLD * Math.random(),
            thresholdDistance: THRESHOLD_DISTANCE * Math.random(),
            emergencyStop: THRESHOLD_EMERGENCY_STOP * Math.random(),
            thresholdAngle:  Math.PI * Math.random(),
            maximumSpeed: MAXIMUM_SPEED * Math.random(),
            backwardsWait: BACKWARDS_WAIT * Math.random()
        };

        var newDrone = new drone(x,y,orientation,speed, genomeTemplate, this.signalManager);
        newDrone.id = __id;

        this.drones.push(newDrone);
    }

}

function checkSensorReadings(current) {
    var result = [];

    for (var j = 0; j < this.drones.length; j++) {
        var distance = distanceMetric.call(this, current, this.drones[j]);

        if (distance < SENSOR_RANGE && distance !== 0) {
            var dr = this.drones[j];
            var sense = createSensorReading(current, dr.x, dr.y, distance);
            result.push(sense);
        }
    }

    //push in the boundary inputs
    result.push(createSensorReading(current,0,current.y, null));
    result.push(createSensorReading(current,current.x,0, null));
    result.push(createSensorReading(current,XBOUND,current.y, null));
    result.push(createSensorReading(current,current.x,YBOUND, null));

    var goals = goalTracking.call(this, current);

    return result.concat(goals);
}

function goalTracking(current) {
    var result = [];

    for(var i = 0; i < this.goals.length; i++) {
        var sense = createSensorReading(current, this.goals[i].x, this.goals[i].y, null);
        sense.isGoal = true;
        sense.goalType = this.goals[i].goalType;
        sense.id = this.goals[i].id;

        if (this.goals[i].goalType == GOAL_OBSTACLE && sense.distance < SENSOR_RANGE + OBSTACLE_RADIUS) {
            sense.isGoal = false;
            sense.distance -= OBSTACLE_RADIUS;
            result.push(sense);
        } else if (sense.distance < THRESHOLD_EMERGENCY_STOP) {
            this.goals[i].id = null;
        } else if (sense.distance < SENSOR_RANGE) {
            result.push(sense);
        }

    }

    this.goals = _.reject(this.goals, function(element) { return element.id == null; });

    return result;
}

function createSensorReading(current,tx,ty, distance) {

    if (_.isNull(distance)) {
        distance = distanceMetric(current, {x: tx, y: ty});
    }

    var x = tx - current.x;
    var y = ty - current.y;
    var angle = Math.atan2(y,x);

    var sense = {distance: distance, angle: angle, isGoal: false};

    return sense;
}

function addObstacle() {
    $('.goal-options-container .button').removeClass('active');
    $('#add-obstacle').addClass('active');

    this.goalType = GOAL_OBSTACLE;
    
}

function distanceMetric(d1, d2) {

    var distanceSq1 = Math.pow(d1.x - d2.x, 2) + Math.pow(d1.y - d2.y, 2);
    //var distanceSq2 = Math.pow(boid1.x - boid2.x - this.xBound, 2) + Math.pow(boid1.y - boid2.y - this.yBound, 2);

    return Math.sqrt(distanceSq1);
}

var myApp = new app();
myApp.start();
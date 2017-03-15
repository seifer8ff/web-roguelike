/**
* The PlayState in the core state that is used in the game. 
*
* It is the state where majority of the functionality occurs 'in-game' occurs.
* 
*/


// DOT IS FLOOR. # IS WALL. 1 IS FLOOR. 2 IS WALL.

PlayState = new Kiwi.State('PlayState');

// font size
PlayState.tileSize = 96;

// map dimensions
PlayState.mapSize = 200;

// the structure of the map
PlayState.map;

// the graphical display, as a kiwi TileMap
PlayState.tileMap;

// the object that keeps track of turns
PlayState.scheduler;

// number of actors per level, including player
PlayState.numberOfActors = 15;

// a list of all actors, 0 is the player
PlayState.player;
PlayState.actorList;
PlayState.livingEnemies;

// points to each actor in its position, for quick searching
PlayState.actorMap;

// number of currently animating actors
PlayState.moving;



// keyboard controls
PlayState.left;
PlayState.right;
PlayState.up;
PlayState.down;
PlayState.w;
PlayState.a;
PlayState.s;
PlayState.d;


PlayState.initMap = function () {
	// create a new random map
	this.map = Kiwi.Plugins.MapGenerator.dungeonMap(this.mapSize);
	
	// walkability map for the smart ai
	var walkable  = [];
	for (var x = 0; x < this.mapSize; x++) {
		var newRow = [];
		for (var y = 0; y < this.mapSize; y++) {
			if(this.getTile(x,y)=='1')
				newRow.push(1);
			else 
				newRow.push(0);
		}
		walkable.push(newRow);
	}
		
	Kiwi.Plugins.AI.init(walkable, this.moveTo);
} 

PlayState.initScreen = function() {
	// init tile map
	this.tileMap = new Kiwi.GameObjects.Tilemap.TileMap(this);
	this.tileMap.setTo(this.tileSize,this.tileSize,this.mapSize,this.mapSize);
	
	// we have 204 types of tiles in our tile map (for now)
	for(var t=0; t<=204; t++) {
		this.tileMap.createTileType(t);
	}

	// new layer for the map itself
	var mapLayer = this.tileMap.createNewLayer('map', this.textures.tiles, undefined, undefined, undefined, 0, 0);
	//mapLayer.scaleX = 1;
	//mapLayer.scaleY = 1;
	this.addChild(mapLayer);

	for (var x = 0; x < this.mapSize; x++) {
		for (var y = 0; y < this.mapSize; y++) {
			/* 
			 * we don't need to redraw the TileMap every turn like the ascii map,
			 * instead we draw it once at initialization 
			 */
			var tile = this.getTile(x,y);
			if(tile=='1') { //floor
				mapLayer.setTile(x,y,86);
			} else if (tile=='2') { //wall
				mapLayer.setTile(x,y,18);
			}
		}
	}
}

// create player, enemies at random locations
PlayState.initEntities = function () {
	// create actors at random locations
	this.actorList = [];
	this.actorMap = {};
	for (var e = 0; e < this.numberOfActors; e++) {
		// create new actor
		var currentActor = new Actor(0, 0);
		
		if(e == 0) {
			// player
			currentActor.isPlayer = true;
			currentActor.damage = 2;
			currentActor.setMaxHp(5);
		} else {
			// enemies
			
			// Set the enemy's speed and AI based on chance
			var rand = Math.random();
			if(rand<1/3) {
				currentActor.ai = Kiwi.Plugins.AI.AiTypes.RANDOM;
				currentActor.speed = Phases.FAST;
				currentActor.damage = 1;
			} else if(rand<2/3) {
				currentActor.ai = Kiwi.Plugins.AI.AiTypes.SMART;
				currentActor.speed = Phases.SLOW;
				currentActor.damage = 1;
			} 
		}
		
		do {
			// pick a random position that is both a floor and not occupied
			currentActor.tileX = this.randomInt(this.mapSize);
			currentActor.tileY = this.randomInt(this.mapSize);
		} while (this.getTile(currentActor.tileX,currentActor.tileY) != '1' || this.actorMap[currentActor.tileX + "_" + currentActor.tileY] != null);

		// add references to the actor to the actors list & map
		this.actorMap[currentActor.tileX + "_" + currentActor.tileY] = currentActor;
		this.actorList.push(currentActor);
	}

	// the this.player is the first actor in the list
	this.player = this.actorList[0];
	this.livingEnemies = this.numberOfActors - 1;
}

// init the sprites  we used the graphical mode for all entities: actors, traps, loot, etc
PlayState.initEntitySprites = function() {	
	
	// actors
	for (var e = 0; e < this.numberOfActors; e++) {
		var actor = this.actorList[e];
		actor.sprite = new Kiwi.GameObjects.Sprite(this, this.textures.actors, actor.tileX*this.tileSize, actor.tileY*this.tileSize);
		
		// used the right sprite for each actor type
		if(actor.isPlayer) {
			// player sprite
			actor.sprite.cellIndex = 1;
		} else if(actor.ai == Kiwi.Plugins.AI.AiTypes.SIMPLE){
			// simple enemy
			actor.sprite.cellIndex = 217;
		} else if(actor.ai == Kiwi.Plugins.AI.AiTypes.RANDOM){
			// random enemy
			actor.sprite.cellIndex = 280;
		} else if(actor.ai == Kiwi.Plugins.AI.AiTypes.SMART){
			// smart enemy
			actor.sprite.cellIndex = 290;
		}
		
		this.addChild(actor.sprite);
	}
}

// draw all moving entities
PlayState.drawEntities = function() {
	
	for (var a in this.actorList) {
		var actor = this.actorList[a];
		if	(actor!=null && 
			(actor.sprite.tween==null || !actor.sprite.tween.isRunning) && 
			(actor.sprite.transform.x != actor.tileX*this.tileSize || actor.sprite.transform.y != actor.tileY*this.tileSize) ) {
				
				this.moving++;
				actor.sprite.tween = this.game.tweens.create(actor.sprite);
				actor.sprite.tween.to({x:actor.tileX*this.tileSize, y:actor.tileY*this.tileSize}, 120, Kiwi.Animations.Tweens.Easing.Sinusoidal.InOut);
				actor.sprite.tween.onComplete(this.moveEnded, this);
				actor.sprite.tween.start();
		}
	}
}

PlayState.canGo = function canGo(actor,dir) {
	return 	actor.tileX+dir.x >= 0 &&
			actor.tileX+dir.x <= this.mapSize - 1 &&
			actor.tileY+dir.y >= 0 &&
			actor.tileY+dir.y <= this.mapSize - 1 &&
			this.getTile(actor.tileX +dir.x, actor.tileY+dir.y) == '1';
}

PlayState.moveTo = function(actor, dir) {
	// we call this function from the AI plugin context
	var self = PlayState;
	
	// check if actor can move in the given direction
	if (!self.canGo(actor,dir)) {
		return false;
	}
	
	// moves actor to the new location
	var newKey = (actor.tileX + dir.x) +'_' + (actor.tileY + dir.y);
	// if the destination tile has an actor in it 
	if (self.actorMap[newKey] != null) {
		//decrement hitpoints of the actor at the destination tile
		var victim = self.actorMap[newKey];
		
		if(!actor.isPlayer && !victim.isPlayer) {
			// do nothing instead of enemy attacking other enemies
			return true;
		}
		
		victim.currentHp -= actor.damage;
		
		self.cleanUpDeadActor(victim);
	} else {
		// remove reference to the actor's old position
		self.actorMap[actor.tileX + '_' + actor.tileY]= null;
		
		// update position
		actor.tileX+=dir.x;
		actor.tileY+=dir.y;

		// add reference to the actor's new position
		self.actorMap[actor.tileX + '_' + actor.tileY]=actor;
		
	}
	
	// did the player die during self move?
	if (self.player.currentHp < 1 && self.alive) {
		self.alive = false;
		// game over message
		var text = new Kiwi.GameObjects.Textfield (self, 'Game Over', self.mapSize*self.tileSize/2, 130, '#e22', self.tileSize*1.5);
		text.textAlign = Kiwi.GameObjects.Textfield.TEXT_ALIGN_CENTER;
		self.addChild(text);
		text = new Kiwi.GameObjects.Textfield (self, 'tap to restart', self.mapSize*self.tileSize/2, 180, '#e22', self.tileSize);
		text.textAlign = Kiwi.GameObjects.Textfield.TEXT_ALIGN_CENTER;
		self.addChild(text);
	}
	
	return true;
}

PlayState.moveEnded = function() {
	this.moving--;
}

PlayState.enemiesTurn = function() {
	for (var enemy in this.actorList) {
		// skip the this.player
		if(enemy==0)
			continue;
		
		var e = this.actorList[enemy];
		if (e != null) {
			// we used actNext for enemies that act every other turn
			if(e.actNext==undefined) {
				e.actNext=false;
			}
			
			// speed difference between player and enemy - we only care about faster or slower
			if(this.player.speed>e.speed) {
				// enemy acts every other turn
				if(e.actNext)
					Kiwi.Plugins.AI.aiAct(e, this.player);
				e.actNext = !e.actNext;
				
			} else if(this.player.speed < e.speed) {
				// enemy acts twice per turn
				Kiwi.Plugins.AI.aiAct(e, this.player);
				Kiwi.Plugins.AI.aiAct(e, this.player);
				
			} else {
				// enemey acts once per turn
				Kiwi.Plugins.AI.aiAct(e, this.player);
			}
		}
	}
}

PlayState.cleanUpDeadActor = function(victim) {
	// we call this function from the AI plugin context
	var self = PlayState;
	
	// if it's dead remove its reference 
	if (victim.currentHp <= 0) {
		self.actorMap[victim.tileX +'_' + victim.tileY] = null;
		self.actorList[self.actorList.indexOf(victim)]=null;
		
		// splat
		victim.sprite.exists = false;
		victim.sprite = new Kiwi.GameObjects.Sprite(this, this.textures.fx, victim.tileX*this.tileSize, victim.tileY*this.tileSize);
		victim.sprite.cellIndex = 96;
		victim.sprite.x = victim.tileX * self.tileSize;
		victim.sprite.y = victim.tileY * self.tileSize;
		
		// render the splat below the other actors
		if(victim!=self.player) {
			self.removeChild(victim.sprite);
			self.addChildBefore(victim.sprite, self.player.sprite);
		}
		
		if(victim!=self.player) {
			self.livingEnemies--;
			if (self.livingEnemies == 0) {
				self.alive = false;
				
				// victory message
				var text = new Kiwi.GameObjects.Textfield (self, 'Victory!', self.mapSize*self.tileSize/2, 130, '#2e2', self.tileSize*1.5);
				text.textAlign = Kiwi.GameObjects.Textfield.TEXT_ALIGN_CENTER;
				self.addChild(text);
				text = new Kiwi.GameObjects.Textfield (self, 'tap to restart', self.mapSize*self.tileSize/2, 180, '#2e2', self.tileSize);
				text.textAlign = Kiwi.GameObjects.Textfield.TEXT_ALIGN_CENTER;
				self.addChild(text);
			}
			
			// get xp
			self.player.xp++;
			if(self.player.xpToNext==self.player.xp) {
				// level up! we heal the player & increase their max-hp
				self.player.setMaxHp(self.player.maxHp + 2);
				
				// it takes double the xp to reach the next level
				self.player.xp = 0;
				self.player.xpToNext *= 2;
			}
		}
	}
}

// prcess keyboard input, called by update()
PlayState.processKeyboardInput = function() {
	if(this.moving>0) {
		// don't move while sprites are still animating
		return false;
	}
	
	var acted = false;
	
	// act at key-down. because of the animation check this doesn't trigger multiple moves
	if (this.left.isDown || this.a.isDown){
		acted = this.moveTo(this.player, {x:-1, y:0});
	} else if (this.right.isDown || this.d.isDown){
		acted = this.moveTo(this.player,{x:1, y:0});
	} else if (this.up.isDown || this.w.isDown){
		acted = this.moveTo(this.player, {x:0, y:-1});
	} else if (this.down.isDown || this.s.isDown){
		acted = this.moveTo(this.player, {x:0, y:1});
	}
	
	return acted;
}

// process mouse/touch input, called by onTap()
PlayState.processMouseInput = function(x,y) {
	if(this.moving>0) {
		// don't move while sprites are still animating
		return false;
	}
	
	// calculate which tile the user tapped
	var tileX = Math.floor(x/this.tileSize);
	var tileY = Math.floor(y/this.tileSize);
	if (tileX>5)
		tileX = this.player.tileX+(tileX-5);
	else if (tileX<5)
		tileX = this.player.tileX-(5-tileX);
	else tileX = this.player.TileX;

	if (tileY>5)
		tileY = this.player.tileY+(tileY-5);
	else if (tileY<5)
		tileY = this.player.tileY-(5-tileY);
	else tileY = this.player.TileY;

	// decide direction according to location relative to player
	var dir = {x:0, y:0};
	var dx = tileX - this.player.tileX;
	var dy = tileY - this.player.tileY;	
	if(Math.abs(dx)> Math.abs(dy)) {
		// move in x axis
		if(dx<0) {
			dir.x = -1;
		} else {
			dir.x = 1;
		}
	} else {
		// move in y axis
		if(dy<0) {
			dir.y = -1;
		} else {
			dir.y = 1;
		}
	}
	
	// return whether the move succeed
	return this.moveTo(this.player, dir);
}

// the tile in position x,y in the map
PlayState.getTile = function(x,y) {
	if (PlayState.map) {
	return PlayState.map[x][y];
	}
}
PlayState.setTile = function(x,y, t) {
	PlayState.map[x][y]=t;
}

PlayState.randomInt = function(max) {
	return Math.floor(Math.random() * max);
}





PlayState.create = function () {
	var windowWidth = window.innerWidth;
	var windowHeight = window.innerHeight;
	windowWidth = windowWidth * 1;
	windowHeight = windowHeight * 1;
	//this.game.stage.resize(windowWidth, windowHeight;

	this.resetting = false;
	this.moving = 0;
	this.alive = true;

	// init keyboard commands
	this.left = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.LEFT);
	this.right = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.RIGHT);
	this.up = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.UP);
	this.down = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.DOWN);
	this.a= this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.A);
	this.d= this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.D);
	this.w = this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.W);
	this.s= this.game.input.keyboard.addKey(Kiwi.Input.Keycodes.S);
	
	// init mouse controls
	this.game.input.onUp.add(this.onTap, this);
	

	this.initMap();
	this.initScreen();
	this.initEntities();
	this.initEntitySprites();

	this.game.cameras.defaultCamera.transform.x = -1 * this.player.sprite.x + this.game.stage.width * 0.5 - (this.player.sprite.width * 0.5);
	this.game.cameras.defaultCamera.transform.y = -1 * this.player.sprite.y + this.game.stage.height * 0.5 - (this.player.sprite.height * 0.5);

	this.scheduler = new Scheduler();


	this.game.cameras.defaultCamera.transform.scale = 1;
	//this.game.cameras.defaultCamera.width = 200;
	//this.game.cameras.defaultCamera.height = 160;

	this.game.stage.ctx.imageSmoothingEnabled = false;
}


PlayState.update = function () {
	try {
		Kiwi.State.prototype.update.call(this);

		if(this.alive) {
			this.scheduler.processTurns();
			// draw actors in new positions
			//this.drawEntities();
		}

		// Set the cameras position to that of the player.
		var playerOffsetX = this.player.sprite.width * 0.5;
		var playerOffsetY = this.player.sprite.height * 0.5;
		this.game.cameras.defaultCamera.transform.x = -1 * this.player.sprite.x + this.game.stage.width * 0.5 - playerOffsetX;
		this.game.cameras.defaultCamera.transform.y = -1 * this.player.sprite.y + this.game.stage.height * 0.5 - playerOffsetY;

	} catch(err){

	}

	
}

// called by kiwi upon mouse/touch events
PlayState.onTap = function (x,y) {	
	if(this.resetting || x>this.mapSize*this.tileSize) {
		return;
	}	
	
	// if(!this.alive) {
	// 	this.reset();
	// 	return;
	// }

	if(this.alive) {
		if (this.scheduler.isPlayerTurn()) {
			// act on player input
			this.scheduler.processTurns(x,y);
		}
	}
}


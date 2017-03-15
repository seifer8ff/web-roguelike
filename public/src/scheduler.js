//enum
Phases = { // refers to remainder after dividing currentTurn by number of phases
	FAST : 0,
	NORMAL : 1,
	SLOW : 2,
}


var Scheduler = function () {
    this.totalPhases = Object.keys(Phases).length;
    this.turn = this.totalPhases;


    this.processTurns = function (tapX, tapY) {
        for (var e = 0; e < PlayState.numberOfActors; e++) {
            var actor = PlayState.actorList[e];

            if (actor == null) continue;

            if(actor.speed == this.turn%this.totalPhases) {
                // process the actors turn. If player, get input and act. If enemy, call their AI
                if (actor.isPlayer) {
                    if (tapX || tapY) {
                        var acted = PlayState.processMouseInput(tapX,tapY);
                    } else {
                        var acted = PlayState.processKeyboardInput();
                    }
                    if (!acted) return;
                }
                else {
                    Kiwi.Plugins.AI.aiAct(actor, PlayState.player);
                }
            }
            if (e==PlayState.numberOfActors-1) {
                // if all actors have had their turn, draw actors in new positions
                if (PlayState.moving == 0) {
                    PlayState.drawEntities();
                }
            }
        }

        // Once all actors have moved, increment turn
        this.turn++;
        return;
    };

    this.isPlayerTurn = function () {
            if(PlayState.player.speed == this.turn%this.totalPhases) {
               return true; 
            } else {
                return false
            }
    };

}
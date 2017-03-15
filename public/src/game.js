//Initialise the Kiwi Game. 

var gameOptions = {
	renderer: Kiwi.RENDERER_CANVAS,
	width: window.innerWidth * 1,
	height: window.innerHeight * 1
	//scaleType: Kiwi.Stage.SCALE_FIT
}

var game = new Kiwi.Game('content', 'RoguelikeGame', null, gameOptions);


//Add all the States we are going to use.
game.states.addState(Preloader);
game.states.addState(LoadingState);
game.states.addState(IntroState);
game.states.addState(PlayState);


//Switch to/use the Preloader state. 
game.states.switchState("Preloader");
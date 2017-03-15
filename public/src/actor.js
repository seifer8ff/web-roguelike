
var Actor = function (xLocation, yLocation) {
    this.tileX = xLocation;
    this.tileY = yLocation;
    this.isPlayer = false;
    this.maxHp = 3;
    this.currentHp = this.maxHp;
    this.damage = 1;
    this.ai = Kiwi.Plugins.AI.AiTypes.SIMPLE;
    this.speed = Phases.NORMAL;
    this.xp = 0;
    this.xpToNext = 4;
    this.level = 0;
    this.sprite = null;
    this.splatSprite = null;

    this.setMaxHp = function (newHp) {
        this.maxHp = newHp;
        this.currentHp = this.maxHp;
    };

}
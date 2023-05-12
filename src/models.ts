import { AsyncSubject, BehaviorSubject, Observable, Subject } from "rxjs";
import { connectableObservableDescriptor } from "rxjs/internal/observable/ConnectableObservable";
import { mapSize, objectSize, tileSize } from "./constant";
import { game } from "./main";
import { checkFrogMovementCollision, checkTerrainWalkable, validateFrogCollision } from "./util";
import {Difficulty, Direction, Terrain as TerrainEnum} from "./enum"

let counter = 0;
export class Game {    
    public lives:number = 5;
    public score:number = 0;
    public difficulty:number = Difficulty.Easy;
    public subject:BehaviorSubject<Game>;

    constructor(public frog:Frog, public terrain:Array<Terrain>){
        this.subject = new BehaviorSubject<Game>(this);
    }

    respawn(){
        if(this.lives > 0){            
            this.frog.resetLocation();
            this.lives -= 1;
            this.subject.next(this)
        }        
        else{
            const restart = confirm("Game Over, you dont have any lives. Try again?");
            if(restart){
               this.restart();
            }
        }       
    }

    restart(){
        this.lives = 5;
        this.score = 0;                
        this.frog.resetLocation();
        this.terrain[0].objects.filter((item) => item instanceof FinishTile).forEach(item => {            
            (item as FinishTile).isFinish = false;
            (item as FinishTile).subject.next(item);
        })
        this.subject.next(this)
    }

    checkGoal():boolean{
        const gameEnd = this.terrain[0].objects.filter((item) => item instanceof FinishTile).reduce((isFinish,finishTile) => {
            if(!isFinish){
                return isFinish;
            }
            return (finishTile as FinishTile).isFinish;
        },true) //Finish Line Row

        if(gameEnd){
            alert(`Congratulation! you have dominate level ${this.difficulty}.`)
            this.difficulty++;
            game.subject.next(this);
            game.restart();
        }
        return gameEnd
    }
}

export class Position {
    public x:number = 0;
    public y:number = 0;
  
    constructor(posX:number, posY:number){
      this.x = posX;
      this.y = posY;      
    }
    
    toString(){
        return `X:${this.x},Y:${this.y}`;
    }

    isEqual(pos:Position){
        return this.x == pos.x && this.y == pos.y;
    }
  }

export class Terrain{
    public subject:Subject<MovingObject>;
    constructor(public id:number, public type:number,public paint:string,public desc:string,public speed:number, public direction:Direction, public objects:Array<MovingObject>){
        this.subject = new Subject<MovingObject>();
    }
    
    objectToElement(svg:SVGElement):Array<Element>{        
        return this.objects.map((obj) => obj.toElement(svg));
    }

    toElement(svg:SVGElement,attribute?:Object,style?:string):Element{
        const obj = document.createElementNS(svg.namespaceURI, "rect");

      
        // obj.setAttribute("r", `${25}`);
        obj.setAttribute("x", "0");        
        obj.setAttribute("width", "550");        
        obj.setAttribute("fill", this.paint); 
        obj.setAttribute("height", tileSize.toString()); 
        if(attribute){
            for(let attr of Object.entries(attribute)){
                let [key,val] = attr;
                obj.setAttribute(key,val);
            }
        }        
        if(style){
            obj.setAttribute(
                "style",
                style
            );
        }
     
        return obj;
    }
}

export class Frog{
    public curPosition:Position;
    public ridePlatform?:Platform; //Platform that the frog lay on
    private element?:Element;

    constructor(curPosition:Position){
        this.curPosition = curPosition        
    }

    initObserver(element:Element):Subject<Position>{
        const subject = new Subject<Position>();
        subject.subscribe({
            next:(pos) => {
                this.curPosition = pos
                this.updateLocation();                
            }
        })
        return subject;
        
    }

    validateInvalidLocation(){
        let [isSafe,hasCollision] = validateFrogCollision(game);        
        if(!isSafe){            
            game.respawn();
        }
    }
    resetLocation(){
        this.ridePlatform = undefined
        this.curPosition = new Position(250,500);
        this.updateLocation();
    }

    updateLocation(){
        if(this.element){           
            this.element.setAttribute("cx", `${this.curPosition.x + objectSize}`);
            this.element.setAttribute("cy", `${this.curPosition.y + objectSize}`);  
            if(this.curPosition.x >= mapSize){
                game.respawn();
            }
        }
    }

    toElement(svg:Element):[Element,Subject<Position>]{
        const circle = document.createElementNS(svg.namespaceURI, "circle");
        circle.setAttribute("r", `${objectSize}`);
        circle.setAttribute("cx", `${this.curPosition.x + objectSize}`);
        circle.setAttribute("cy", `${this.curPosition.y + objectSize}`);  
        circle.setAttribute(
          "style",
          "fill: green; stroke: green; stroke-width: 1px;"
        );
        this.element = circle
        const observer = this.initObserver(circle);
        return [circle,observer];
    }
}

export class MovingObject{
    public id:number;
    public startPosition:Position;
    public endPosition:Position;  
    public speed:number; //0 to 1
    public direction:Direction;
    public isPassed:boolean = false;
    public subject:Subject<MovingObject>;

    constructor(start:Position, end:Position, speed:number=0,direction:Direction=Direction.Right){
        this.startPosition = start;
        this.endPosition = end;
        this.speed = speed;        
        this.subject = new Subject<MovingObject>();
        this.direction = direction
        this.id = counter;
        counter++;
    }

    //speed is 1sec/xBlock travel
    initMovement(element:Element){
        if(this.speed > 0){                      
            const observable = new Observable((subscriber) => {
                // const movement = (this.speed * tileSize)
                const moveEvent = setInterval(() => {                    
                    let diff = this.endPosition.x - this.startPosition.x
                    let newStart; 
                    let newEnd; 
                    if(this.direction == Direction.Right){
                        newStart = this.startPosition.x + tileSize
                        newEnd = newStart + diff
                        // let newEnd = parseInt((this.endPosition.x + (this.endPosition.x * this.speed)).toFixed(0))                
                        if(newEnd >= 550 + this.endPosition.x - this.startPosition.x){
                            // clearInterval(moveEvent)
                            const size = this.endPosition.x - this.startPosition.x;
                            newStart = 0
                            newEnd = size;                        
                            
                            // this.isPassed = true    
                        
                            // subscriber.complete();              
                        }           
                        subscriber.next({
                            newStart,
                            newEnd
                        })
                    }     
                    else{
                        newEnd = this.endPosition.x - tileSize
                        newStart = newEnd - diff

                        // let newEnd = parseInt((this.endPosition.x + (this.endPosition.x * this.speed)).toFixed(0))                
                        if(newEnd <= 0){
                            // clearInterval(moveEvent)
                            const size = this.endPosition.x - this.startPosition.x;
                            newEnd = 550
                            newStart = 550 - size;                                                            
                        }           
                        subscriber.next({
                            newStart,
                            newEnd
                        })
                    }              
                    // this.startPosition.x = newStart
                    // this.endPosition.x = newEnd                
                    // element.setAttribute("x",this.startPosition.x.toString());                
                    // console.log(newEnd);
                   
                },1000 / (this.speed * game.difficulty))
            })      
            
            const subscription = observable.subscribe({
                next: x => {                    
                    if(typeof x == "object"){
                        let payload = x as Record<string,number>   
                        const preStartPos = this.startPosition;
                        const preEndPos = this.endPosition;

                        this.startPosition = new Position(payload.newStart,preStartPos.y)
                        this.endPosition = new Position(payload.newEnd,preEndPos.y)

                        element.setAttribute("x",this.startPosition.x.toString());  
                        this.onMove(preStartPos,preEndPos);      
                    }
                },
                error:err => console.error(err),
                // complete:() => {      
                //     subscription.unsubscribe()   
                //     element.remove()           
                //     this.subject.next(this)                    
                // },
            })
        }        
    }

    isFrogHere(pos:Position):boolean{
        const startPos = this.startPosition
        const endPos = this.endPosition
        // console.log("Start",this.startPosition.toString(),"End",this.endPosition.toString(),"Frog",pos.toString())
        if(startPos.isEqual(endPos)){            
            return pos.x == startPos.x && pos.y == startPos.y
        }
        else{
            if(startPos.x == endPos.x){
                return pos.x == startPos.x && pos.y >= startPos.y && pos.y < endPos.y
            }
            else if(startPos.y == endPos.y){              
                return (pos.x >= startPos.x && pos.x < endPos.x && pos.y == startPos.y) //|| startPos.isEqual(pos) || endPos.isEqual(pos)
            }            
            return pos.x >= startPos.x && pos.x < endPos.x && pos.y >= startPos.y && pos.y < endPos.y;         
        }                   
    }

    isLose():boolean{
        return true;
    }

    onCollide():void{
        if(this.isLose()){
            game.respawn();
        }
    }

    onMove(preStart:Position,preEnd:Position):void{
        return;
    }
    
    onLeave():void{
        return;
    }

    toElement(svg:SVGElement):Element{
        const obj = document.createElementNS(svg.namespaceURI, "rect");

        let width = this.endPosition.x - this.startPosition.x;
        width = width > 0 ? width : tileSize;
        let height = this.endPosition.y - this.endPosition.y;
        height = height > 0 ? height : tileSize

        // obj.setAttribute("r", `${25}`);         
        obj.setAttribute("x", `${this.startPosition.x}`);
        obj.setAttribute("y", `${this.startPosition.y}`); 
        obj.setAttribute("width", width.toString());
        obj.setAttribute("height", height.toString());        

        this.initMovement(obj);        
        
        return obj;
    }
}

export class Platform extends MovingObject{

    public frog?:Frog;

    constructor(start:Position,end:Position,speed:number=0,direction:Direction=Direction.Left,frog?:Frog){
        super(start,end,speed,direction);
        this.frog = frog;
    }

    toElement(svg: SVGElement): Element {
        const element = super.toElement(svg);
        element.setAttribute(
            "style",
            `fill: brown; stroke: brown; stroke-width: 1px;`
        );
        return element;
    }

    isLose(): boolean {
        return false;
    }

    onMove(preStart:Position,preEnd:Position):void{
        if(game.frog.ridePlatform){
            if(game.frog.ridePlatform === this){
                if(this.direction == Direction.Right){
                    game.frog.curPosition.x += tileSize                            
                }
                else{
                    game.frog.curPosition.x -= tileSize
                }
                game.frog.updateLocation();                                
            }
        }
        // if(this.frog){
        //     const startPos = preStart;
        //     const endPos = preEnd;
            
        //     const nowStart = this.startPosition;
        //     const nowEnd = this.endPosition;
        //     // if(this.frog.curPosition.x >= startPos.x && this.frog.curPosition.x < endPos.x && this.frog.curPosition.y == startPos.y && this.frog.curPosition.y == endPos.y){
        //     //     console.log("Meet Pre Requirement")
        //     //     this.frog.curPosition.x += tileSize            
        //     //     this.frog.updateLocation();
        //     // }
        //     if(this.frog.curPosition.x >= nowStart.x && this.frog.curPosition.x < nowEnd.x && this.frog.curPosition.y == nowStart.y && this.frog.curPosition.y == nowEnd.y){
        //         console.log("Meet Now Requirement")
        //         this.frog.curPosition.x += tileSize            
        //         this.frog.updateLocation();
        //     }
        //     else{                
        //         //Check Tile
        //         const row = this.frog.curPosition.y / 50  
        //         const currentPosition = this.frog.curPosition;              
        //         // const isSafe = checkTerrainWalkable(game.terrain[row])
        //         // if(!isSafe){
        //         //     //Check is move to another tile
        //         //     // Filter by not walkable terrain
        //         //     const isExist = game.terrain.filter((tr) => tr.type ==  TerrainEnum.River).map((tr) => tr.objects).reduce((isExistInTerrain,objects) => {
        //         //         if(isExistInTerrain){
        //         //             return isExistInTerrain
        //         //         }
        //         //         //First reduce check this row's objects have frog
        //         //         return objects.reduce((isExist,obj) => {
        //         //             //Second reduce check this object have frog
        //         //             if(isExist){
        //         //                 return isExist
        //         //             }
        //         //             return obj.isFrogHere(currentPosition)
        //         //         },false)                                                                                                
        //         //     },false)
        //         //     console.log("Exist",isExist)
        //         //     if(!isExist){
        //         //         game.respawn();                  
        //         //     }                    
        //         // }                     
        //         this.frog = undefined
        //     }        
        // }
    }
}

export class FinishTile extends MovingObject{
    public isFinish = false;
    constructor(start:Position,end:Position){
        super(start,end,0);        
    }

    initObserver(element:Element){        
        this.subject.subscribe({
            next:(object) => {
                if(object instanceof FinishTile){
                    this.isFinish = object.isFinish;
                    if(!this.isFinish){
                        element.setAttribute(
                            "style",
                            `fill: yellow; stroke: yellow; stroke-width: 1px;`
                        );
                    }
                    else{
                        game.score += game.lives * 10;
                        game.subject.next(game)                        
                        element.setAttribute(
                            "style",
                            `fill: green; stroke: green; stroke-width: 1px;`
                        );                           
                        const isEnd = game.checkGoal();
                        if(!isEnd){
                            game.frog.resetLocation()
                        }      
                    }                    
                }                
            },
            // complete:() => {
            //     element.setAttribute(
            //         "style",
            //         `fill: green; stroke: green; stroke-width: 1px;`
            //     );
            //     this.isFinish = true;      
            //     const isEnd = game.checkGoal();
            //     if(!isEnd){
            //         game.frog.resetLocation()
            //     }                
            // }
        })        
    }

    toElement(svg: SVGElement): Element {
        const element = super.toElement(svg);
        element.setAttribute(
            "style",
            `fill: yellow; stroke: yellow; stroke-width: 1px;`
        );
        this.initObserver(element);
        return element;
    }

    isLose(): boolean {
        return false;
    }
}

export class Obstruct extends MovingObject{
    isLose(): boolean {
        return true;
    }

    onCollide(): void {
        super.onCollide();
    }

    onMove(preStart:Position,preEnd:Position):void{
        const frogPos = game.frog.curPosition
        const nowStart = this.startPosition
        const nowEnd = this.endPosition
        if(nowStart.y == frogPos.y){
            if(frogPos.x >= nowStart.x  && frogPos.x < nowEnd.x ){
                game.respawn();
            }
        }        
    }

    toElement(svg: SVGElement): Element {
        const element = super.toElement(svg);
        element.setAttribute(
            "style",
            `fill: red; stroke: red; stroke-width: 1px;`
        );
        return element;
    }
}
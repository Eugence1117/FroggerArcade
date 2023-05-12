import { tileSize } from "./constant"
import { Difficulty, Direction, Terrain as TerrainEnum } from "./enum"
import { FinishTile, Frog, Game, MovingObject, Obstruct, Platform, Position, Terrain } from "./models"

export function generateTerrain(index:number,type:TerrainEnum,speed:number,direction:Direction,objects:Array<MovingObject>){
    switch(type){
        case TerrainEnum.River:
            return new Terrain(index,type,"blue","River",speed,direction,objects)
        case TerrainEnum.Ground:
            return new Terrain(index,type,"black","Ground",speed,direction,objects)
        case TerrainEnum.SafeZone:
            return new Terrain(index,type,"indigo","Safe Zone",speed,direction,objects)
        case TerrainEnum.FinishLine:
            return new Terrain(index,type,"yellow","Finish",speed,direction,objects)
    }    
}


// export function generateRandomObject(type:TerrainEnum,row:number,speed:number,diffulty:Difficulty){
//     switch(type){        
//         case TerrainEnum.River:
//             return new Platform(new Position(0,row * tileSize),new Position(randomNumber(1,2) * tileSize,row * tileSize),speed * diffulty);            
//         case TerrainEnum.Ground:
//             return new Obstruct(new Position(0,row * tileSize),new Position(randomNumber(1,2) * tileSize,row * tileSize),speed * diffulty);            
//         default:
//             return null;
//     }

// }

export function checkTerrainWalkable(terrain:Terrain){
    switch(terrain.type){
        case TerrainEnum.River:
            return true;
        default:
            return true;
    }
}

export function checkFrogMovementCollision(frog:Frog,newPosition:Position,obstructs:Array<Array<MovingObject>>){

    const currentRow = newPosition.y > 0 ? newPosition.y / 50 : 0

    let objects = obstructs[currentRow]
    frog.ridePlatform = undefined; 
    for(let obj of objects){              
        if(isCollide(newPosition,obj)){
            if(obj instanceof Platform){    
                frog.ridePlatform = obj                            
            }            
            if(obj instanceof FinishTile){
                const finishTile = (obj as FinishTile)
                if(!finishTile.isFinish){
                    finishTile.isFinish = true
                    finishTile.subject.next(finishTile);
                }                
                return [true,true,false]
            }
            if(obj.isLose()){          
                return [!obj.isLose(),true];          
            }
            return [true,true,true]
        }else{
            // if(obj instanceof Platform){                
            //     obj.frog = undefined;
            //     frog.ridePlatform = undefined;
            //     console.log("Reset to undefined")  
            // }   
        }
    }
    //0=isSage,1=hasCollision,2=updatePosition
    return [true,false,true]
}

export function validateFrogCollision(game:Game){

    const currentRow = game.frog.curPosition.y > 0 ? game.frog.curPosition.y / 50 : 0
    
    let objects = game.terrain[currentRow].objects
    for(let obj of objects){      
        if(isCollide(game.frog.curPosition,obj)){
            if(obj instanceof Platform){                
                obj.frog = game.frog;                
            }                        
            if(obj.isLose()){          
                return [!obj.isLose(),true];          
            }
            return [true,true]
        }else{
            if(obj instanceof Platform){                
                obj.frog = undefined;
            }   
        }
    }
    //0=isSage,1=hasCollision
    return [true,false]
}  

export function isCollide(curPosition:Position,object:MovingObject){    
    return object.isFrogHere(curPosition);
}


export function setupMovingObject(direction:Direction,type:TerrainEnum,row:number,speed:number){    
    const yAxis = row * tileSize;
    switch(type){        
        case TerrainEnum.River:            
            switch(row){
                case 1:                    
                // 3,-2,2,-2,2
                    return [
                        new Platform(new Position(50,yAxis), new Position(200,yAxis),speed,direction),
                        new Platform(new Position(300,yAxis), new Position(400,yAxis),speed,direction),
                        new Platform(new Position(500,yAxis), new Position(550,yAxis),speed,direction),
                    ]
                case 2:
                    //2,-3,2,-2,2
                    return [
                        new Platform(new Position(0,yAxis), new Position(150,yAxis),speed,direction),
                        new Platform(new Position(200,yAxis), new Position(300,yAxis),speed,direction),
                        new Platform(new Position(400,yAxis), new Position(450,yAxis),speed,direction),
                    ]
                case 3:
                    return [
                        new Platform(new Position(50,yAxis), new Position(100,yAxis),speed,direction),
                        new Platform(new Position(200,yAxis), new Position(250,yAxis),speed,direction),
                        new Platform(new Position(300,yAxis), new Position(350,yAxis),speed,direction),
                        new Platform(new Position(450,yAxis), new Position(500,yAxis),speed,direction),                        
                    ]
                case 4:
                    return [
                        new Platform(new Position(0,yAxis), new Position(150,yAxis),speed,direction),
                        new Platform(new Position(200,yAxis), new Position(300,yAxis),speed,direction),
                        new Platform(new Position(400,yAxis), new Position(450,yAxis),speed,direction),
                    ]
                default:
                    []
            }
        case TerrainEnum.Ground:            
            switch(row){                               
                case 6:
                    // 3 Truck Two Block Size, Gap Between 2,2,1
                    return [
                        new Obstruct(new Position(0,yAxis), new Position(100,yAxis),speed,direction),
                        new Obstruct(new Position(200,yAxis), new Position(300,yAxis),speed,direction),
                        new Obstruct(new Position(350,yAxis), new Position(450,yAxis),speed,direction),
                    ]
                case 7:

                case 8:
                    // 4 Car One Block Size, Gap Between 2,2,2
                    return [                        
                        new Obstruct(new Position(100,yAxis),new Position(150,yAxis),speed,direction),                        
                        new Obstruct(new Position(250,yAxis),new Position(300,yAxis),speed,direction),                        
                        new Obstruct(new Position(400,yAxis),new Position(450,yAxis),speed,direction),                                                
                    ]
                case 9:
                    //3 Car One Block Size, Gap Between 2,3,4
                    return [
                        new Obstruct(new Position(0,yAxis),new Position(50,yAxis),speed,direction),
                        new Obstruct(new Position(150,yAxis),new Position(200,yAxis),speed,direction),
                        new Obstruct(new Position(400,yAxis),new Position(450,yAxis),speed)
                    ]
                default:
                    []
            }
        default:
            return [];        
    }
}

export function isBlocked(objs:Array<MovingObject>, newObj:MovingObject,gap=2){
    const gapBetween = tileSize * gap    
    return objs.reduce((isBlocked,item) => {        
        if(isBlocked){
            return isBlocked;
        }
        if(item.isPassed){
            return !item.isPassed;
        }
        const itemStartX = item.startPosition.x
        const itemEndX = item.endPosition.x
        const objStartX = newObj.startPosition.x
        const objEndX = newObj.endPosition.x + gapBetween        
        console.log((objStartX >= itemStartX && objStartX < itemEndX || objEndX >= itemStartX && objEndX < itemEndX))
        return (objStartX >= itemStartX && objStartX < itemEndX || objEndX >= itemStartX && objEndX < itemEndX)
        
        // return (objStartX >= itemStartX && objEndX < itemEndX && newObj.startPosition.y == item.startPosition.y && newObj.endPosition.y == item.endPosition.y)        
    },false)
}

export function randomNumber(min:number,max:number):number{
    return Math.floor((Math.random() * max) + min)
}
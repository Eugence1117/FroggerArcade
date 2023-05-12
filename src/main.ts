import "./style.css";
import { fromEvent, Observable} from "rxjs";
import { tileSize, objectSize, mapSize } from "./constant";
import { FinishTile, Frog, Game, MovingObject, Obstruct, Platform, Position, Terrain } from "./models";
import {Difficulty, Direction, Terrain as TerrainEnum} from "./enum";
import { checkFrogMovementCollision , checkTerrainWalkable, generateTerrain, isBlocked, randomNumber, setupMovingObject } from "./util";

let frog = new Frog(new Position(250,500))   

export let game:Game;
function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */
  

  const objectList = new Array<Array<MovingObject>>()
  const mapType:Array<Terrain> = [];

  game = new Game(frog,mapType);

  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;
  svg.style.width = mapSize.toString();
  svg.style.height = (mapSize + 100).toString();

  const livesIndicator = document.createElementNS(svg.namespaceURI,"text")  
  livesIndicator.setAttribute("y",(mapSize + 75).toString())
  livesIndicator.setAttribute("x","25")
  livesIndicator.setAttribute("fill","white")

  const scoreIndicator = document.createElementNS(svg.namespaceURI,"text")
  scoreIndicator.setAttribute("y",(mapSize + 75).toString())
  scoreIndicator.setAttribute("x","525")  
  scoreIndicator.setAttribute("text-anchor","end")
  scoreIndicator.setAttribute("fill","white")
  const levelIndicator = document.createElementNS(svg.namespaceURI,"text")
  levelIndicator.setAttribute("y",(mapSize + 50).toString());
  levelIndicator.setAttribute("x",(550 / 2).toString());
  levelIndicator.setAttribute("text-anchor","middle")
  levelIndicator.setAttribute("fill","white")

  game.subject.subscribe({
    next:(game)=> {
      livesIndicator.innerHTML = `Remaining Lives : ${game.lives}`
      scoreIndicator.innerHTML = `Scores : ${game.score}`
      levelIndicator.innerHTML = `Level ${game.difficulty}`
    }
  })  

  svg.appendChild(scoreIndicator)
  svg.appendChild(livesIndicator)
  svg.appendChild(levelIndicator)
  
  
  //Setup Map
  for(let index = 0 ; index < 11; index++){
    //First 5 River    
    let objs = new Array<MovingObject>();
    objectList[index] = objs


    let terrain = index >= 1 && index < 5 ? TerrainEnum.River : index == 5 || index == 10 ? TerrainEnum.SafeZone : index == 0 ? TerrainEnum.FinishLine : TerrainEnum.Ground;    
    const terrainSpeed = randomNumber(1,2.5)    
    const direction = index % 2 == 0 ? Direction.Left : Direction.Right
    const movingObjs = setupMovingObject(direction,terrain,index,terrainSpeed) || []
    objs.push(...movingObjs);    

    //Build Finish Tile On Index 0
    if(index == 0){
      const finishTiles = [
        new FinishTile(new Position(50,0),new Position(100,0)),
        new FinishTile(new Position(150,0),new Position(200,0)),
        new FinishTile(new Position(250,0),new Position(300,0)),
        new FinishTile(new Position(350,0),new Position(400,0)),
        new FinishTile(new Position(450,0),new Position(500,0)),
      ]
      objs.push(...finishTiles)
    }

    const map:Terrain = generateTerrain(index,terrain,terrainSpeed,direction,objs)     
    mapType.push(map);
    
    const attr = {
      "y":(tileSize * index).toString()
    }    
    

    svg.appendChild(map.toElement(svg,attr))
    svg.append(...map.objectToElement(svg))
  }

  //Generate Collision Object
  
  //11 Row  
  //Safe Zone Wall
  // 5 Frog Required, so fill remaining 5 with wall  
  //total 425   
  let row0:Array<MovingObject> = objectList[0];

  let wall:Obstruct;
  wall = new Obstruct(new Position(0,0),new Position(50,tileSize))   
  svg.appendChild(wall.toElement(svg));      
  row0.push(wall)
  wall = new Obstruct(new Position(100,0),new Position(150,tileSize))   
  svg.appendChild(wall.toElement(svg));    
  row0.push(wall)
  wall = new Obstruct(new Position(200,0),new Position(250,tileSize))   
  svg.appendChild(wall.toElement(svg));    
  row0.push(wall)
  wall = new Obstruct(new Position(300,0),new Position(350,tileSize))
  svg.appendChild(wall.toElement(svg));    
  row0.push(wall)  
  wall = new Obstruct(new Position(400,0),new Position(450,tileSize))
  svg.appendChild(wall.toElement(svg));    
  row0.push(wall)
  wall = new Obstruct(new Position(500,0),new Position(550,tileSize))
  svg.appendChild(wall.toElement(svg));    
  row0.push(wall)

   // Setup Frog     
   const [frogElement,observer] = frog.toElement(svg)
   svg.appendChild(frogElement);

  fromEvent(document,'keydown').subscribe((e) => {
    switch((e as KeyboardEvent).code){
      case "ArrowUp":        
        if(frog.curPosition.y > 0){
          let newPos = new Position(frog.curPosition.x,frog.curPosition.y);
          newPos.y -= tileSize;

          let [isSafe,hasCollision,updatePos] = checkFrogMovementCollision(frog,newPos,objectList)
          if(isSafe){
            if(!hasCollision){              
              const row = newPos.y / 50
              isSafe = checkTerrainWalkable(mapType[row])
              if(!isSafe){
                game.respawn();
                return;
              }               
            }
            if(updatePos){
              observer.next(newPos);                       
            }            
          }          
          else{
            game.respawn();
          }          
        }   
        break;
      case "ArrowDown":        
        if(frog.curPosition.y < mapSize - tileSize){
          let newPos = new Position(frog.curPosition.x,frog.curPosition.y);
          newPos.y += tileSize;
          let [isSafe,hasCollision,updatePos] = checkFrogMovementCollision(frog,newPos,objectList)
          if(isSafe){
            if(!hasCollision){
              const row = newPos.y / 50
              isSafe = checkTerrainWalkable(mapType[row])
              if(!isSafe){
                game.respawn();
                return;
              }               
            }
            if(updatePos){
              observer.next(newPos);                       
            }            
          }          
          else{
            game.respawn();
          }            
        }        
        break;
      case "ArrowLeft":
        if(frog.curPosition.x > 0){
          let newPos = frog.curPosition;
          newPos.x -= tileSize;
          const [isSafe,hasCollision,updatePos] = checkFrogMovementCollision(frog,newPos,objectList)
          if(isSafe && updatePos){            
            observer.next(newPos)          
          }          
          else{
            game.respawn();
          }    
        }        
        break;
      case "ArrowRight":
        if(frog.curPosition.x < mapSize - tileSize){
          let newPos = frog.curPosition;
          newPos.x += tileSize;
          const [isSafe,hasCollision,updatePos] = checkFrogMovementCollision(frog,newPos,objectList)
          if(isSafe && updatePos){
            observer.next(newPos)          
          }          
          else{
            game.respawn(); 
          }    
        }                    
        break;
    }
  })
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  const observable = new Observable(() => {

  })

  observable.subscribe({
    next:() => {
      
    }
  })
  window.onload = () => {
    // main();
  };

  const onClick = () => {
    main();
    document.getElementById("mainMenu")!!.style.display = "none"
    document.getElementById("btnPlay")?.removeEventListener("click",onClick);
  }
  const listener = document.getElementById("btnPlay")?.addEventListener("click",onClick)
}




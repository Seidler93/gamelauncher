import { useState } from 'react'
import './gameCard.css'
import { launchGame } from './utils/launchers'
import { useAppContext } from '../context/AppContext'

export default function GameCard({ game }) {
  const { emulators } = useAppContext();
  const [currentCover, setCurrentCover] = useState(0);
  
  const findEmuPath = () => {
    const emu = emulators.find(e => e.platform === game.platform);    
    return emu.path;
  }  

  const cycleCover = () => {
    const covers = game.coverOptions || [];
    if (covers.length === 0) return;
    setCurrentCover(prev => (prev + 1) % covers.length);
  };

  
  return (
    <div key={game.id} className='game-card' onClick={cycleCover} onDoubleClick={() => launchGame(findEmuPath(), game)}>
      {/* {game.coverOptions?.length > 0 ? (
        <img src={game.coverOptions[currentCover].imageUrl} alt={game.title || game.name} />
      ) : (
        <img
          src={game.coverUrl || game.coverOptions?.[currentCover]?.imageUrl || "/ps2-game-cover-default.png"}
          alt={game.title || game.name}
        />
      )} */}
      <img
        src={game.coverUrl || game.coverOptions?.[currentCover]?.imageUrl || "/ps2-game-cover-default.png"}
        alt={game.title || game.name}
      />
    </div>

  )
}
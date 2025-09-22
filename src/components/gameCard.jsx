import { useState } from 'react'
import './gameCard.css'
import { launchGame } from './utils/launchers'
import { useAppContext } from '../context/AppContext'
import { uploadSaveState } from './utils/firebaseHelpers'

export default function GameCard({ game, handleGameClick }) {
  const { emulators } = useAppContext();
  const [currentCover, setCurrentCover] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const findEmuPath = () => {
    const emu = emulators.find(e => e.platform === game.platform);
    return emu?.path;
  };

  return (
    <div
      key={game.id}
      className='game-card'
      onClick={() => handleGameClick(game)}
      onDoubleClick={() => launchGame(findEmuPath(), game)}
    >
      <img
        src={game.coverUrl || game.coverOptions?.[currentCover]?.imageUrl || "/ps2-game-cover-default.png"}
        alt={game.title || game.name}
      />
    </div>
  )
}
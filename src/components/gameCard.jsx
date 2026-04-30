import { useState } from 'react'
import './gameCard.css'
import { launchGame } from './utils/launchers'
import { useAppContext } from '../context/AppContext'

export default function GameCard({ game, handleGameClick }) {
  const { emulators } = useAppContext();
  const [currentCover, setCurrentCover] = useState(0);
  const coverSrc = game.coverUrl || game.coverOptions?.[currentCover]?.imageUrl || "/ps2-game-cover-default.png";

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
        className="ps2-cover-header"
        src="/ps2-game-cover-default-cropped.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="game-cover"
        src={coverSrc}
        alt={game.title || game.name}
      />
    </div>
  )
}

import { useState } from 'react'
import './gameCard.css'
import { launchGame } from './utils/launchers'
import { useAppContext } from '../context/AppContext'

export default function GameCard({ game }) {
  const { emulators } = useAppContext();

  const findEmuPath = () => {
    const emu = emulators.find(e => e.platform === game.platform);    
    return emu.path;
  }  
  
  return (
    <div key={game.id} className='game-card' onClick={() => launchGame(findEmuPath(), game)}>
      {game.coverUrl ? <img src={game.coverUrl} alt={game.name} /> : <img src="/ps2-game-cover-default.png" alt="" />}
      {/* <h2>{game.title}</h2> */}
    </div>
  )
}
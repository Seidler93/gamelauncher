import { useState } from 'react'
import './gameCard.css'
import { launchPCSX2 } from './utils/launchers'
import { useAppContext } from '../context/AppContext'

export default function GameCard({ game }) {
  const { games, setGames, emulators } = useAppContext();

  const launchGame = () => {
    launchPCSX2(game.emulatorPath, game.romPath);
  }
  
  return (
    <div key={game.id} className='game-card' onClick={() => launchGame()}>
      <img src="/ps2-game-cover-default.png" alt="" />
      {/* <h2>{game.title}</h2> */}
    </div>
  )
}
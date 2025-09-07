import { useState } from 'react'
import './gameCard.css'

export default function GameCard({ game }) {

  return (
    <div key={game.id} className='game-card'>
      <img src="/ps2-game-cover-default.png" alt="" />
      {/* <h2>{game.title}</h2> */}
    </div>
  )
}
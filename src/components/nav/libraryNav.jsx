import { useState } from 'react'
import './LibraryNav.css'

export default function LibraryNav({ currentlyDisplayed, platformOptions, setCurrentlyDisplayed }) {

  return (
    <nav>
      <span>Currently showing: {currentlyDisplayed}</span>
      <ul>
        {platformOptions.map((p) => (
          <li key={p} onClick={() => setCurrentlyDisplayed(p)}>{p}</li>
        ))}
      </ul>
    </nav>
  )
}
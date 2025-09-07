import { useState } from 'react'
import './LibraryNav.css'

export default function LibraryNav({ currentlyDisplayed, platformOptions, setCurrentlyDisplayed }) {

  return (
    <nav>
      <span>Logo</span>
      <div className="pills">
        {platformOptions.map((p) => (
          <button
            key={p}
            className={p === currentlyDisplayed ? "active" : ""}
            onClick={() => setCurrentlyDisplayed(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <button>Settings button</button>
    </nav>
  )
}
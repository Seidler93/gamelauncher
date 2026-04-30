return (
    <aside className="game-details-aside">
      <button className="close-button" onClick={onClose}>✕</button>
      <div className='inner'>
        {/* Cover */}
        <div className="cover-section">
          <img
            src={game.coverUrl || '/ps2-game-cover-default.png'}
            alt={game.title}
            className="cover-image"
          />
        </div>

        {/* Title */}
        <h2>{sanitizeGameTitle(game.title)}</h2>

          <button 
            className="upload-btn"
            onClick={handleUpload}
          >
            Upload Save State
          </button>

        {/* Summary */}
        {game.summary && (
          <p className="summary">{game.summary}</p>
        )}

        {/* Release Date */}
        {game.releaseDate && (
          <p><strong>Release:</strong> {formatDate(game.releaseDate)}</p>
        )}

        {/* Genres */}
        {game.genres?.length > 0 && (
          <p><strong>Genres:</strong> {game.genres.join(', ')}</p>
        )}

        {/* Screenshots */}
        {game.screenshots?.length > 0 && (
          <div className="screenshots">
            <h4>Screenshots</h4>
            <div className="screenshot-list">
              {game.screenshots.map((url, i) => (
                <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="screenshot" />
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {game.videos?.length > 0 && (
          <div className="videos">
            <h4>Videos</h4>
            {game.videos.map((vid, i) => (
              <iframe
                key={i}
                src={`https://www.youtube.com/embed/${vid}`}
                title={`Video ${i + 1}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
import "./Ps3WaveBackground.css";

export default function Ps3WaveBackground() {
  return (
    <div className="ps3-wave-background" aria-hidden="true">
      <video className="ps3-wave-video" src="/ps3-wave-background.mp4" autoPlay muted loop playsInline />
    </div>
  );
}

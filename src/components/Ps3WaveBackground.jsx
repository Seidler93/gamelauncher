import "./Ps3WaveBackground.css";
import ps3WaveVideo from "../../xmb-on-web-main/images/vid.mp4";

export default function Ps3WaveBackground() {
  return (
    <div className="ps3-wave-background" aria-hidden="true">
      <video className="ps3-wave-video" src={ps3WaveVideo} autoPlay muted loop playsInline />
    </div>
  );
}

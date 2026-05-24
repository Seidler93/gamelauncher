import "./Ps2CubeBackground.css";

const hiddenBoxes = new Set([40, 41, 46, 47, 48, 94, 95, 101, 102]);

function getBoxDepth(index) {
  const value = Math.sin(index * 19.73) * 10000;
  return Math.round((value - Math.floor(value)) * 20 - 20);
}

function getBoxLightness(index) {
  const value = Math.sin(index * 8.61) * 10000;
  return Math.round(34 + (value - Math.floor(value)) * 38);
}

export default function Ps2CubeBackground() {
  return (
    <div className="ps2-cube-background" aria-hidden="true">
      <div className="ps2-screen">
        <div className="ps2-inner">
          <div className="ps2-inner-bg" />
          <div className="ps2-particles">
            <span />
            <span />
            <span />
          </div>
          {Array.from({ length: 112 }, (_, index) => {
            const boxNumber = index + 1;

            return (
              <div
                className={`ps2-box-container ${hiddenBoxes.has(boxNumber) ? "hidden" : ""}`}
                key={boxNumber}
                style={{
                  "--box-depth": `${getBoxDepth(boxNumber)}vw`,
                  "--box-lightness": `${getBoxLightness(boxNumber)}%`,
                }}
              >
                <div className="ps2-box">
                  <div className="top" />
                  <div className="bottom" />
                  <div className="left" />
                  <div className="right" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
